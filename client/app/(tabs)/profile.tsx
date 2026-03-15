import React, { useState, useMemo } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Modal, 
  Switch, 
  ScrollView,
  TextInput,
  LayoutAnimation,
  Dimensions,
  Platform
} from "react-native";
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '../../context/ThemeContext';
import { useDiscovery } from '../../context/DiscoveryContext';

const { width } = Dimensions.get("window");

const AVATARS = ["🎧", "😎", "🤠", "👽", "👾", "👻", "🤖", "🎸", "🔥", "✨", "🦇", "🦋"];
const LANGUAGES = ["Any", "English", "Spanish", "Korean", "French", "Japanese"];
const DISCOVERY_LEVELS = ["Hits", "Balanced", "Deep Cuts"];
const MOODS = ["Upbeat", "Any", "Melancholy"];

export default function ProfileScreen() {
  const { isDarkMode, toggleTheme, colors } = useTheme();
  const { 
    smartTimeEnabled, setSmartTimeEnabled,
    discoveryLevel, setDiscoveryLevel,
    selectedMood, setSelectedMood
  } = useDiscovery();

  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  const [userName, setUserName] = useState("Music Lover");
  const [isEditingName, setIsEditingName] = useState(false);
  const [userAvatar, setUserAvatar] = useState("🎧");
  
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const stats = { swipes: 142, saved: 28, topGenre: "METAL PUNK ROCK" };

  const handleThemeToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    toggleTheme();
  };

  return (
    <View style={styles.screen}>
      
      <View style={styles.header}>
        <View style={styles.avatarWrapper}>
          <Pressable 
            style={({ pressed }) => [
              styles.avatarContainer, 
              { transform: [{ scale: pressed ? 0.95 : 1 }] }
            ]} 
            onPress={() => setIsAvatarModalOpen(true)}
          >
            <Text style={styles.avatarEmoji}>{userAvatar}</Text>
            <View style={styles.editBadge}>
              <IconSymbol size={14} name="pencil" color="#FFFFFF" />
            </View>
          </Pressable>
        </View>

        <View style={styles.nameSection}>
          {isEditingName ? (
            <TextInput 
              style={styles.nameInput} 
              value={userName} 
              onChangeText={setUserName} 
              onBlur={() => setIsEditingName(false)} 
              autoFocus 
              returnKeyType="done" 
              maxLength={15} 
            />
          ) : (
            <Pressable style={styles.nameContainer} onPress={() => setIsEditingName(true)}>
              <Text style={styles.title}>{userName}</Text>
              <Text style={styles.editPrompt}>Tap to rename</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.listContent}>
        <View style={styles.settingsGroup}>
          
          <Pressable 
            style={({ pressed }) => [styles.tabContainer, { opacity: pressed ? 0.7 : 1 }]} 
            onPress={handleThemeToggle}
          >
            <View style={styles.tabLeft}>
              <IconSymbol size={22} name="sun.max.fill" color={colors.primary} />
              <Text style={styles.tabText}>Lighting</Text>
            </View>
            <View style={[styles.customToggle, { backgroundColor: isDarkMode ? colors.primary : colors.border }]}>
              <View style={[styles.toggleThumb, { transform: [{ translateX: isDarkMode ? 24 : 0 }] }]}>
                <IconSymbol size={14} name={isDarkMode ? "moon.fill" : "sun.max.fill"} color={isDarkMode ? colors.primary : "#E5A000"} />
              </View>
            </View>
          </Pressable>

          <Pressable 
            style={({ pressed }) => [styles.tabContainer, { opacity: pressed ? 0.7 : 1 }]} 
            onPress={() => setIsDrawerOpen(true)}
          >
            <View style={styles.tabLeft}>
              <IconSymbol size={22} name="slider.horizontal.3" color={colors.primary} />
              <Text style={styles.tabText}>Discovery Preferences</Text>
            </View>
            <IconSymbol size={20} name="chevron.right" color={colors.subText} />
          </Pressable>

          <Pressable 
            style={({ pressed }) => [styles.tabContainer, { opacity: pressed ? 0.7 : 1 }]} 
            onPress={() => setIsStatsModalOpen(true)}
          >
            <View style={styles.tabLeft}>
              <IconSymbol size={22} name="chart.bar.fill" color={colors.primary} />
              <Text style={styles.tabText}>My Activity</Text>
            </View>
            <IconSymbol size={20} name="chevron.right" color={colors.subText} />
          </Pressable>

        </View>
      </View>

      <Modal animationType="slide" transparent visible={isStatsModalOpen} onRequestClose={() => setIsStatsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsStatsModalOpen(false)} />
          <View style={styles.drawerContent}>
            <View style={styles.drawerHandle} />
            <Text style={styles.drawerTitle}>My Activity</Text>
            
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.swipes}</Text>
                <Text style={styles.statLabel}>Swipes</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.saved}</Text>
                <Text style={styles.statLabel}>Saved</Text>
              </View>
            </View>

            <View style={[styles.statCard, styles.vibeBanner]}>
              <Text style={[styles.statValue]}>{stats.topGenre}</Text>
              <Text style={[styles.statLabel]}>Current Top Vibe</Text>
            </View>

            <Pressable style={styles.closeButton} onPress={() => setIsStatsModalOpen(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent visible={isDrawerOpen} onRequestClose={() => setIsDrawerOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsDrawerOpen(false)} />
          <View style={styles.drawerContent}>
            <View style={styles.drawerHandle} />
            <Text style={styles.drawerTitle}>Preferences</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <View style={styles.settingRow}>
                <View style={styles.textBlock}>
                  <Text style={styles.settingTitle}>Smart Time-of-Day</Text>
                  <Text style={styles.settingSub}>Adjusts music energy based on your local time</Text>
                </View>
                <Switch 
                  trackColor={{ false: colors.border, true: colors.primary }} 
                  thumbColor="#FFFFFF" 
                  onValueChange={setSmartTimeEnabled} 
                  value={smartTimeEnabled} 
                />
              </View>

              {[
                { label: "Discovery Level", desc: "Balance mainstream hits with underground cuts", data: DISCOVERY_LEVELS, state: discoveryLevel, setter: setDiscoveryLevel },
                { label: "Current Mood", desc: "Select the emotional tone of your session", data: MOODS, state: selectedMood, setter: setSelectedMood }
              ].map((section, idx) => (
                <View key={idx} style={styles.settingSection}>
                  <Text style={[styles.settingTitle, { textAlign: 'center' }]}>{section.label}</Text>
                  <Text style={[styles.settingSub, { textAlign: 'center', marginBottom: 15 }]}>{section.desc}</Text>
                  <View style={styles.centeredChipGrid}>
                    {section.data.map((item) => (
                      <Pressable 
                        key={item} 
                        style={[styles.equalChip, section.state === item && styles.chipSelected]} 
                        onPress={() => section.setter(item)}
                      >
                        <Text style={[styles.chipText, section.state === item && styles.chipTextSelected]}>{item}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
            <Pressable style={styles.closeButton} onPress={() => setIsDrawerOpen(false)}>
              <Text style={styles.closeButtonText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={isAvatarModalOpen} onRequestClose={() => setIsAvatarModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsAvatarModalOpen(false)}>
          <View style={styles.avatarModalContent}>
            <Text style={styles.avatarModalTitle}>Choose Your Vibe</Text>
            <View style={styles.avatarGrid}>
              {AVATARS.map((emoji) => (
                <Pressable
                  key={emoji}
                  style={[styles.avatarOption, userAvatar === emoji && styles.avatarOptionSelected]}
                  onPress={() => { setUserAvatar(emoji); setIsAvatarModalOpen(false); }}
                >
                  <Text style={styles.avatarOptionText}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

    </View>
  );
}

const createStyles = (theme: any, isDarkMode: boolean) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  
  header: { alignItems: "center", marginTop: 60, marginBottom: 40 },
  avatarWrapper: {
    marginBottom: 16,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDarkMode ? 0.3 : 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarContainer: { 
    width: 110, height: 110, borderRadius: 55, backgroundColor: theme.tabBg, 
    justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: theme.primary 
  },
  avatarEmoji: { 
    fontSize: 55, 
    textAlign: 'center',
    lineHeight: Platform.OS === 'ios' ? 65 : undefined 
  },
  editBadge: { 
    position: "absolute", bottom: -2, right: -2, backgroundColor: theme.primary, 
    width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center", 
    borderWidth: 4, borderColor: theme.bg 
  },
  nameSection: { alignItems: 'center', justifyContent: 'center', width: '100%' },
  nameContainer: { alignItems: 'center', justifyContent: 'center' },
  title: { color: theme.text, fontSize: 28, fontWeight: "900", textAlign: 'center' },
  editPrompt: { color: theme.subText, fontSize: 12, fontWeight: "600", marginTop: 4, opacity: 0.6, textAlign: 'center' },
  nameInput: { color: theme.text, fontSize: 28, fontWeight: "900", borderBottomWidth: 2, borderColor: theme.primary, minWidth: 150, textAlign: "center" },

  listContent: { paddingHorizontal: 20 },
  settingsGroup: { gap: 12 },
  tabContainer: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    backgroundColor: theme.tabBg, height: 72, paddingHorizontal: 20, borderRadius: 20 
  },
  tabLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  tabText: { color: theme.text, fontSize: 16, fontWeight: "700" },

  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.modalBackdrop },
  drawerContent: { backgroundColor: theme.tabBg, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, maxHeight: '85%' },
  drawerHandle: { width: 40, height: 5, backgroundColor: theme.border, borderRadius: 3, alignSelf: "center", marginBottom: 24 },
  drawerTitle: { color: theme.text, fontSize: 24, fontWeight: "900", textAlign: 'center', marginBottom: 24 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: theme.chipBg, paddingVertical: 24, borderRadius: 24, alignItems: "center" },
  vibeBanner: { flex: 0, width: '100%', marginBottom: 24 },
  statValue: { color: theme.text, fontSize: 24, fontWeight: "900" },
  statLabel: { color: theme.subText, fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginTop: 4 },

  scrollContent: { paddingBottom: 20 },
  settingSection: { marginBottom: 32 },
  centeredChipGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  equalChip: { 
    width: (width - 100) / 3, backgroundColor: theme.chipBg, 
    paddingVertical: 14, borderRadius: 16, alignItems: 'center' 
  },
  chipSelected: { backgroundColor: theme.primary },
  chipText: { color: theme.text, fontSize: 13, fontWeight: "700" },
  chipTextSelected: { color: "#FFFFFF" },

  settingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 32 },
  textBlock: { flex: 1, paddingRight: 12 },
  settingTitle: { color: theme.text, fontSize: 17, fontWeight: "800" },
  settingSub: { color: theme.subText, fontSize: 13, marginTop: 4, lineHeight: 18 },

  customToggle: { width: 56, height: 32, borderRadius: 16, justifyContent: "center", padding: 4 },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" },
  closeButton: { backgroundColor: theme.primary, paddingVertical: 18, borderRadius: 20, alignItems: "center" },
  closeButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },

  avatarModalContent: { backgroundColor: theme.tabBg, marginHorizontal: 20, marginBottom: 'auto', marginTop: 'auto', borderRadius: 30, padding: 24, alignItems: "center" },
  avatarModalTitle: { color: theme.text, fontSize: 20, fontWeight: "bold", marginBottom: 24 },
  avatarGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 16, width: '100%' },
  avatarOption: { width: 62, height: 62, borderRadius: 31, backgroundColor: theme.chipBg, justifyContent: "center", alignItems: "center" },
  avatarOptionSelected: { backgroundColor: theme.primary },
  avatarOptionText: { fontSize: 32 },
});