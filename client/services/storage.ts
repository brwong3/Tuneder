import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from "../constants/api";

const LIKED_SONGS_KEY = '@liked_songs_ids';

const likedSongsListeners: Array<() => void> = [];

export const addLikedSongsListener = (listener: () => void) => {
  likedSongsListeners.push(listener);
};

export const removeLikedSongsListener = (listener: () => void) => {
  const idx = likedSongsListeners.indexOf(listener);
  if (idx !== -1) likedSongsListeners.splice(idx, 1);
};

export const saveLikedSongs = async (ids: string[]): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(ids);
    console.log("Saving liked songs:", ids);
    await AsyncStorage.setItem(LIKED_SONGS_KEY, jsonValue);
    likedSongsListeners.forEach((cb) => cb());
  } catch (e) {
    console.error("Error saving liked songs", e);
  }
};

export const getLikedSongs = async (): Promise<string[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(LIKED_SONGS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error("Error fetching liked songs", e);
    return [];
  }
};

export const fetchRecommendationsFromLikes = async (likedIds, discoveryPayload = null) => {
  try {
    if (!likedIds || likedIds.length === 0) return [];

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
    const features = Array.isArray(featureJson.features) ? featureJson.features : [];

    if (features.length === 0) return [];
    
    const averageVector = features[0].map((_, colIndex) => 
      features.reduce((sum, row) => sum + row[colIndex], 0) / features.length
    );

    const k = discoveryPayload?.limit || 10;
    const filters = discoveryPayload?.filters || undefined;

    const recRes = await fetch(`${BASE_URL}/context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feature_averages: averageVector,
        weights: {}, 
        k: k,
        filters: filters
      })
    });

    const data = await recRes.json();
    
    return data.recommendations || [];

  } catch (error) {
    console.error("Failed to fetch recommendations", error);
    return [];
  }
};