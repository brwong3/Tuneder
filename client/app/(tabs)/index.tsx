import React, { useMemo, useRef } from "react";
import { View, Text, ImageBackground, StyleSheet, Pressable } from "react-native";
import Swiper from "react-native-deck-swiper";

type Card = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  imageUrl: string;
};

const BG = "#0B0B0F";
const PURPLE = "#7B61FF";

export default function DiscoveryScreen() {
  const swiperRef = useRef<Swiper<Card>>(null);

  const cards = useMemo<Card[]>(
    () => [
      {
        id: "1",
        title: "Blinding Lights",
        artist: "The Weeknd",
        album: "After Hours",
        imageUrl: "https://picsum.photos/900/1400?1",
      },
      {
        id: "2",
        title: "Bad Habits",
        artist: "Ed Sheeran",
        album: "=",
        imageUrl: "https://picsum.photos/900/1400?2",
      },
      {
        id: "3",
        title: "Levitating",
        artist: "Dua Lipa",
        album: "Future Nostalgia",
        imageUrl: "https://picsum.photos/900/1400?3",
      },
    ],
    []
  );

  return (
    <View style={styles.screen}>
      <Swiper
        ref={swiperRef}
        cards={cards}
        cardIndex={0}
        stackSize={2}
        backgroundColor="transparent"
        verticalSwipe={false} // usually feels better for “like/dislike”
        renderCard={(card) => {
          if (!card) return <View />;
          return (
            <ImageBackground source={{ uri: card.imageUrl }} style={styles.card} imageStyle={styles.cardImage}>
              <View style={styles.bottomFade}>
                <Text style={styles.title}>{card.title}</Text>
                <Text style={styles.subtitle}>
                  {card.artist}
                  {card.album ? ` • ${card.album}` : ""}
                </Text>

                <Pressable
                  style={styles.playButton}
                  onPress={() => {
                    // TEMP: choose what your play button does
                    // e.g., open modal, or just “like”
                    swiperRef.current?.swipeRight();
                  }}
                >
                  <Text style={styles.playText}>▶</Text>
                </Pressable>
              </View>
            </ImageBackground>
          );
        }}
        onSwiped={(newIndex) => {
          // Called when *any* swipe happens; gives you the new card index
          // Useful for prefetching
        }}
        onSwipedLeft={(index) => {
          const card = cards[index];
          console.log("NOPE:", card?.id);
        }}
        onSwipedRight={(index) => {
          const card = cards[index];
          console.log("LIKE:", card?.id);
          // Save to global “liked” list
        }}
        onSwipedAll={() => {
          console.log("All cards swiped");
        }}
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
