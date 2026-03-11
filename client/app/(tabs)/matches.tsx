import React, { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet, FlatList, Pressable } from "react-native";
import { Background } from "@react-navigation/elements";
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
};

const BG = "#0B0B0F";
const PURPLE = "#7B61FF";

export default function MatchesScreen() {
  const [tracks, setTracks] = useState<Track[]>([]);

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

  const trackRender = ({ item }: { item: Track }) => (
    <Pressable>
      <Background style={styles.card}>
        <Image source={{ uri: item.image }} style={styles.trackImage} />
        <View style={styles.bottomFade}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>
            {item.artist}
            {item.album ? ` • ${item.album}` : ""}
          </Text>
        </View>
      </Background>
    </Pressable>
  );

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
    // justifyContent: "flex-end",
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
  playButton: {
    marginTop: 14,
    height: 56,
    borderRadius: 28,
    alignSelf: "center",
    paddingHorizontal: 22,
    justifyContent: "center",
    backgroundColor: PURPLE,
  },
  playText: { color: "white", fontSize: 22, fontWeight: "900" },
});
