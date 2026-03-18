import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from "react-native";

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/context/ThemeContext'; 

export default function TabLayout() {
  const { colors, isDarkMode } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitle: "Tuneder",
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: colors.tabBg },
        headerTitleStyle: {
          color: colors.primary,
          fontSize: 28,
          fontWeight: "700",
          letterSpacing: 0.5,
        },
        headerShadowVisible: false,

        tabBarStyle: {
          backgroundColor: colors.tabBg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 88 : 74,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 24 : 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subText,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },

        tabBarButton: HapticTab,
        sceneStyle: { backgroundColor: colors.bg },
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