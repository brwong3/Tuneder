import React, { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet, FlatList, Pressable } from "react-native";
import { useIsFocused } from '@react-navigation/native';
import { Background } from "@react-navigation/elements";
import { Audio } from "expo-av";
import { Ionicons } from '@expo/vector-icons';
import {
  getLikedSongs,
  addLikedSongsListener,
  removeLikedSongsListener,
} from '../../services/storage';
import { fetchRecommendationsFromLikes } from "../../services/storage";

// helper loader that returns list of tracks
const loadRecsForLikes = async (setTracks: React.Dispatch<React.SetStateAction<Track[]>>) => {
  const myLikes = await getLikedSongs();
  if (myLikes.length > 0) {
    const recommendations = await fetchRecommendationsFromLikes(myLikes);
    setTracks(recommendations || []);
  } else {
    setTracks([]);
  }
};

type Track = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  image: string; // matches backend field
  preview_url?: string;
};

const BG = "#0B0B0F";
const PURPLE = "#7B61FF";

export default function MatchesScreen() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [shouldResumeOnFocus, setShouldResumeOnFocus] = useState(false);
  const isFocused = useIsFocused();

  // load whenever the screen mounts or the liked-songs list changes
  useEffect(() => {
    loadRecsForLikes(setTracks);

    const listener = () => {
      loadRecsForLikes(setTracks);
    };

    addLikedSongsListener(listener);
    return () => {
      removeLikedSongsListener(listener);
    };
  }, []);

  // Pause playback when tab is unfocused, and resume if it was playing
  useEffect(() => {
    if (!sound) return;

    if (!isFocused) {
      sound.getStatusAsync().then((status) => {
        if (status.isLoaded && status.isPlaying) {
          setShouldResumeOnFocus(true);
          sound.pauseAsync().catch(() => {});
        }
      });
    } else if (shouldResumeOnFocus) {
      sound.getStatusAsync().then((status) => {
        if (status.isLoaded && !status.isPlaying) {
          sound.playAsync().catch(() => {});
        }
      });
      setShouldResumeOnFocus(false);
    }
  }, [isFocused, sound, shouldResumeOnFocus]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.stopAsync().catch(() => {});
        sound.unloadAsync().catch(() => {});
      }
    };
  }, [sound]);

  const playTrack = async (track: Track) => {
    if (!track.preview_url) return;

    // If it's the same track, toggle play/pause
    if (playingId === track.id && sound) {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await sound.pauseAsync();
          setPlayingId(null);
        } else {
          await sound.playAsync();
          setPlayingId(track.id);
        }
      }
      return;
    }

    // Stop previous sound if playing
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch {
        // ignore
      }
    }

    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.preview_url },
        { shouldPlay: true, isLooping: false }
      );
      setSound(newSound);
      setPlayingId(track.id);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;

        if (status.didJustFinish && !status.isLooping) {
          setPlayingId(null);
        }
      });
    } catch (error) {
      console.warn("Failed to play preview", error);
      setPlayingId(null);
    }
  };

  const trackRender = ({ item }: { item: Track }) => {
    const isPlaying = item.id === playingId;
    const showButton = hoveredId === item.id;

    return (
      <Pressable
        onHoverIn={() => setHoveredId(item.id)}
        onHoverOut={() => setHoveredId((prev) => (prev === item.id ? null : prev))}
        onPress={() => playTrack(item)}
      >
        <Background style={styles.card}>
          <Image source={{ uri: item.image }} style={styles.trackImage} />
          <View style={styles.bottomFade}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>
              {item.artist}
              {item.album ? ` • ${item.album}` : ""}
            </Text>
          </View>
          {showButton && (
            <View style={styles.playButton}>
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={20}
                color="white"
              />
            </View>
          )}
        </Background>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={tracks}
        keyExtractor={(item) => item.id}
        renderItem={trackRender}
        contentContainerStyle={{ padding: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      />
    </View>
  );
}

const IMAGE_SIZE = 80;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  card: {
    flex: 1,
    flexDirection: "row",
    overflow: "hidden",
  },
  trackImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 0,
    alignSelf: "flex-start",
  },
  bottomFade: {
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  title: { color: "white", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.85)", marginTop: 6, fontSize: 14, fontWeight: "600" },
  playText: { color: "white", fontSize: 22, fontWeight: "900" },
  playButton: {
    position: "absolute",
    right: 16,
    top: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
});
