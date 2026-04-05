import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useProfile } from "../context/ProfileContext";
import { useT } from "../hooks/useT";
import { playTabSwitch } from "../lib/audioManager";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const T = useT();

  const isDark = profile.darkMode !== false;
  const activeTint = isDark ? "#D4AF37" : "#A07800";
  const inactiveTint = isDark ? "rgba(238,232,213,0.45)" : "rgba(13,43,13,0.40)";
  const tabBg = isDark ? "rgba(4,16,8,0.97)" : "rgba(212,237,200,0.97)";

  const tabPress = () => {
    playTabSwitch().catch(() => {});
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: inactiveTint,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: tabBg,
            default: tabBg,
          }),
          borderTopWidth: 0,
          elevation: 0,
          height: 50 + (Platform.OS === "web" ? 34 : insets.bottom),
          paddingBottom: Platform.OS === "web" ? 34 : insets.bottom,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Nunito_700Bold",
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: T("tabPlay"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="game-controller" size={size} color={color} />
          ),
        }}
        listeners={{ tabPress }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          title: T("tabAchievements"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="star" size={size} color={color} />
          ),
        }}
        listeners={{ tabPress }}
      />
      <Tabs.Screen
        name="store"
        options={{
          title: T("tabStore"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bag" size={size} color={color} />
          ),
        }}
        listeners={{ tabPress }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: T("tabProfile"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
        listeners={{ tabPress }}
      />
    </Tabs>
  );
}
