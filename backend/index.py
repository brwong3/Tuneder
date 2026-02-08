from collections.abc import Iterable
import pandas as pd
import numpy as np
import faiss
import os

CSV_PATH = "dataset.csv"
INDEX_FILENAME = "tuneder.index"
METADATA_FILENAME = "metadata.pkl"

_metadata_cache = None

def get_metadata_cache():
    global _metadata_cache
    if _metadata_cache is None:
        if not os.path.exists(METADATA_FILENAME):
            raise FileNotFoundError("Metadata file not found. Run build_tuneder_index() first.")
        _metadata_cache = pd.read_pickle(METADATA_FILENAME)
    return _metadata_cache

def build_tuneder_index():
    print(f"Reading Data from {CSV_PATH}")
    csv = pd.read_csv(CSV_PATH, header=0)
    csv.drop_duplicates(subset=["track_id"], inplace=True)
    csv.reset_index(drop=True, inplace=True)

    print(f"Creating metadata file at {METADATA_FILENAME}")
    metadata_cols_to_drop = csv.columns[7:19]
    metadata = csv.drop(columns=metadata_cols_to_drop)
    metadata.to_pickle(METADATA_FILENAME) 

    features = csv.iloc[:, 7:19].values.astype('float32')
    
    dim = features.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(features)
    
    faiss.write_index(index, INDEX_FILENAME)
    print(f"FAISS index saved to {INDEX_FILENAME} with {index.ntotal} tracks.")

def search_weighted_knn(target_features, weight_dict, k=10):
    index = faiss.read_index(INDEX_FILENAME)
    n_total = index.ntotal
    dim = index.d
    
    original_vectors = faiss.rev_swig_ptr(index.get_xb(), n_total * dim).reshape(n_total, dim)

    weights = np.ones(dim, dtype='float32')
    for idx, w in weight_dict.items():
        weights[idx] = w

    weighted_data = original_vectors * weights
    weighted_target = (np.array(target_features).astype('float32') * weights).reshape(1, -1)

    temp_index = faiss.IndexFlatL2(dim)
    temp_index.add(weighted_data)
    distances, indices = temp_index.search(weighted_target, k)

    metadata = get_metadata_cache()
    return metadata.iloc[indices[0]]

def get_random_recommendations(weight_dict, k=5):
    index = faiss.read_index(INDEX_FILENAME)
    n_total = index.ntotal
    dim = index.d
    
    all_vectors = faiss.rev_swig_ptr(index.get_xb(), n_total * dim).reshape(n_total, dim)
    random_idx = np.random.randint(0, n_total)
    random_target = all_vectors[random_idx]
    
    print(f"Starting search from random track index: {random_idx}")
    return search_weighted_knn(random_target, weight_dict, k)

def search_metadata_by_id(ids: list):
    cache = get_metadata_cache().copy()
    cache.set_index('track_id', inplace=True)
    return cache.loc[ids]

if __name__ == "__main__":
    build_tuneder_index()