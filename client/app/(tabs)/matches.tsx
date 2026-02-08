import React, { useMemo } from "react";
import { View, Text, ImageBackground, StyleSheet, FlatList } from "react-native";

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
      { id: "4", title: "Save Your Tears", artist: "The Weeknd", album: "After Hours", imageUrl: "https://picsum.photos/900/1400?4", },
      { id: "6", title: "Good 4 U", artist: "Olivia Rodrigo", album: "SOUR", imageUrl: "https://picsum.photos/900/1400?6", },
      { id: "8", title: "Peaches (feat. Daniel Caesar, Giveon)", artist: "Justin Bieber", album: "", imageUrl: "https://picsum.photos/900/1400?8", },
      { id: "9", title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", imageUrl: "https://picsum.photos/900/1400?3", },
      { id: "10", title: "Heat Waves", artist: "Glass Animals", album: "Dreamland", imageUrl: "https://picsum.photos/900/1400?10", },
      { id: "11", title: "As It Was", artist: "Harry Styles", album: "Harry's House", imageUrl: "https://picsum.photos/900/1400?11", },
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
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  cardImage: { borderRadius: 0 },
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
