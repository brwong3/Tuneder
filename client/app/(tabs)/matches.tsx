import React, { useMemo, useRef } from "react";
import { View, Text, ImageBackground, StyleSheet, Pressable, FlatList } from "react-native";
import Swiper from "react-native-deck-swiper";

type Track = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  imageUrl: string;
};

const BG = "#0B0B0F";
const PURPLE = "#7B61FF";

export default function MatchesScreen() {
  const tracks = useMemo<Track[]>(
    () => [
      { id: "1", title: "Blinding Lights", artist: "The Weeknd", album: "After Hours", imageUrl: "https://picsum.photos/900/1400?1", },
      { id: "2", title: "Bad Habits", artist: "Ed Sheeran", album: "=", imageUrl: "https://picsum.photos/900/1400?2", },
      { id: "3", title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", imageUrl: "https://picsum.photos/900/1400?3", },
      { id: "3", title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", imageUrl: "https://picsum.photos/900/1400?3", },
      { id: "3", title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", imageUrl: "https://picsum.photos/900/1400?3", },
      { id: "3", title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", imageUrl: "https://picsum.photos/900/1400?3", },
      { id: "3", title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", imageUrl: "https://picsum.photos/900/1400?3", },
      { id: "3", title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", imageUrl: "https://picsum.photos/900/1400?3", },
      { id: "3", title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", imageUrl: "https://picsum.photos/900/1400?3", },
      { id: "3", title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", imageUrl: "https://picsum.photos/900/1400?3", },
      { id: "3", title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", imageUrl: "https://picsum.photos/900/1400?3", },
      { id: "3", title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", imageUrl: "https://picsum.photos/900/1400?3", },
      { id: "3", title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", imageUrl: "https://picsum.photos/900/1400?3", },
    ],
    []
  );

  const trackRender = ({ item }: { item: Track }) => (
    <ImageBackground source={{ uri: item.imageUrl }} style={styles.card} imageStyle={styles.cardImage}>
      <View style={styles.bottomFade}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>
          {item.artist}
          {item.album ? ` • ${item.album}` : ""}
        </Text>
      </View>
    </ImageBackground>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  card: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  cardImage: { borderRadius: 18 },
  bottomFade: {
    padding: 16,
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
