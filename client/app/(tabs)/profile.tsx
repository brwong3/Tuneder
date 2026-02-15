import React, { useMemo } from "react";
import { View, Text, ImageBackground, StyleSheet, FlatList } from "react-native";
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
    { id: "1", name: "Account", link: "/account" },
    { id: "2", name: "Preferences", link: "/preferences" },
    { id: "3", name: "Logout", link: "/logout" },
  ], []);

  const tabRender = ({ item }: { item: Tab }) => (
    <View style={[styles.bottomFade, { backgroundColor: TAB_BG, padding: 16 }]}>
      <Text style={styles.title}>{item.name}</Text>
    </View>
  );

  return (
    <View style={[styles.screen]}>
      <IconSymbol size={240} name="profile-person" color={WHITE} />
      <Text style={styles.title}>Welcome [Name]</Text>
      <FlatList
        data={tabs}
        keyExtractor={(item) => item.id}
        renderItem={ tabRender }
        contentContainerStyle={{ padding: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { 
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
  },
  bottomFade: {
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  title: { color: "white", fontSize: 24, fontWeight: "800", alignSelf: "center" },
  tabName: { color: "rgba(255,255,255,0.85)", marginTop: 6, fontSize: 14, fontWeight: "600" },
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
