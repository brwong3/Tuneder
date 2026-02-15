import React, { useMemo } from "react";
import { View, Text, Image, StyleSheet, FlatList, Pressable } from "react-native";
import { Background } from "@react-navigation/elements";

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
      { id: "1", title: "Blinding Lights", artist: "The Weeknd", album: "After Hours", imageUrl: "https://upload.wikimedia.org/wikipedia/en/e/e6/The_Weeknd_-_Blinding_Lights.png", },
      { id: "2", title: "Bad Habits", artist: "Ed Sheeran", album: "=", imageUrl: "https://upload.wikimedia.org/wikipedia/en/c/cd/Ed_Sheeran_-_Equals.png", },
      { id: "3", title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", imageUrl: "https://upload.wikimedia.org/wikipedia/en/f/f5/Dua_Lipa_-_Future_Nostalgia_%28Official_Album_Cover%29.png", },
      { id: "4", title: "Save Your Tears", artist: "The Weeknd", album: "After Hours", imageUrl: "https://upload.wikimedia.org/wikipedia/en/c/c1/The_Weeknd_-_After_Hours.png", },
      { id: "5", title: "Good 4 U", artist: "Olivia Rodrigo", album: "SOUR", imageUrl: "https://upload.wikimedia.org/wikipedia/en/b/b2/Olivia_Rodrigo_-_SOUR.png", },
      { id: "6", title: "Peaches (feat. Daniel Caesar, Giveon)", artist: "Justin Bieber", album: "Justice", imageUrl: "https://upload.wikimedia.org/wikipedia/en/0/08/Justin_Bieber_-_Justice.png", },
      { id: "7", title: "Heat Waves", artist: "Glass Animals", album: "Dreamland", imageUrl: "https://upload.wikimedia.org/wikipedia/en/1/11/Dreamland_%28Glass_Animals%29.png", },
      { id: "8", title: "As It Was", artist: "Harry Styles", album: "Harry's House", imageUrl: "https://upload.wikimedia.org/wikipedia/en/d/d5/Harry_Styles_-_Harry%27s_House.png", },
    ],
    []
  );

  const trackRender = ({ item }: { item: Track }) => (
    <Pressable>
      <Background style={styles.card}>
        <Image source={{ uri: item.imageUrl }} style={styles.trackImage} />
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
