import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from "react-native";

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';

const BRAND_PURPLE = "#7B61FF";
const BG = "#0B0B0F";
const BG_ELEV = "#14141A";
const TEXT_MUTED = "#9AA0A6";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        // Header (top bar)
        headerShown: true,
        headerTitle: "Tuneder",
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: BG_ELEV },
        headerTitleStyle: {
          color: BRAND_PURPLE,
          fontSize: 28,
          fontWeight: "700",
          letterSpacing: 0.5,
        },
        headerShadowVisible: false,

        // Tab bar (bottom)
        tabBarStyle: {
          backgroundColor: BG_ELEV,
          borderTopColor: "rgba(255,255,255,0.08)",
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 88 : 74,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 24 : 10,
        },
        tabBarActiveTintColor: BRAND_PURPLE,
        tabBarInactiveTintColor: TEXT_MUTED,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },

        tabBarButton: HapticTab,

        sceneStyle: { backgroundColor: BG },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Discovery",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="discovery-fire" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: "Matches",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="library-music" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="profile-person" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
