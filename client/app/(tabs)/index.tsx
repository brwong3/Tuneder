import React, { useRef, useState, useEffect, createContext, useContext, useCallback } from 'react';
import { 
  View, Text, ImageBackground, StyleSheet, ActivityIndicator, 
  Dimensions, StyleProp, ViewStyle, ScrollView, TouchableOpacity 
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Swiper from 'react-native-deck-swiper';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import TextTicker from 'react-native-text-ticker';

import { useTheme } from '../../context/ThemeContext';
import { useDiscovery } from '../../context/DiscoveryContext';
import { fetchRecommendationsFromLikes, getLikedSongs, saveLikedSongs } from '../../services/storage'; 
import { BASE_URL } from '../../constants/api';

const { width, height } = Dimensions.get('window');

const COLD_START_THRESHOLD = 3; 

type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  image: string;
  genre: string;
  preview_url: string;
  features?: number[]; 
  popularity?: number;
};

const PlaybackContext = createContext({ playingId: null as string | null });

export const useLikedSongs = () => {
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [likesLoaded, setLikesLoaded] = useState(false);

  useEffect(() => {
    const loadSongs = async () => {
      const stored = await getLikedSongs();
      if (stored) setLikedIds(stored);
      setLikesLoaded(true);
    };
    loadSongs();
  }, []);

  const toggleLike = async (trackId: string) => {
    setLikedIds((prev) => {
      const updatedIds = prev.includes(trackId)
        ? prev.filter((id) => id !== trackId)
        : [...prev, trackId];
      
      saveLikedSongs(updatedIds).catch((err) => console.error("Failed to save liked songs:", err));
      return updatedIds;
    });
  };

  return { likedIds, toggleLike, likesLoaded };
};

const RecommendationDebugger = ({ likedIds, currentCard }: { likedIds: string[], currentCard: Track | null }) => {
  const { 
    getDiscoveryPayload, 
    discoveryLevel, 
    selectedMood, 
    smartTimeEnabled, 
    isFocusMode 
  } = useDiscovery();
  
  const [avgVector, setAvgVector] = useState<number[] | null>(null);
  const [fetchingVector, setFetchingVector] = useState(false);

  const payload = getDiscoveryPayload();
  const filters = payload.filters || {};
  const isColdStart = likedIds.length < COLD_START_THRESHOLD;

  useEffect(() => {
    if (likedIds.length === 0) {
      setAvgVector(null);
      return;
    }

    const fetchCurrentVector = async () => {
      setFetchingVector(true);
      try {
        const res = await fetch(`${BASE_URL}/features_by_ids`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(likedIds)
        });
        
        if (res.ok) {
          const json = await res.json();
          const features = json.features || [];
          if (features.length > 0) {
            const averaged = features[0].map((_: any, colIndex: number) => 
              features.reduce((sum: number, row: number[]) => sum + row[colIndex], 0) / features.length
            );
            setAvgVector(averaged);
          }
        }
      } catch (e) {
        console.error("Debugger failed to fetch vector:", e);
      } finally {
        setFetchingVector(false);
      }
    };

    fetchCurrentVector();
  }, [likedIds]);

  const currPop = currentCard?.features?.[0] ?? currentCard?.popularity;
  const currEnergy = currentCard?.features?.[2];
  const currValence = currentCard?.features?.[10];

  return (
    <View style={styles.debugContainer}>
      <Text style={styles.debugHeader}>🐛 Recs Debugger</Text>
      
      <View style={styles.debugRow}>
        <Text style={styles.debugLabel}>Engine State:</Text>
        <Text style={[styles.debugValue, { color: isColdStart ? '#FF9800' : '#4CAF50' }]}>
          {isColdStart ? 'COLD START (Random)' : 'WARM START (Context)'}
        </Text>
      </View>
      
      <View style={styles.debugRow}>
        <Text style={styles.debugLabel}>Profile Size:</Text>
        <Text style={styles.debugValue}>{likedIds.length} / {COLD_START_THRESHOLD} Likes</Text>
      </View>

      <Text style={styles.debugSubHeader}>Current UI Toggles</Text>
      <View style={styles.debugGrid}>
        <Text style={styles.debugGridItem}>Level: {discoveryLevel}</Text>
        <Text style={styles.debugGridItem}>Mood: {selectedMood}</Text>
        <Text style={styles.debugGridItem}>Smart Time: {smartTimeEnabled ? 'ON' : 'OFF'}</Text>
        <Text style={styles.debugGridItem}>Focus: {isFocusMode ? 'ON' : 'OFF'}</Text>
      </View>

      <Text style={styles.debugSubHeader}>
        Target Boundaries vs. Current Taste
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.debugTable}>
          
          {/* Popularity */}
          <View style={styles.debugTableCol}>
            <Text style={styles.debugColHeader}>[0] Popularity</Text>
            <Text style={[styles.debugColData, { color: '#FF4081', fontWeight: 'bold' }]}>
              Now: {currPop !== null && currPop !== undefined ? currPop.toFixed(1) : 'N/A'}
            </Text>
            <Text style={[styles.debugColData, { color: '#00E5FF', fontWeight: 'bold', marginBottom: 4 }]}>
              Avg: {avgVector ? (avgVector[0] * 100).toFixed(1) : (fetchingVector ? '...' : 'N/A')}
            </Text>
            <Text style={styles.debugColData}>Min: {filters.min_popularity ?? 0}</Text>
            <Text style={styles.debugColData}>Max: {filters.max_popularity ?? 100}</Text>
          </View>
          
          {/* Energy */}
          <View style={styles.debugTableCol}>
            <Text style={styles.debugColHeader}>[2] Energy</Text>
            <Text style={[styles.debugColData, { color: '#FF4081', fontWeight: 'bold' }]}>
              Now: {currEnergy !== undefined ? currEnergy.toFixed(3) : 'N/A'}
            </Text>
            <Text style={[styles.debugColData, { color: '#00E5FF', fontWeight: 'bold', marginBottom: 4 }]}>
              Avg: {avgVector ? avgVector[2].toFixed(3) : (fetchingVector ? '...' : 'N/A')}
            </Text>
            <Text style={styles.debugColData}>Min: {filters.min_energy?.toFixed(2) ?? 0}</Text>
            <Text style={styles.debugColData}>Max: {filters.max_energy?.toFixed(2) ?? 1}</Text>
          </View>

          {/* Valence */}
          <View style={styles.debugTableCol}>
            <Text style={styles.debugColHeader}>[10] Valence</Text>
            <Text style={[styles.debugColData, { color: '#FF4081', fontWeight: 'bold' }]}>
              Now: {currValence !== undefined ? currValence.toFixed(3) : 'N/A'}
            </Text>
            <Text style={[styles.debugColData, { color: '#00E5FF', fontWeight: 'bold', marginBottom: 4 }]}>
              Avg: {avgVector ? avgVector[10].toFixed(3) : (fetchingVector ? '...' : 'N/A')}
            </Text>
            <Text style={styles.debugColData}>Min: {filters.min_valence?.toFixed(2) ?? 0}</Text>
            <Text style={styles.debugColData}>Max: {filters.max_valence?.toFixed(2) ?? 1}</Text>
          </View>

        </View>
      </ScrollView>
    </View>
  );
};

const TrackCard = ({ card }: { card: Track | null }) => {
  const { playingId } = useContext(PlaybackContext);
  const { colors } = useTheme();

  if (!card) {
    return <View style={[styles.emptyCard, { backgroundColor: colors.tabBg }]} />;
  }

  const isPlaying = playingId === card.id;

  return (
    <ImageBackground
      source={{ uri: card.image }}
      style={[styles.card, { userSelect: 'none' } as StyleProp<ViewStyle>]}
      imageStyle={styles.cardImage}
    >
      <View style={styles.overlay}>
        <View style={styles.genreTag}>
          <Text selectable={false} style={styles.genreText}>
            {card.genre.toUpperCase()}
          </Text>
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
              name={isPlaying ? 'pause' : 'play'}
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
  const { getDiscoveryPayload } = useDiscovery();
  const { likedIds, toggleLike, likesLoaded } = useLikedSongs();
  const isFocused = useIsFocused();
  const swiperRef = useRef<Swiper<Track>>(null);

  const [cards, setCards] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [showDebugger, setShowDebugger] = useState(false);
  
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [shouldResumeOnFocus, setShouldResumeOnFocus] = useState(false);

  const fetchMusicBatch = useCallback(async (isPrefetch = false, attempt = 1) => {
    if (isPrefetch) setIsFetchingMore(true);
    
    try {
      const payload = getDiscoveryPayload();
      let newTracks: Track[] = [];

      const currentK = attempt === 1 ? 10 : 30;
      const activeFilters = attempt >= 3 ? undefined : payload.filters;

      if (likedIds.length < COLD_START_THRESHOLD) {
        console.log(`Cold Start (Attempt ${attempt}): K=${currentK}, Filters=${activeFilters ? 'ON' : 'OFF'}`);
        const response = await fetch(`${BASE_URL}/random`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true' 
          },
          body: JSON.stringify({
            k: currentK,
            weights: { danceability: 1.0, energy: 1.0 },
            filters: activeFilters,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          newTracks = data.recommendations || [];
        }
      } else {
        console.log(`Warm Start (Attempt ${attempt}): K=${currentK}, Filters=${activeFilters ? 'ON' : 'OFF'}`);
        const adjustedPayload = { ...payload, limit: currentK, filters: activeFilters };
        newTracks = await fetchRecommendationsFromLikes(likedIds, adjustedPayload);
      }

      if (newTracks.length > 0) {
        setCards((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          const uniqueNewTracks = newTracks.filter((t) => !existingIds.has(t.id));
          return isPrefetch ? [...prev, ...uniqueNewTracks] : uniqueNewTracks;
        });
      } else if (attempt < 3) {
        console.warn(`🚨 Fetch yielded 0 tracks. Widening search to Attempt ${attempt + 1}...`);
        return fetchMusicBatch(isPrefetch, attempt + 1);
      } else {
        console.error("🚨 Failed to find ANY tracks, even after dropping all filters.");
      }
    } catch (error) {
      console.error('🚨 Network/Fetch Error:', error);
    } finally {
      if (attempt === 1 || attempt >= 3) {
        setLoading(false);
        setIsFetchingMore(false);
      }
    }
  }, [getDiscoveryPayload, likedIds]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  }, []);

  useEffect(() => {
    if (likesLoaded && cards.length === 0) {
      fetchMusicBatch();
    }
  }, [likesLoaded, fetchMusicBatch]);

  const currentCard = cards[currentIndex] || null;
  const currentPreviewUrl = currentCard?.preview_url;
  const currentCardId = currentCard?.id;

  useEffect(() => {
    if (!currentPreviewUrl) return;

    let isMounted = true;
    let localSound: Audio.Sound | null = null;

    const loadAndPlay = async () => {
      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: currentPreviewUrl }, 
          { shouldPlay: true, isLooping: true }
        );

        if (!isMounted) {
          await newSound.unloadAsync();
          return;
        }

        setSound(newSound);
        localSound = newSound;

        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setPlayingId(status.isPlaying ? currentCardId : null);
          }
        });
      } catch (error) {
        console.error('🚨 Audio load error:', error);
        if (isMounted) setPlayingId(null);
      }
    };

    loadAndPlay();

    return () => {
      isMounted = false;
      setPlayingId(null);
      if (localSound) {
        localSound.setOnPlaybackStatusUpdate(null);
        localSound.stopAsync().finally(() => localSound?.unloadAsync());
      }
    };
  }, [currentIndex, currentPreviewUrl, currentCardId]);

  useEffect(() => {
    if (!sound) return;

    const handleFocusAudio = async () => {
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) return;

      if (!isFocused && status.isPlaying) {
        setShouldResumeOnFocus(true);
        await sound.pauseAsync();
      } else if (isFocused && shouldResumeOnFocus && !status.isPlaying) {
        await sound.playAsync();
        setShouldResumeOnFocus(false);
      }
    };

    handleFocusAudio();
  }, [isFocused, sound, shouldResumeOnFocus]);

  const togglePlayback = async () => {
    if (!sound) return;
    const status = await sound.getStatusAsync();
    if (status.isLoaded) {
      status.isPlaying ? await sound.pauseAsync() : await sound.playAsync();
    }
  };

  const handleOnSwiped = (cardIndex: number) => {
    const newIndex = cardIndex + 1;
    setCurrentIndex(newIndex);
    
    if (cards.length - newIndex <= 4 && !isFetchingMore) {
      fetchMusicBatch(true);
    }
  };

  const handleOnSwipedRight = (cardIndex: number) => {
    const likedTrack = cards[cardIndex];
    if (likedTrack) {
      toggleLike(likedTrack.id);
      console.log(`Liked: ${likedTrack.title}`);
    }
  };

  if (loading || !likesLoaded) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <PlaybackContext.Provider value={{ playingId }}>
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        
        <TouchableOpacity 
          style={styles.bugButton} 
          onPress={() => setShowDebugger(!showDebugger)}
        >
          <Text style={{ fontSize: 24 }}>🐛</Text>
        </TouchableOpacity>

        {showDebugger && <RecommendationDebugger likedIds={likedIds} currentCard={currentCard} />}

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
          renderCard={(card) => <TrackCard card={card} />}
        />
      </View>
    </PlaybackContext.Provider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    width: width * 0.94,
    height: height * 0.75,
    borderRadius: 24,
    overflow: 'hidden',
    alignSelf: 'center',
    marginTop: 10,
  },
  cardImage: { borderRadius: 24 },
  emptyCard: { width: width * 0.94, height: height * 0.75, borderRadius: 24 },
  overlay: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  genreTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  genreText: { color: 'white', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  bottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  metaContainer: { flex: 1, marginRight: 15 },
  title: { fontSize: 24, fontWeight: '900' },
  subtitle: { fontSize: 15, fontWeight: '600', marginTop: 4 },
  playPauseButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  bugButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 9999,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 50,
  },
  debugContainer: {
    position: 'absolute',
    top: 110,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    zIndex: 9998, 
  },
  debugHeader: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  debugSubHeader: { color: '#AAA', fontSize: 12, fontWeight: 'bold', marginTop: 15, marginBottom: 5, textTransform: 'uppercase' },
  debugRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  debugLabel: { color: '#CCC', fontSize: 14 },
  debugValue: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  debugGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  debugGridItem: { backgroundColor: '#333', color: '#FFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 12 },
  debugTable: { flexDirection: 'row', marginTop: 5, gap: 15 },
  debugTableCol: { backgroundColor: '#222', padding: 10, borderRadius: 8, minWidth: 110 },
  debugColHeader: { color: '#1DB954', fontWeight: 'bold', fontSize: 12, marginBottom: 5 },
  debugColData: { color: '#FFF', fontSize: 13, fontFamily: 'monospace', marginVertical: 1 }
});