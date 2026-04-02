import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { useT } from "../hooks/useT";

export default function RulesScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const T = useT();

  const RULES = useMemo(() => [
    { icon: "shuffle" as const,     title: T("ruleGoalT" as any),   desc: T("ruleGoalD" as any) },
    { icon: "layers" as const,      title: T("ruleDealT" as any),   desc: T("ruleDealD" as any) },
    { icon: "play-circle" as const, title: T("rulePlayT" as any),   desc: T("rulePlayD" as any) },
    { icon: "star" as const,        title: T("ruleEightsT" as any), desc: T("ruleEightsD" as any) },
    { icon: "add-circle" as const,  title: T("ruleDrawT" as any),   desc: T("ruleDrawD" as any) },
    { icon: "sync" as const,        title: T("ruleDeckT" as any),   desc: T("ruleDeckD" as any) },
    { icon: "trophy" as const,      title: T("ruleWinT" as any),    desc: T("ruleWinD" as any) },
  ], [T]);

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}>
      <LinearGradient
        colors={["#061209", "#0a1a0f", "#0d2418"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.gold} />
        </Pressable>
        <Text style={styles.headerTitle}>{T("rules").toUpperCase()}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {RULES.map((rule, idx) => (
          <View key={idx} style={styles.ruleCard}>
            <LinearGradient
              colors={["rgba(255,255,255,0.05)", "rgba(255,255,255,0.02)"]}
              style={styles.ruleGrad}
            >
              <View style={styles.ruleIconWrap}>
                <Ionicons name={rule.icon} size={22} color={Colors.gold} />
              </View>
              <View style={styles.ruleText}>
                <Text style={styles.ruleTitle}>{rule.title}</Text>
                <Text style={styles.ruleDesc}>{rule.desc}</Text>
              </View>
            </LinearGradient>
          </View>
        ))}

        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>OCHO LOCOS</Text>
          <Text style={styles.footerNoteSubtext}>{T("rulesTitle")}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#061209",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212,175,55,0.2)",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(212,175,55,0.1)",
  },
  headerTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 18,
    color: Colors.gold,
    letterSpacing: 2,
  },
  scrollContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 32,
  },
  ruleCard: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.12)",
  },
  ruleGrad: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 12,
  },
  ruleIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(212,175,55,0.12)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.3)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  ruleText: {
    flex: 1,
    gap: 3,
  },
  ruleTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14,
    color: Colors.gold,
    letterSpacing: 0.5,
  },
  ruleDesc: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 19,
  },
  footerNote: {
    marginTop: 12,
    alignItems: "center",
    gap: 4,
  },
  footerNoteText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 16,
    color: Colors.gold,
    opacity: 0.4,
    letterSpacing: 3,
  },
  footerNoteSubtext: {
    fontFamily: "Nunito_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    opacity: 0.5,
  },
});
