import React, { useRef, useState, useEffect, createContext, useContext } from "react";
import { View, Text, ImageBackground, StyleSheet, ActivityIndicator, Dimensions } from "react-native";
import Swiper from "react-native-deck-swiper";
import { Audio } from "expo-av";
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from "../../constants/api";
import TextTicker from 'react-native-text-ticker';
import { useTheme } from '../../context/ThemeContext'; 
import { useDiscovery } from "../../context/DiscoveryContext";

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

const PlaybackContext = createContext({ playingId: null as string | null });

const TrackCard = ({ card }: { card: Track | null }) => {
  const { playingId } = useContext(PlaybackContext);
  const { colors } = useTheme(); 
  
  if (!card) return <View style={[styles.emptyCard, { backgroundColor: colors.tabBg }]} />;

  const isPlaying = playingId === card.id;

  return (
    <ImageBackground source={{ uri: card.image }} style={styles.card} imageStyle={styles.cardImage}>
      <View style={styles.overlay}>
        <View style={styles.genreTag}>
          <Text style={styles.genreText}>{card.genre.toUpperCase()}</Text>
        </View>
        
        <View style={[styles.bottomSection, { backgroundColor: isPlaying ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.6)' }]}>
          <View style={styles.metaContainer}>
            <TextTicker
              style={[styles.title, { color: '#FFFFFF' }]}
              duration={5000}
              loop
              bounce={false} 
              repeatSpacer={50}
              marqueeDelay={1500}
              animationType="auto"
            >
              {card.title}
            </TextTicker>
            
            <TextTicker
              style={[styles.subtitle, { color: 'rgba(255,255,255,0.7)' }]}
              duration={5000}
              loop
              bounce={false}
              repeatSpacer={50}
              marqueeDelay={1500}
              animationType="auto"
            >
              {card.artist}
            </TextTicker>
          </View>

          <View style={[styles.playPauseButton, { borderColor: 'rgba(255,255,255,0.3)' }]}>
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
  const { colors } = useTheme(); 
  const swiperRef = useRef<Swiper<Track>>(null);
  const [cards, setCards] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const { getDiscoveryPayload } = useDiscovery();

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

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
    const discoveryData = getDiscoveryPayload();
    try {
      const response = await fetch(`${BASE_URL}/random`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          k: 10,
          weights: { "danceability": 1.0, "energy": 1.0 },
          filters: discoveryData.filters
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
        } else {
          await newSound.unloadAsync();
        }
      } catch (error) {
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
    status.isPlaying ? await sound.pauseAsync() : await sound.playAsync();
  };

  const handleOnSwiped = (cardIndex: number) => {
    setCurrentIndex(cardIndex + 1);
    const cardsLeft = cards.length - (cardIndex + 1);
    if (cardsLeft <= 3 && !isFetchingMore) {
      fetchMusicBatch(true);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <PlaybackContext.Provider value={{ playingId }}>
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <Swiper
          ref={swiperRef}
          cards={cards}
          cardIndex={currentIndex}
          stackSize={2}
          backgroundColor="transparent"
          verticalSwipe={false}
          animateCardOpacity
          onSwiped={handleOnSwiped}
          onTapCard={togglePlayback}
          marginTop={0.00625 * height}
          marginBottom={0}
          cardVerticalMargin={0}
          cardHorizontalMargin={0}
          renderCard={(card) => <TrackCard card={card} />}
        />
      </View>
    </PlaybackContext.Provider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    width: width * 0.94,
    height: height * 0.75,
    borderRadius: 24,
    overflow: "hidden",
    alignSelf: 'center',
    marginTop: 10,
  },
  cardImage: { borderRadius: 24 },
  emptyCard: { width: width * 0.94, height: height * 0.75, borderRadius: 24 },
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
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)", 
  },
  metaContainer: { flex: 1, marginRight: 15 },
  title: { fontSize: 24, fontWeight: "900" },
  subtitle: { fontSize: 15, fontWeight: "600", marginTop: 4 },
  playPauseButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  }
});