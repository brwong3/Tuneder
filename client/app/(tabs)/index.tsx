import React, { useRef, useState, useEffect, createContext, useContext } from "react";
import { View, Text, ImageBackground, StyleSheet, ActivityIndicator, Dimensions } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Swiper from "react-native-deck-swiper";
import { Audio } from "expo-av";
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from "../../constants/api";
import { saveLikedSongs } from '../../services/storage';

const { width, height } = Dimensions.get("window");

type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  image: string;
  genre: string;
  preview_url: string; 
};

const BG = "#0B0B0F";
const PURPLE = "#7B61FF";

const PlaybackContext = createContext({ playingId: null as string | null });

const LIKED_SONGS_KEY = '@liked_songs_ids';

export const useLikedSongs = () => {
  const [likedIds, setLikedIds] = useState<string[]>([]);

  // TODO: remove later
  // remove all liked songs for testing
  useEffect(() => {
    const clearLikedSongs = async () => {
      await AsyncStorage.removeItem(LIKED_SONGS_KEY);
      setLikedIds([]);
    };
    clearLikedSongs();
  }, []);

  // Load liked songs on startup
  useEffect(() => {
    const loadSongs = async () => {
      const stored = await AsyncStorage.getItem(LIKED_SONGS_KEY);
      if (stored) setLikedIds(JSON.parse(stored));
    };
    loadSongs();
  }, []);

  const toggleLike = async (trackId: string) => {
    let updatedIds;
    if (likedIds.includes(trackId)) {
      updatedIds = likedIds.filter(id => id !== trackId); // Remove if already liked
    } else {
      updatedIds = [...likedIds, trackId]; // Add new like
    }

    setLikedIds(updatedIds);
    await AsyncStorage.setItem(LIKED_SONGS_KEY, JSON.stringify(updatedIds));
  };

  return { likedIds, toggleLike };
};

const TrackCard = ({ card }: { card: Track | null }) => {
  const { playingId } = useContext(PlaybackContext);
  
  if (!card) return <View style={styles.emptyCard} />;

  const isPlaying = playingId === card.id;

  return (
    <ImageBackground source={{ uri: card.image }} style={styles.card} imageStyle={styles.cardImage}>
      <View style={styles.overlay}>
        <View style={styles.genreTag}>
          <Text style={styles.genreText}>{card.genre.toUpperCase()}</Text>
        </View>
        
        <View style={styles.bottomSection}>
          <View style={styles.metaContainer}>
            <Text style={styles.title} numberOfLines={1}>{card.title}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>{card.artist}</Text>
          </View>

          <View style={styles.playPauseButton}>
            <Ionicons 
              name={isPlaying ? "pause" : "play"} 
              size={24} 
              color="white" 
              style={{ marginLeft: isPlaying ? 0 : 3 }} 
            />
          </View>
        </View>
      </View>
    </ImageBackground>
  );
};


export default function DiscoveryScreen() {
  const swiperRef = useRef<Swiper<Track>>(null);
  const [cards, setCards] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const { likedIds, toggleLike } = useLikedSongs();

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    fetchMusicBatch();
  }, []);

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

  useEffect(() => {
    const currentCard = cards[currentIndex];
    if (!currentCard || !currentCard.preview_url) return;

    let isMounted = true;
    let localSound: Audio.Sound | null = null;

    const loadAndPlay = async () => {
      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: currentCard.preview_url },
          { shouldPlay: true, isLooping: true }
        );

        if (isMounted) {
          setSound(newSound);
          localSound = newSound;
          
          newSound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded) {
              setPlayingId(status.isPlaying ? currentCard.id : null);
            }
          });

          const initialStatus = await newSound.getStatusAsync();
          if (initialStatus.isLoaded) {
             setPlayingId(initialStatus.isPlaying ? currentCard.id : null);
          }
        } else {
          await newSound.unloadAsync();
        }
      } catch (error) {
        console.warn("Autoplay blocked by browser or playback error:", error);
        if (isMounted) setPlayingId(null); 
      }
    };

    loadAndPlay();

    return () => {
      isMounted = false;
      if (localSound) {
        localSound.setOnPlaybackStatusUpdate(null);
        localSound.stopAsync();
        localSound.unloadAsync();
      }
      setPlayingId(null); 
    };
  }, [currentIndex, cards]);

  const togglePlayback = async () => {
    if (!sound) return;
    
    const status = await sound.getStatusAsync();
    if (!status.isLoaded) return;

    if (status.isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  const handleOnSwiped = (cardIndex: number) => {
    setCurrentIndex(cardIndex + 1);
    const cardsLeft = cards.length - (cardIndex + 1);
    if (cardsLeft <= 3 && !isFetchingMore) {
      fetchMusicBatch(true);
    }
  };

  const handleOnSwipedRight = async (cardIndex: number) => {
    const likedTrack = cards[cardIndex];

    // figure out the new list of liked ids then persist via helper
    const updated = likedIds.includes(likedTrack.id)
      ? likedIds.filter(id => id !== likedTrack.id)
      : [...likedIds, likedTrack.id];

    // update local state / storage through the hook
    toggleLike(likedTrack.id);

    // make sure the helper is used for persistence as requested
    await saveLikedSongs(updated);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  return (
    <PlaybackContext.Provider value={{ playingId }}>
      <View style={styles.screen}>
        <Swiper
          ref={swiperRef}
          cards={cards}
          cardIndex={currentIndex}
          stackSize={2}
          backgroundColor="transparent"
          verticalSwipe={false}
          animateCardOpacity
          onSwiped={handleOnSwiped}
          onSwipedRight={handleOnSwipedRight}
          onTapCard={togglePlayback}
          marginTop={0.00625 * height}
          marginBottom={0}
          cardVerticalMargin={0}
          cardHorizontalMargin={0}
          renderCard={(card) => {
            return <TrackCard card={card} />;
          }}
        />
      </View>
    </PlaybackContext.Provider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, backgroundColor: BG, justifyContent: "center", alignItems: "center" },
  card: {
    width: width * 0.94,
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
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  genreTag: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  genreText: { color: "white", fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  bottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)", 
  },
  metaContainer: { flex: 1, marginRight: 15 },
  title: { color: "white", fontSize: 24, fontWeight: "900" },
  subtitle: { color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: "600", marginTop: 4 },
  playPauseButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  }
});