# Tuneder App

This project consists of a Python backend (FastAPI) for numerical processing and a mobile frontend (React Native/Expo).

## 📂 Project Structure

```text
/
├── backend/             # Python API & NumPy logic
│   ├── main.py
│   ├── requirements.txt
├── client/            # React Native Mobile App
│   ├── app/
│   ├── package.json
│   └── ...
└── README.md
```

# Index Setup

1. Install the Spotify Tracks [here](https://www.kaggle.com/datasets/maharshipandya/-spotify-tracks-dataset?resource=download) and unzip it into a csv file 

2. Wait until `index.py` is complete

# Backend Setup

1. Prerequisites
    - Python 3.8+ Installed

2. Initial Setup
Open your terminal and navigate to the ```backend``` folder

    ```text
    cd backend
    ```

3. Install Dependencies

    ```text
    pip install -r requirements.txt
    ```

4. Run the Server

    ```text
    python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
    ```


# Client Setup

1. Prerequisites
    - Node.js installed
    - Expo Go App installed on your physical Android or iOS device 

2. Install dependencies
    
    Open a new terminal window, and navigate to ```client``` folder

    ```text
    cd client
    npm install
    ```
3. Run the App

    ```text
    npx expo start
    ```


