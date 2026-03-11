import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from "../constants/api";

const LIKED_SONGS_KEY = '@liked_songs_ids';

// simple listener list for liked-song changes
const likedSongsListeners: Array<() => void> = [];

export const addLikedSongsListener = (listener: () => void) => {
  likedSongsListeners.push(listener);
};

export const removeLikedSongsListener = (listener: () => void) => {
  const idx = likedSongsListeners.indexOf(listener);
  if (idx !== -1) likedSongsListeners.splice(idx, 1);
};

/**
 * Persistently stores the list of liked track IDs.
 */
export const saveLikedSongs = async (ids: string[]): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(ids);
    console.log("Saving liked songs:", ids);
    await AsyncStorage.setItem(LIKED_SONGS_KEY, jsonValue);
    // notify listeners that liked list changed
    likedSongsListeners.forEach((cb) => cb());
  } catch (e) {
    console.error("Error saving liked songs", e);
  }
};

/**
 * Retrieves the list of liked track IDs from storage.
 */
export const getLikedSongs = async (): Promise<string[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(LIKED_SONGS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error("Error fetching liked songs", e);
    return [];
  }
};

export const fetchRecommendationsFromLikes = async (likedIds) => {
  try {
    // 1. Get the raw audio features for your liked songs
    // API expects a raw array of IDs (FastAPI declaration: List[str])
    const featureRes = await fetch(`${BASE_URL}/features_by_ids`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(likedIds)
    });

    if (!featureRes.ok) {
      console.error('features_by_ids failed', featureRes.status, await featureRes.text());
      return [];
    }

    const featureJson = await featureRes.json();
    console.log("/features_by_ids response:", featureJson);

    // make sure we have an array
    const features = Array.isArray(featureJson.features) ? featureJson.features : [];

    // print type of features and first few entries for debugging
    console.log("Fetched features for liked songs (sanitized):", typeof features, features.length);

    // 2. Average the vectors (Standard Linear Algebra approach)
    if (features.length === 0) return [];
    
    const averageVector = features[0].map((_, colIndex) => 
      features.reduce((sum, row) => sum + row[colIndex], 0) / features.length
    );

    // 3. Get recommendations based on that average "taste" vector
    const recRes = await fetch(`${BASE_URL}/context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feature_averages: averageVector,
        weights: {}, // You could allow the user to adjust these!
        k: 10
      })
    });

    const data = await recRes.json();
    return data.recommendations;

  } catch (error) {
    console.error("Failed to fetch recommendations", error);
  }
};