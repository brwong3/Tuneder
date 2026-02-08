from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Optional, List
import numpy as np
import faiss
from contextlib import asynccontextmanager

from index import search_weighted_knn, get_metadata_cache, INDEX_FILENAME

state = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Loading FAISS index into memory...")
    state["index"] = faiss.read_index(INDEX_FILENAME)
    get_metadata_cache()
    yield
    state.clear()

app = FastAPI(lifespan=lifespan)

class RandomQuery(BaseModel):
    k: int = 5
    weights: Dict[int, float] = {}

class ContextQuery(BaseModel):
    feature_averages: List[float] 
    weights: Dict[int, float] = {}
    k: int = 5

@app.get("/")
def home():
    return {"status": "ready"}

@app.post("/recommend/random")
def get_random_music(query: RandomQuery):
    """
    Pick a random existing song to find a new 'seed' coordinate.
    """
    try:
        index = state["index"]
        random_idx = np.random.randint(0, index.ntotal)
        
        all_vectors = faiss.rev_swig_ptr(index.get_xb(), index.ntotal * index.d).reshape(index.ntotal, index.d)
        seed_vector = all_vectors[random_idx]

        results = search_weighted_knn(seed_vector, query.weights, query.k)
        return results.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recommend/context")
def get_contextual_music(query: ContextQuery):
    """
    Find songs closest to the user's 'average' profile, 
    warped by their current weight preferences.
    """
    if len(query.feature_averages) != 12:
        raise HTTPException(status_code=400, detail="The average vector must have 12 feature values.")

    target_vector = np.array(query.feature_averages, dtype='float32')

    results = search_weighted_knn(target_vector, query.weights, query.k)
    return results.to_dict(orient="records")