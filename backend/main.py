from fastapi import FastAPI
import numpy as np

app = FastAPI()

@app.get("/")
def home():
    return {"status": "ready"}

@app.get("/calc")
def do_math():
    # Example: Create a NumPy array and do a calculation
    arr = np.array([10, 20, 30])
    result = arr * 2
    
    return {
        "original": arr.tolist(),
        "multiplied": result.tolist()
    }