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
    pip install -r requirements
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
    
    Open a new terminal window, and navigate to ```frontend``` folder

    ```text
    cd frontend
    npm install
    ```
3. Run the App

    ```text
    npx expo start
    ```