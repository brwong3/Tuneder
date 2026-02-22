import os
import time
import asyncio
import base64
import httpx
import numpy as np
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

class RecommendationResponse(BaseModel):
    seed_id: str = ""
    recommendations: List[Song]

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

async def fetch_songs_from_spotify(track_ids: List[str], client: httpx.AsyncClient) -> List[Song]:
    global _song_cache
    token = await get_spotify_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    
    async def get_one(tid):
        tid = str(tid).strip()
        if tid in _song_cache: return _song_cache[tid]
        
        res = await client.get(f"{SPOTIFY_API_BASE}/tracks/{tid}?market=US", headers=headers)
        if res.status_code != 200: return None
        
        t = res.json()
        a_res = await client.get(f"{SPOTIFY_API_BASE}/artists/{t['artists'][0]['id']}", headers=headers)
        genre = a_res.json().get("genres", ["Unknown"])[0] if a_res.status_code == 200 and a_res.json().get("genres") else "Unknown"
        
        song = Song(
            id=t["id"],
            image=t["album"]["images"][0]["url"] if t["album"]["images"] else "",
            title=t["name"],
            genre=genre,
            album=t["album"]["name"],
            artist=t["artists"][0]["name"]
        )
        _song_cache[tid] = song
        return song

    results = await asyncio.gather(*(get_one(tid) for tid in track_ids))
    return [r for r in results if r]


@router.post("/random", response_model=RecommendationResponse)
async def get_random(query: RandomQuery, request: Request):    
    index, ids, scaler = request.app.state.index, request.app.state.ids, request.app.state.scaler
    
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
    
    songs = await fetch_songs_from_spotify(neighbor_ids, request.app.state.client)
    return {"recommendations": songs}

@router.post("/context", response_model=Dict[str, List[Song]])
async def get_context(query: ContextQuery, request: Request):
    neighbor_ids = search_weighted_knn(
        target_vector=query.feature_averages,
        weight_dict=query.weights,
        k=query.k,
        index_obj=request.app.state.index,
        scaler_obj=request.app.state.scaler,
        ids_obj=request.app.state.ids,
        is_raw_input=True   
    )
    songs = await fetch_songs_from_spotify(neighbor_ids, request.app.state.client)
    return {"recommendations": songs}