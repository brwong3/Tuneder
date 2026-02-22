import React, { useRef, useState, useEffect } from "react";
import { View, Text, ImageBackground, StyleSheet, Pressable, ActivityIndicator, Dimensions } from "react-native";
import Swiper from "react-native-deck-swiper";
import { BASE_URL } from "../../constants/api";

const { width, height } = Dimensions.get("window");

type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  image: string;
  genre: string;
};

const BG = "#0B0B0F";
const PURPLE = "#7B61FF";

export default function DiscoveryScreen() {
  const swiperRef = useRef<Swiper<Track>>(null);
  const [cards, setCards] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const fetchMusicBatch = async (isPrefetch = false) => {
    if (isPrefetch) setIsFetchingMore(true);
    try {
      const response = await fetch(`${BASE_URL}/random`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          k: 10,
          weights: { "danceability": 1.0, "energy": 1.0 }
        }),
      });

      const data = await response.json();
      if (data.recommendations) {
        if (isPrefetch) {
          setCards(prev => [...prev, ...data.recommendations]);
        } else {
          setCards(data.recommendations);
        }
      }
    } catch (error) {
      console.error("Discovery API Error:", error);
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  };

  useEffect(() => { fetchMusicBatch(); }, []);

  const handleOnSwiped = (cardIndex: number) => {
    const cardsLeft = cards.length - (cardIndex + 1);
    if (cardsLeft <= 3 && !isFetchingMore) {
      fetchMusicBatch(true);
    }
    setIsPlaying(false); // Reset to "Play" icon for the new card
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Swiper
        ref={swiperRef}
        cards={cards}
        cardIndex={0}
        stackSize={2}
        backgroundColor="transparent"
        verticalSwipe={false}
        animateCardOpacity
        onSwiped={handleOnSwiped}
        renderCard={(card) => {
          if (!card) return <View style={styles.emptyCard} />;
          return (
            <ImageBackground source={{ uri: card.image }} style={styles.card} imageStyle={styles.cardImage}>
              <View style={styles.overlay}>
                {/* Genre Tag */}
                <View style={styles.genreTag}>
                  <Text style={styles.genreText}>{card.genre.toUpperCase()}</Text>
                </View>
                
                {/* Bottom Metadata & Controls */}
                <View style={styles.bottomSection}>
                  <View style={styles.metaContainer}>
                    <Text style={styles.title} numberOfLines={1}>{card.title}</Text>
                    <Text style={styles.subtitle} numberOfLines={1}>{card.artist}</Text>
                  </View>

                  <Pressable 
                    style={styles.playPauseCircle}
                    onPress={() => setIsPlaying(!isPlaying)}
                  >
                    <Text style={styles.iconText}>
                      {isPlaying ? "┃┃" : "▶"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </ImageBackground>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, backgroundColor: BG, justifyContent: "center", alignItems: "center" },
  card: {
    width: width * 0.94, // Ultra-wide (94% width)
    height: height * 0.75,
    borderRadius: 24,
    overflow: "hidden",
    alignSelf: 'center',
    marginTop: 10,
  },
  cardImage: { borderRadius: 24 },
  emptyCard: { width: width * 0.94, height: height * 0.75, backgroundColor: "#15151A", borderRadius: 24 },
  overlay: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.15)", // Subtle dark wash
  },
  genreTag: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  genreText: { color: "white", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  bottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 20,
    borderRadius: 20,
  },
  metaContainer: { flex: 1, marginRight: 15 },
  title: { color: "white", fontSize: 22, fontWeight: "900" },
  subtitle: { color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: "500", marginTop: 2 },
  playPauseCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  iconText: {
    fontSize: 20,
    color: BG,
    textAlign: "center",
    fontWeight: "800",
    marginLeft: 2,
  },
});