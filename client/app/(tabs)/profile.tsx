import React, { useMemo } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Alert, Platform } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/ui/icon-symbol';

const BG = "#0B0B0F";
const TAB_BG = "#27272c";
const PURPLE = "#7B61FF";
const WHITE = "#FFFFFF";

type Tab = {
  id: string;
  name: string;
  link: string;
}

export default function ProfileScreen() {
  const tabs = useMemo<Tab[]>(() => [
    { id: "1", name: "Preferences", link: "/preferences" },
    { id: "2", name: "Clear Data", link: "/clear_data" },
  ], []);

  const clearUserData = async () => {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error("Failed to clear local data", error);

      if (Platform.OS === "web") {
        window.alert("Could not clear local data. Please try again.");
      } else {
        Alert.alert("Error", "Could not clear local data. Please try again.");
      }
    }
  };

  const confirmClearUserData = () => {
    console.log("User initiated data clear");
    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "This will remove all locally stored data (likes, preferences, etc.). This cannot be undone.\n\nProceed?"
      );
      if (confirmed) {
        clearUserData();
      }
      return;
    }

    Alert.alert(
      "Clear data",
      "This will remove all locally stored data (likes, preferences, etc.). This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Yes, clear", style: "destructive", onPress: clearUserData },
      ]
    );
  };

  const handlePress = (link: string) => {
    if (link === "/clear_data") {
      confirmClearUserData();
      return;
    }

    console.log("Navigating to:", link);
  };

  const tabRender = ({ item }: { item: Tab }) => (
    <Pressable 
      style={({ pressed }) => [
        styles.tabContainer, 
        { opacity: pressed ? 0.7 : 1 }
      ]}
      onPress={() => handlePress(item.link)}
    >
      <Text style={styles.tabText}>{item.name}</Text>
      
      <IconSymbol size={20} name="chevron.right" color="rgba(255,255,255,0.4)" />
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <IconSymbol size={120} name="person.crop.circle.fill" color={WHITE} />
        <Text style={styles.title}>Welcome User</Text>
      </View>

      <FlatList
        data={tabs}
        keyExtractor={(item) => item.id}
        renderItem={tabRender}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { 
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    alignItems: "center",
    marginTop: 60,
    marginBottom: 40,
  },
  title: { 
    color: "white", 
    fontSize: 28, 
    fontWeight: "800", 
    marginTop: 16,
  },
  list: {
    width: "100%", // Forces the list to span the full screen width
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TAB_BG,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16, // Smoothed out the edges for a modern look
  },
  tabText: { 
    color: "white", 
    fontSize: 16, 
    fontWeight: "600" 
  },
});