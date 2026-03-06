import os
import time
import asyncio
import base64
import httpx
import numpy as np
import re
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

class RandomQuery(BaseModel):
    k: int = 5
    weights: Dict[str, float] = {}

class ContextQuery(BaseModel):
    feature_averages: List[float] 
    weights: Dict[str, float] = {}
    k: int = 5

class Song(BaseModel):
    id: str
    image: str
    title: str
    genre: str
    album: str
    artist: str
    features: List[float]
    preview_url: Optional[str] = None 

class RecommendationResponse(BaseModel):
    recommendations: List[Song]

class TrackSnapshot(BaseModel):
    id: str
    title: str
    artist: str
    image: str
    preview_url: Optional[str] = None
    embed_url: str

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
    """
    Bypasses the official API to scrape the 30s preview mp3 directly 
    from Spotify's public embed widget.
    """
    try:
        url = f"https://open.spotify.com/embed/track/{track_id}"
        response = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
        
        if response.status_code != 200:
            return None
            
        match = re.search(r'(https://p\.scdn\.co/mp3-preview/[a-zA-Z0-9_-]+)', response.text)
        
        if match:
            return match.group(1)
            
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
    
    async def get_one(tid):
        tid = str(tid).strip()
        cached_song = _song_cache.get(tid)
        
        if not cached_song:
            try:
                res = await client.get(f"{SPOTIFY_API_BASE}/tracks/{tid}?market=US", headers=headers)
                if res.status_code != 200: return None
                t = res.json()
                
                genre = genres_map.get(tid, "Unknown")
                
                preview_url = t.get("preview_url")
                if not preview_url:
                    preview_url = await scrape_spotify_preview(tid, client)
                
                cached_song = Song(
                    id=t["id"],
                    image=t["album"]["images"][0]["url"] if t["album"]["images"] else "",
                    title=t["name"],
                    genre=genre,
                    album=t["album"]["name"],
                    artist=t["artists"][0]["name"],
                    features=[],
                    preview_url=preview_url
                )
                _song_cache[tid] = cached_song
            except Exception: 
                return None
        
        final_song = cached_song.copy()
        final_song.features = features_map.get(tid, [])
        final_song.genre = genres_map.get(tid, final_song.genre) 
        return final_song

    results = await asyncio.gather(*(get_one(tid) for tid in track_ids))
    return [r for r in results if r]


@router.post("/random", response_model=RecommendationResponse)
async def get_random(query: RandomQuery, request: Request):    
    index, ids, scaler = request.app.state.index, request.app.state.ids, request.app.state.scaler
    genres = request.app.state.genres 
    
    ridx = np.random.randint(0, index.ntotal)
    all_vectors = faiss.rev_swig_ptr(index.get_xb(), index.ntotal * index.d).reshape(index.ntotal, index.d)
    
    neighbor_ids = search_weighted_knn(
        target_vector=all_vectors[ridx],
        weight_dict=query.weights,
        k=query.k,
        index_obj=index,
        scaler_obj=scaler,
        ids_obj=ids,
        is_raw_input=False 
    )
    
    features_map = {}
    genres_map = {}
    id_to_idx = {str(sid): i for i, sid in enumerate(ids)}
    
    for nid in neighbor_ids:
        if nid in id_to_idx:
            vector_idx = id_to_idx[nid]
            features_map[nid] = all_vectors[vector_idx].tolist()
            genres_map[nid] = genres[vector_idx]
    
    songs = await fetch_songs_from_spotify(neighbor_ids, features_map, genres_map, request.app.state.client)

    songs = [song for song in songs if song.preview_url != None]

    return {"recommendations": songs}

@router.post("/context", response_model=Dict[str, List[Song]])
async def get_context(query: ContextQuery, request: Request):
    index = request.app.state.index
    ids = request.app.state.ids
    scaler = request.app.state.scaler
    client = request.app.state.client
    genres = request.app.state.genres

    neighbor_ids = search_weighted_knn(
        target_vector=query.feature_averages,
        weight_dict=query.weights,
        k=query.k,
        index_obj=index,
        scaler_obj=scaler,
        ids_obj=ids,
        is_raw_input=True   
    )

    all_vectors = faiss.rev_swig_ptr(index.get_xb(), index.ntotal * index.d).reshape(index.ntotal, index.d)
    
    features_map = {}
    genres_map = {}
    id_to_idx = {str(sid): i for i, sid in enumerate(ids)}
    
    for nid in neighbor_ids:
        if nid in id_to_idx:
            vector_idx = id_to_idx[nid]
            features_map[nid] = all_vectors[vector_idx].tolist()
            genres_map[nid] = genres[vector_idx]

    songs = await fetch_songs_from_spotify(neighbor_ids, features_map, genres_map, client)

    songs = [song for song in songs if song.preview_url != None]
    
    return {"recommendations": songs}


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