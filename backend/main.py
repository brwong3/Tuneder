import os
import pickle
import numpy as np
import faiss
import httpx
from fastapi import FastAPI, Request
from contextlib import asynccontextmanager
from dotenv import load_dotenv

from index import build_tuneder_index 
from routers.recommend import router as api_router 
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

REQUIRED_FILES = ["tuneder.index", "track_ids.npy", "scaler.pkl"]

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Tuneder API is starting up...")
    
    app.state.client = httpx.AsyncClient(timeout=10.0)
    
    missing_files = [f for f in REQUIRED_FILES if not os.path.exists(f)]
    if missing_files:
        print(f"⚠️ Missing index files: {missing_files}. Building now...")
        build_tuneder_index()

    try:
        app.state.index = faiss.read_index("tuneder.index")
        app.state.ids = np.load("track_ids.npy", allow_pickle=True)
        with open("scaler.pkl", "rb") as f:
            app.state.scaler = pickle.load(f)
        print("✅ FAISS Index & Scaler Loaded.")
    except Exception as e:
        print(f"❌ Startup Failure: {e}")
        raise

    yield
    
    await app.state.client.aclose()
    print("🛑 Tuneder API shut down.")

app = FastAPI(title="Tuneder API", lifespan=lifespan)

@app.get("/")
async def health_check(request: Request):
    return {
        "status": "online",
        "tracks_indexed": request.app.state.index.ntotal if hasattr(request.app.state, 'index') else 0
    }

app.include_router(api_router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with specific IP/Domain
    allow_credentials=True,
    allow_methods=["*"], # This allows the OPTIONS, POST, GET, etc.
    allow_headers=["*"], # This allows the 'Content-Type' and 'Authorization' headers
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)