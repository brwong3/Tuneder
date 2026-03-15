import os
import time
import asyncio
import base64
import httpx
import numpy as np
import re
import urllib.parse
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Dict, List, Optional
import faiss

from index import search_weighted_knn

router = APIRouter()

_token_cache = {"access_token": None, "expires_at": 0}
_song_cache: Dict[str, "Song"] = {}

SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_API_BASE = "https://api.spotify.com/v1"

class DiscoveryFilters(BaseModel):
    min_energy: float
    max_energy: float
    min_popularity: int
    max_popularity: int
    min_valence: float
    max_valence: float
    instrumentalness: Optional[float] = None
    explicit: Optional[bool] = None

class RandomQuery(BaseModel):
    k: int = 10
    weights: Dict[str, float] = {}
    filters: Optional[DiscoveryFilters] = None

class ContextQuery(BaseModel):
    feature_averages: List[float] 
    weights: Dict[str, float] = {}
    k: int = 10
    filters: Optional[DiscoveryFilters] = None

class Song(BaseModel):
    id: str
    image: str
    title: str
    genre: str
    album: str
    artist: str
    features: List[float]
    preview_url: Optional[str] = None 
    explicit: bool = False
    popularity: int = 0

class RecommendationResponse(BaseModel):
    recommendations: List[Song]

class TrackSnapshot(BaseModel):
    id: str
    title: str
    artist: str
    image: str
    preview_url: Optional[str] = None
    embed_url: str

def normalize_title(title: str) -> str:
    """Strips remaster and radio edit tags to prevent duplicate songs."""
    t = re.sub(r'\(.*?\)', '', title)
    t = re.sub(r'\[.*?\]', '', t)
    t = t.split('-')[0]
    return t.lower().strip()

async def get_spotify_token(client: httpx.AsyncClient) -> str:
    global _token_cache
    if _token_cache["access_token"] and time.time() < _token_cache["expires_at"] - 60:
        return _token_cache["access_token"]

    cid = os.getenv("CLIENT_ID").strip('\"')
    csec = os.getenv("CLIENT_SECRET").strip('\"')
    auth_b64 = base64.b64encode(f"{cid}:{csec}".encode()).decode()
    
    res = await client.post(
        SPOTIFY_TOKEN_URL, 
        data={"grant_type": "client_credentials"}, 
        headers={"Authorization": f"Basic {auth_b64}"}
    )
    
    if res.status_code != 200:
        raise HTTPException(status_code=500, detail="Spotify Token Error")
            
    data = res.json()
    _token_cache.update({"access_token": data["access_token"], "expires_at": time.time() + data["expires_in"]})
    return data["access_token"]

async def scrape_spotify_preview(track_id: str, client: httpx.AsyncClient) -> Optional[str]:
    """Bypasses the official API to scrape the 30s preview mp3 directly."""
    try:
        url = f"https://open.spotify.com/embed/track/{track_id}"
        response = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
        
        if response.status_code != 200:
            return None
            
        match = re.search(r'(https://p\.scdn\.co/mp3-preview/[a-zA-Z0-9_-]+)', response.text)
        if match:
            return match.group(1)
            
        match_encoded = re.search(r'(https%3A%2F%2Fp\.scdn\.co%2Fmp3-preview%2F[a-zA-Z0-9_-]+)', response.text)
        if match_encoded:
            return urllib.parse.unquote(match_encoded.group(1))
            
        return None
    except Exception as e:
        print(f"Scraper error for {track_id}: {e}")
        return None

async def fetch_songs_from_spotify(
    track_ids: List[str], 
    features_map: Dict[str, List[float]],
    genres_map: Dict[str, str],
    client: httpx.AsyncClient
) -> List[Song]:
    global _song_cache
    token = await get_spotify_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    
    uncached_ids = [str(tid).strip() for tid in track_ids if str(tid).strip() not in _song_cache]
            
    chunk_size = 50
    for i in range(0, len(uncached_ids), chunk_size):
        chunk = uncached_ids[i:i + chunk_size]
        ids_string = ",".join(chunk)
        
        res = await client.get(f"{SPOTIFY_API_BASE}/tracks?ids={ids_string}&market=US", headers=headers)
        if res.status_code != 200:
            print(f"Batch fetch FAILED | Status: {res.status_code}")
            continue
            
        data = res.json()
        tracks_data = [t for t in data.get("tracks", []) if t is not None]
        
        async def process_track(track):
            tid = track["id"]
            genre = genres_map.get(tid, "Unknown")
            
            preview_url = track.get("preview_url")
            if not preview_url:
                preview_url = await scrape_spotify_preview(tid, client)
                
            return Song(
                id=tid,
                image=track["album"]["images"][0]["url"] if track["album"]["images"] else "",
                title=track["name"],
                genre=genre,
                album=track["album"]["name"],
                artist=track["artists"][0]["name"],
                features=[],
                preview_url=preview_url,
                explicit=track.get("explicit", False),
                popularity=track.get("popularity", 0)
            )
            
        processed_songs = await asyncio.gather(*(process_track(t) for t in tracks_data))
        for song in processed_songs:
            _song_cache[song.id] = song

    final_songs = []
    for tid in track_ids:
        clean_id = str(tid).strip()
        if clean_id in _song_cache:
            final_song = _song_cache[clean_id].copy()
            final_song.features = features_map.get(clean_id, [])
            final_song.genre = genres_map.get(clean_id, final_song.genre)
            final_songs.append(final_song)
            
    return final_songs


@router.post("/random", response_model=RecommendationResponse)
async def get_random(query: RandomQuery, request: Request):    
    index, ids, scaler = request.app.state.index, request.app.state.ids, request.app.state.scaler
    genres = request.app.state.genres 
    
    ridx = np.random.randint(0, index.ntotal)
    all_vectors = faiss.rev_swig_ptr(index.get_xb(), index.ntotal * index.d).reshape(index.ntotal, index.d)
    
    fetch_k = query.k * 50 
    
    neighbor_ids = search_weighted_knn(
        target_vector=all_vectors[ridx],
        weight_dict=query.weights,
        k=fetch_k,
        index_obj=index,
        scaler_obj=scaler,
        ids_obj=ids,
        is_raw_input=False 
    )
    
    id_to_idx = {str(sid): i for i, sid in enumerate(ids)}
    valid_neighbor_ids = [nid for nid in neighbor_ids if nid in id_to_idx]
    
    if not valid_neighbor_ids:
        return {"recommendations": []}
        
    neighbor_vectors = [all_vectors[id_to_idx[nid]] for nid in valid_neighbor_ids]
    raw_features_matrix = scaler.inverse_transform(neighbor_vectors)
    
    pre_filtered_ids = []
    features_map = {}
    genres_map = {}
    
    for i, nid in enumerate(valid_neighbor_ids):
        raw_features = raw_features_matrix[i]
        genre = genres[id_to_idx[nid]]
        
        if query.filters:
            f = query.filters
            
            popularity = raw_features[0]
            energy = raw_features[2]
            instrumentalness = raw_features[8]
            valence = raw_features[10]
            
            if popularity < f.min_popularity or popularity > f.max_popularity:
                continue
            if energy < f.min_energy or energy > f.max_energy:
                continue
            if valence < f.min_valence or valence > f.max_valence:
                continue
            if f.instrumentalness is not None and instrumentalness < f.instrumentalness:
                continue
        
        pre_filtered_ids.append(nid)
        features_map[nid] = neighbor_vectors[i].tolist()
        genres_map[nid] = genre
        
    valid_songs = []
    seen_fingerprints = set()
    chunk_size = query.k if query.k > 0 else 10
    
    for i in range(0, len(pre_filtered_ids), chunk_size):
        chunk_ids = pre_filtered_ids[i:i + chunk_size]
        
        candidates = await fetch_songs_from_spotify(chunk_ids, features_map, genres_map, request.app.state.client)
        
        for song in candidates:
            if song.preview_url is None:
                continue
                
            if query.filters and query.filters.explicit is False and song.explicit:
                continue 
                
            norm_title = normalize_title(song.title)
            artist = song.artist.lower().strip()
            fingerprint = f"{norm_title}::{artist}"
            
            if fingerprint not in seen_fingerprints:
                seen_fingerprints.add(fingerprint)
                valid_songs.append(song)
                
            if len(valid_songs) == query.k:
                break
                
        if len(valid_songs) == query.k:
            break

    return {"recommendations": valid_songs}


@router.post("/context", response_model=Dict[str, List[Song]])
async def get_context(query: ContextQuery, request: Request):
    index = request.app.state.index
    ids = request.app.state.ids
    scaler = request.app.state.scaler
    client = request.app.state.client
    genres = request.app.state.genres

    fetch_k = query.k * 50

    neighbor_ids = search_weighted_knn(
        target_vector=query.feature_averages,
        weight_dict=query.weights,
        k=fetch_k,
        index_obj=index,
        scaler_obj=scaler,
        ids_obj=ids,
        is_raw_input=True   
    )

    all_vectors = faiss.rev_swig_ptr(index.get_xb(), index.ntotal * index.d).reshape(index.ntotal, index.d)
    
    id_to_idx = {str(sid): i for i, sid in enumerate(ids)}
    valid_neighbor_ids = [nid for nid in neighbor_ids if nid in id_to_idx]
    
    if not valid_neighbor_ids:
        return {"recommendations": []}
        
    neighbor_vectors = [all_vectors[id_to_idx[nid]] for nid in valid_neighbor_ids]
    raw_features_matrix = scaler.inverse_transform(neighbor_vectors)
    
    pre_filtered_ids = []
    features_map = {}
    genres_map = {}
    
    for i, nid in enumerate(valid_neighbor_ids):
        raw_features = raw_features_matrix[i]
        genre = genres[id_to_idx[nid]]
        
        if query.filters:
            f = query.filters
            popularity = raw_features[0]
            energy = raw_features[2]
            instrumentalness = raw_features[8]
            valence = raw_features[10]
            
            if popularity < f.min_popularity or popularity > f.max_popularity:
                continue
            if energy < f.min_energy or energy > f.max_energy:
                continue
            if valence < f.min_valence or valence > f.max_valence:
                continue
            if f.instrumentalness is not None and instrumentalness < f.instrumentalness:
                continue
        
        pre_filtered_ids.append(nid)
        features_map[nid] = neighbor_vectors[i].tolist()
        genres_map[nid] = genre

    valid_songs = []
    seen_fingerprints = set()
    chunk_size = query.k if query.k > 0 else 10
    
    for i in range(0, len(pre_filtered_ids), chunk_size):
        chunk_ids = pre_filtered_ids[i:i + chunk_size]
        candidates = await fetch_songs_from_spotify(chunk_ids, features_map, genres_map, client)
        
        for song in candidates:
            if song.preview_url is None:
                continue
                
            if query.filters and query.filters.explicit is False and song.explicit:
                continue 
                
            norm_title = normalize_title(song.title)
            artist = song.artist.lower().strip()
            fingerprint = f"{norm_title}::{artist}"
            
            if fingerprint not in seen_fingerprints:
                seen_fingerprints.add(fingerprint)
                valid_songs.append(song)
                
            if len(valid_songs) == query.k:
                break
                
        if len(valid_songs) == query.k:
            break
            
    return {"recommendations": valid_songs}


@router.post("/features_by_ids")
async def get_features(track_ids: List[str], request: Request):
    ids_obj = request.app.state.ids
    index = request.app.state.index
    
    # Map the string IDs to their integer indices in the FAISS index
    id_to_idx = {str(sid): i for i, sid in enumerate(ids_obj)}
    
    selected_features = []
    all_vectors = faiss.rev_swig_ptr(index.get_xb(), index.ntotal * index.d).reshape(index.ntotal, index.d) #

    for tid in track_ids:
        if tid in id_to_idx:
            idx = id_to_idx[tid]
            selected_features.append(all_vectors[idx].tolist())
            
    return {"features": selected_features}


@router.get("/snapshot/{track_id}", response_model=TrackSnapshot)
async def get_track_snapshot(track_id: str, request: Request):
    """
    Fetches an optimized, lightweight snapshot of a track specifically for frontend playback.
    """
    client = request.app.state.client
    token = await get_spotify_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    
    clean_id = str(track_id).strip()
    
    res = await client.get(f"{SPOTIFY_API_BASE}/tracks/{clean_id}?market=US", headers=headers)
    
    if res.status_code != 200:
        raise HTTPException(status_code=404, detail="Track not found on Spotify")
        
    t = res.json()
    
    image_url = ""
    if t.get("album") and t["album"].get("images"):
        image_url = t["album"]["images"][0]["url"]
        
    preview_url = t.get("preview_url")
    if not preview_url:
        preview_url = await scrape_spotify_preview(clean_id, client)
        
    return TrackSnapshot(
        id=t["id"],
        title=t["name"],
        artist=t["artists"][0]["name"],
        image=image_url,
        preview_url=preview_url,
        embed_url=f"https://open.spotify.com/embed/track/{t['id']}?utm_source=generator"
    )