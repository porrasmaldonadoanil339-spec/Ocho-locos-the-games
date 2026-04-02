import React, { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "../constants/colors";
import { useTheme } from "../hooks/useTheme";
import { useProfile } from "../context/ProfileContext";
import { useT } from "../hooks/useT";
import { CPU_PROFILES } from "../lib/cpuProfiles";
import { PlayerProfileModal, type PlayerProfileData } from "../components/PlayerProfileModal";

type Period = "alltime" | "weekly" | "monthly";

interface RankEntry {
  rank: number;
  name: string;
  level: number;
  score: number;
  wins: number;
  avatarIcon: string;
  avatarColor: string;
  photoUrl?: string;
  isPlayer?: boolean;
}

const COUNTRIES = [
  "MX","AR","BR","CO","CL","PE","VE","EC","BO","PY","UY","GT","HN","SV","CR","PA","CU","DO","ES","US",
  "PT","FR","DE","IT","JP","KR","CN","IN","NG","ZA","EG","MA","GH","KE","TZ","PH","ID","TR","PL","RU",
];

const PREFIXES = ["Shadow","Dark","Ghost","King","Luna","Neo","Blaze","Storm","Ice","Fire","Night","Steel","Cyber","Ultra","Mega","Alpha","Omega","Hyper","Toxic","Wild","Neon","Void","Iron","Gold","Star"];
const SUFFIXES = ["Wolf","Rider","Knight","Fury","Nexus","Titan","Storm","Hawk","Blade","Rex","Zero","Nova","Sage","Viper","Fox","Bear","Lion","Eagle","Drake","Wick","Cruz","Snap","Bolt","Rush","Peak"];
const ICONS = ["person","person-circle","shield","star","trophy","flash","flame","skull","diamond","heart","flash-sharp","eye","leaf","paw","fish","bug","flower","sunny","moon","planet"];
const AVATAR_COLORS = ["#E74C3C","#9B59B6","#E67E22","#2ECC71","#1A8FC1","#D4AF37","#C0392B","#27AE60","#8E44AD","#F39C12","#3498DB","#16A085","#E91E8C","#FF5722","#00BCD4","#4CAF50","#FF9800","#795548","#607D8B","#F06292"];

function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function generateExtraPlayers(count: number, startSeed: number): RankEntry[] {
  const players: RankEntry[] = [];
  for (let i = 0; i < count; i++) {
    const s = startSeed + i * 17;
    const prefix = PREFIXES[Math.floor(seededRand(s) * PREFIXES.length)];
    const suffix = SUFFIXES[Math.floor(seededRand(s + 1) * SUFFIXES.length)];
    const num = Math.floor(seededRand(s + 2) * 999);
    const name = num > 800 ? `${prefix}${suffix}` : `${prefix}${suffix}${num > 0 ? num.toString().slice(0, 2) : ""}`;
    const level = Math.max(1, Math.floor(seededRand(s + 3) * 99));
    const wins = Math.max(1, Math.floor(level * 14 * (1 + seededRand(s + 4) * 1.5)));
    const usePhoto = seededRand(s + 8) > 0.62;
    const photoNum = Math.floor(seededRand(s + 9) * 70) + 1;
    players.push({
      rank: 0,
      name,
      level,
      score: wins * 10 + Math.floor(seededRand(s + 5) * 500),
      wins,
      avatarIcon: ICONS[Math.floor(seededRand(s + 6) * ICONS.length)],
      avatarColor: AVATAR_COLORS[Math.floor(seededRand(s + 7) * AVATAR_COLORS.length)],
      photoUrl: usePhoto ? `https://i.pravatar.cc/150?img=${photoNum}` : undefined,
    });
  }
  return players;
}

function buildLeaderboard(
  playerName: string,
  playerLevel: number,
  playerWins: number,
  period: Period,
  playerPhotoUrl?: string
): RankEntry[] {
  const multiplier = period === "alltime" ? 1 : period === "monthly" ? 0.12 : 0.03;

  const cpuEntries: RankEntry[] = CPU_PROFILES.map((p, i) => {
    const seed = i * 13 + (period === "weekly" ? 7777 : period === "monthly" ? 3333 : 1111);
    const baseWins = Math.floor(p.level * 18 * (1 + seededRand(seed) * 2));
    const wins = Math.max(1, Math.floor(baseWins * multiplier));
    return {
      rank: 0,
      name: p.name,
      level: p.level,
      score: wins * 10 + Math.floor(seededRand(seed + 1) * 1000),
      wins,
      avatarIcon: p.avatarIcon,
      avatarColor: p.avatarColor,
      photoUrl: p.photoUrl,
    };
  });

  const extraSeed = period === "weekly" ? 50000 : period === "monthly" ? 60000 : 70000;
  const extraCount = 1000 - CPU_PROFILES.length - 1;
  const extraEntries = generateExtraPlayers(Math.max(0, extraCount), extraSeed).map(e => ({
    ...e,
    wins: Math.max(1, Math.floor(e.wins * multiplier)),
    score: Math.max(1, Math.floor(e.score * multiplier)),
  }));

  const playerWinsAdjusted = Math.max(0, Math.floor(playerWins * multiplier));
  const playerEntry: RankEntry = {
    rank: 0,
    name: playerName,
    level: playerLevel,
    score: playerWinsAdjusted * 10,
    wins: playerWinsAdjusted,
    avatarIcon: "person",
    avatarColor: Colors.gold,
    photoUrl: playerPhotoUrl,
    isPlayer: true,
  };

  const all = [...cpuEntries, ...extraEntries, playerEntry].sort((a, b) => b.score - a.score);
  return all.map((e, i) => ({ ...e, rank: i + 1 }));
}

function RankRow({ entry, theme, onPress }: { entry: RankEntry; theme: any; onPress: () => void }) {
  const isTop3 = entry.rank <= 3;
  const medalColors = ["#D4AF37", "#C0C0C0", "#CD7F32"];
  const bgColor = entry.isPlayer
    ? Colors.gold + "18"
    : isTop3
    ? medalColors[entry.rank - 1] + "10"
    : "transparent";
  const borderColor = entry.isPlayer ? Colors.gold + "44" : "transparent";

  return (
    <Pressable
      style={({ pressed }) => [styles.row, { backgroundColor: bgColor, borderColor }, pressed && !entry.isPlayer && { opacity: 0.8 }]}
      onPress={onPress}
    >
      <View style={styles.rankCol}>
        {isTop3 ? (
          <Ionicons name={entry.rank === 1 ? "trophy" : "medal"} size={18} color={medalColors[entry.rank - 1]} />
        ) : (
          <Text style={[styles.rankNum, { color: entry.isPlayer ? Colors.gold : theme.textMuted }]}>
            {entry.rank}
          </Text>
        )}
      </View>
      {entry.photoUrl ? (
        <Image source={{ uri: entry.photoUrl }} style={[styles.avatarPhoto, { borderColor: entry.avatarColor + "66" }]} />
      ) : (
        <View style={[styles.avatarDot, { backgroundColor: entry.avatarColor + "33", borderColor: entry.avatarColor + "66" }]}>
          <Ionicons name={entry.avatarIcon as any} size={14} color={entry.avatarColor} />
        </View>
      )}
      <View style={styles.nameCol}>
        <Text style={[styles.entryName, { color: entry.isPlayer ? Colors.gold : theme.text }]} numberOfLines={1}>
          {entry.name}{entry.isPlayer ? " ★" : ""}
        </Text>
        <Text style={[styles.entryLevel, { color: theme.textMuted }]}>Lv.{entry.level}</Text>
      </View>
      <View style={styles.scoreCol}>
        <Text style={[styles.entryWins, { color: entry.isPlayer ? Colors.gold : theme.text }]}>
          {entry.wins.toLocaleString()}
        </Text>
        <Text style={[styles.entryWinsLabel, { color: theme.textMuted }]}>V</Text>
      </View>
      {!entry.isPlayer && (
        <Ionicons name="chevron-forward" size={13} color={theme.textDim ?? theme.textMuted} />
      )}
    </Pressable>
  );
}

export default function RankingScreen() {
  const insets = useSafeAreaInsets();
  const { profile, level, addOutgoingFriendRequest } = useProfile();
  const T = useT();
  const theme = useTheme();
  const [period, setPeriod] = useState<Period>("alltime");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerProfileData | null>(null);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const isDark = theme.isDark;

  const leaderboard = useMemo(() => buildLeaderboard(
    profile.name,
    level,
    profile.stats.totalWins,
    period,
    profile.photoUri || undefined,
  ), [profile.name, level, profile.stats.totalWins, period, profile.photoUri]);

  const playerEntry = leaderboard.find((e) => e.isPlayer);

  const bgGrad: [string, string] = isDark
    ? ["#041008", "#0a1a0f"]
    : ["#d4edd0", "#e8f5e2"];

  const PERIODS: { id: Period; icon: string; label: string }[] = [
    { id: "alltime", icon: "globe-outline", label: T("allTime") },
    { id: "monthly", icon: "calendar-outline", label: T("monthly") },
    { id: "weekly", icon: "flash-outline", label: T("weekly") },
  ];

  const openPlayerProfile = (entry: RankEntry) => {
    if (entry.isPlayer) return;
    setSelectedPlayer({
      name: entry.name,
      level: entry.level,
      wins: entry.wins,
      score: entry.score,
      avatarIcon: entry.avatarIcon,
      avatarColor: entry.avatarColor,
      photoUrl: entry.photoUrl,
      rank: entry.rank,
      winRate: Math.min(92, 30 + Math.floor(entry.level * 0.5)),
      requestSent: sentRequests.has(entry.name),
    });
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <LinearGradient colors={bgGrad} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={theme.gold} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.gold }]}>{T("worldRanking")}</Text>
          {playerEntry && (
            <Text style={[styles.myRankText, { color: theme.textMuted }]}>
              {T("myPosition")}: #{playerEntry.rank} {T("of")} {leaderboard.length.toLocaleString()} {T("rankPlayers")}
            </Text>
          )}
        </View>
        <View style={[styles.trophyWrap, { backgroundColor: Colors.gold + "18" }]}>
          <Ionicons name="trophy" size={22} color={Colors.gold} />
        </View>
      </View>

      <View style={styles.tabRow}>
        {PERIODS.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => setPeriod(p.id)}
            style={[
              styles.tabBtn,
              { borderColor: period === p.id ? theme.gold : theme.border, backgroundColor: period === p.id ? theme.gold + "22" : "transparent" },
            ]}
          >
            <Ionicons name={p.icon as any} size={12} color={period === p.id ? theme.gold : theme.textMuted} />
            <Text style={[styles.tabText, { color: period === p.id ? theme.gold : theme.textMuted }]}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.colHeaders, { borderBottomColor: theme.border }]}>
        <Text style={[styles.colLabel, { width: 40, color: theme.textMuted }]}>#</Text>
        <Text style={[styles.colLabel, { flex: 1, color: theme.textMuted }]}>{T("player")}</Text>
        <Text style={[styles.colLabel, { width: 56, textAlign: "right", color: theme.textMuted }]}>{T("rankWins")}</Text>
      </View>

      <FlatList
        data={leaderboard}
        keyExtractor={(e) => `${e.rank}-${e.name}`}
        renderItem={({ item }) => (
          <RankRow entry={item} theme={theme} onPress={() => openPlayerProfile(item)} />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        initialNumToRender={40}
        maxToRenderPerBatch={40}
        windowSize={10}
      />

      <PlayerProfileModal
        visible={!!selectedPlayer}
        player={selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        onAddFriend={(name) => {
          setSentRequests(prev => new Set([...prev, name]));
          setSelectedPlayer(prev => prev ? { ...prev, requestSent: true } : null);
          if (selectedPlayer) {
            addOutgoingFriendRequest({
              id: `rank_${name}`,
              name: selectedPlayer.name,
              level: selectedPlayer.level,
              avatarIcon: selectedPlayer.avatarIcon,
              avatarColor: selectedPlayer.avatarColor,
              photoUrl: selectedPlayer.photoUrl,
            });
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#041008" },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  title: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 18, letterSpacing: 2,
  },
  myRankText: { fontFamily: "Nunito_700Bold", fontSize: 11, marginTop: 1 },
  trophyWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  tabRow: { flexDirection: "row", gap: 6, paddingHorizontal: 14, marginBottom: 8 },
  tabBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
    alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 4,
  },
  tabText: { fontFamily: "Nunito_700Bold", fontSize: 11 },
  colHeaders: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 6,
    borderBottomWidth: 1,
  },
  colLabel: { fontFamily: "Nunito_700Bold", fontSize: 10, letterSpacing: 1 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1,
  },
  rankCol: { width: 30, alignItems: "center" },
  rankNum: { fontFamily: "Nunito_800ExtraBold", fontSize: 14 },
  avatarDot: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  avatarPhoto: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1,
  },
  nameCol: { flex: 1 },
  entryName: { fontFamily: "Nunito_700Bold", fontSize: 13 },
  entryLevel: { fontFamily: "Nunito_400Regular", fontSize: 10, marginTop: 1 },
  scoreCol: { flexDirection: "row", alignItems: "baseline", gap: 2, minWidth: 44, justifyContent: "flex-end" },
  entryWins: { fontFamily: "Nunito_800ExtraBold", fontSize: 15 },
  entryWinsLabel: { fontFamily: "Nunito_700Bold", fontSize: 10 },
});
