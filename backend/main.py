from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, List
import numpy as np
import faiss
import pandas as pd
import pickle
import os
from contextlib import asynccontextmanager

from index import (
    build_tuneder_index, 
    search_weighted_knn, 
    INDEX_FILENAME, 
    METADATA_FILENAME, 
    SCALER_FILENAME
)

state = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    files_exist = (
        os.path.exists(INDEX_FILENAME) and 
        os.path.exists(METADATA_FILENAME) and 
        os.path.exists(SCALER_FILENAME)
    )

    if not files_exist:
        build_tuneder_index()

    state["index"] = faiss.read_index(INDEX_FILENAME)
    state["metadata"] = pd.read_pickle(METADATA_FILENAME)

    with open(SCALER_FILENAME, 'rb') as f:
        state["scaler"] = pickle.load(f)
        
    yield
    state.clear()

app = FastAPI(lifespan=lifespan)

class RandomQuery(BaseModel):
    k: int = 5
    weights: Dict[str, float] = {} 

class ContextQuery(BaseModel):
    feature_averages: List[float] 
    weights: Dict[str, float] = {}
    k: int = 5

@app.get("/")
def home():
    if state["index"] is None:
        return {"status": "error"}
    return {"status": "ready", "tracks_loaded": state["index"].ntotal}

@app.post("/recommend/random")
def get_random_music(query: RandomQuery):
    index = state["index"]
    
    random_idx = np.random.randint(0, index.ntotal)
    
    all_vectors = faiss.rev_swig_ptr(index.get_xb(), index.ntotal * index.d).reshape(index.ntotal, index.d)
    seed_vector = all_vectors[random_idx]

    results = search_weighted_knn(
        target_vector=seed_vector,
        weight_dict=query.weights,
        k=query.k,
        index_obj=state["index"],
        scaler_obj=state["scaler"],
        metadata_obj=state["metadata"],
        is_raw_input=False 
    )
    return results

@app.post("/recommend/context")
def get_contextual_music(query: ContextQuery):
    if len(query.feature_averages) != 12:
        raise HTTPException(status_code=400, detail="Vector length mismatch")

    results = search_weighted_knn(
        target_vector=query.feature_averages,
        weight_dict=query.weights,
        k=query.k,
        index_obj=state["index"],
        scaler_obj=state["scaler"],
        metadata_obj=state["metadata"],
        is_raw_input=True   
    )
    return results