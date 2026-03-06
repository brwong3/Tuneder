import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from "../constants/api";

const LIKED_SONGS_KEY = '@liked_songs_ids';

/**
 * Persistently stores the list of liked track IDs.
 */
export const saveLikedSongs = async (ids: string[]): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(ids);
    console.log("Saving liked songs:", ids);
    await AsyncStorage.setItem(LIKED_SONGS_KEY, jsonValue);
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
    const featureRes = await fetch(`${BASE_URL}/features_by_ids`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track_ids: likedIds })
    });
    const { features } = await featureRes.json();

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