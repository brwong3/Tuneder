import pandas as pd
import numpy as np
import faiss
import pickle
from sklearn.preprocessing import MinMaxScaler

CSV_PATH = "dataset.csv"
INDEX_FILENAME = "tuneder.index"
IDS_FILENAME = "track_ids.npy"
SCALER_FILENAME = "scaler.pkl"

FEATURE_MAPPING = {
    "danceability": 0, "energy": 1, "key": 2, "loudness": 3, 
    "mode": 4, "speechiness": 5, "acousticness": 6, 
    "instrumentalness": 7, "liveness": 8, "valence": 9, 
    "tempo": 10, "time_signature": 11
}

def build_tuneder_index():
    csv = pd.read_csv(CSV_PATH, header=0).iloc[:, 1:]
    csv.drop_duplicates(subset=["track_id"], inplace=True)
    csv.reset_index(drop=True, inplace=True)

    # Save ONLY the track IDs as a numpy array
    np.save(IDS_FILENAME, csv["track_id"].values)

    raw_features = csv.iloc[:, 7:19].values.astype('float32')
    scaler = MinMaxScaler()
    normalized_features = scaler.fit_transform(raw_features)
    
    with open(SCALER_FILENAME, 'wb') as f:
        pickle.dump(scaler, f)

    dim = normalized_features.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(normalized_features)
    faiss.write_index(index, INDEX_FILENAME)

def search_weighted_knn(target_vector, weight_dict, k, index_obj, scaler_obj, ids_obj, is_raw_input=False):
    dim = index_obj.d
    n_total = index_obj.ntotal
    target_vector = np.array(target_vector).reshape(1, -1)

    if is_raw_input:
        target_vector = scaler_obj.transform(target_vector)

    all_vectors = faiss.rev_swig_ptr(index_obj.get_xb(), n_total * dim).reshape(n_total, dim)
    weights = np.ones(dim, dtype='float32')
    
    for feature_name, w in weight_dict.items():
        if feature_name in FEATURE_MAPPING:
            weights[FEATURE_MAPPING[feature_name]] = w

    weighted_db = all_vectors * weights
    weighted_target = (target_vector * weights).astype('float32')

    temp_index = faiss.IndexFlatL2(dim)
    temp_index.add(weighted_db)
    _, indices = temp_index.search(weighted_target, k)

    return ids_obj[indices[0]].tolist()

if __name__ == "__main__":
    build_tuneder_index()