import pandas as pd
import numpy as np
import faiss
import os
import pickle
from sklearn.preprocessing import MinMaxScaler

CSV_PATH = "dataset.csv"
INDEX_FILENAME = "tuneder.index"
METADATA_FILENAME = "metadata.pkl"
SCALER_FILENAME = "scaler.pkl"

FEATURE_MAPPING = {
    "danceability": 0,
    "energy": 1,
    "key": 2,
    "loudness": 3,
    "mode": 4,
    "speechiness": 5,
    "acousticness": 6,
    "instrumentalness": 7,
    "liveness": 8,
    "valence": 9,
    "tempo": 10,
    "time_signature": 11
}

def build_tuneder_index():
    csv = pd.read_csv(CSV_PATH, header=0).iloc[:, 1:]
    
    csv.drop_duplicates(subset=["track_id"], inplace=True)
    csv.reset_index(drop=True, inplace=True)

    metadata_cols_to_drop = csv.columns[7:19]
    metadata = csv.drop(columns=metadata_cols_to_drop)
    metadata.to_pickle(METADATA_FILENAME) 

    raw_features = csv.iloc[:, 7:19].values.astype('float32')
    
    scaler = MinMaxScaler()
    normalized_features = scaler.fit_transform(raw_features)
    
    with open(SCALER_FILENAME, 'wb') as f:
        pickle.dump(scaler, f)

    dim = normalized_features.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(normalized_features)
    
    faiss.write_index(index, INDEX_FILENAME)

def search_weighted_knn(target_vector, weight_dict, k, index_obj, scaler_obj, metadata_obj, is_raw_input=False):
    dim = index_obj.d
    n_total = index_obj.ntotal

    target_vector = np.array(target_vector).reshape(1, -1)

    if is_raw_input:
        target_vector = scaler_obj.transform(target_vector)

    all_vectors = faiss.rev_swig_ptr(index_obj.get_xb(), n_total * dim).reshape(n_total, dim)

    weights = np.ones(dim, dtype='float32')
    
    for feature_name, w in weight_dict.items():
        if feature_name in FEATURE_MAPPING:
            idx = FEATURE_MAPPING[feature_name]
            weights[idx] = w

    weighted_db = all_vectors * weights
    weighted_target = (target_vector * weights).astype('float32')

    temp_index = faiss.IndexFlatL2(dim)
    temp_index.add(weighted_db)
    distances, indices = temp_index.search(weighted_target, k)

    return metadata_obj.iloc[indices[0]].to_dict(orient="records")

if __name__ == "__main__":
    build_tuneder_index()