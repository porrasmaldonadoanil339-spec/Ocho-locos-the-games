import React, { useMemo, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, Pressable, Platform, Dimensions, Modal, FlatList, ActivityIndicator, Image,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors, LightColors } from "../constants/colors";
import { useT } from "../hooks/useT";
import { useProfile } from "../context/ProfileContext";
import { getRankInfo, RANKS, RANK_COLORS, RANK_ICONS, DIVISIONS } from "../lib/ranked";
import { getCurrentSeason, getSeasonRewardsForRank } from "../lib/seasons";
import { AvatarDisplay } from "../components/AvatarDisplay";
import { PlayerProfileModal, type PlayerProfileData } from "../components/PlayerProfileModal";

const { width } = Dimensions.get("window");

// Pseudo-random generator seeded
function seededRand(seed: number): number {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const FIRST_NAMES = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Jamie", "Quinn", "Avery", "Peyton", "Skyler", "Charlie", "Sacha", "Robin", "René", "Mika", "Dani", "Chris", "Pat", "Terry"];
const LAST_NAMES = ["Ace", "King", "Queen", "Joker", "Card", "Pro", "Star", "Wolf", "Dragon", "Shadow", "Blade", "Flash", "Zen", "Neo", "Max", "Rex", "Bolt", "Titan", "Alpha", "Omega"];
const SUFFIXES = ["99", "Pro", "X", "_", "77", "Killer", "Master", "Elite", "Legend", "123", "007", "Ace", "Winner", "King"];

const AVATAR_ICONS = ["cut", "sparkles", "flame", "shield", "book", "sunny", "trophy", "hardware-chip", "bag", "moon", "heart", "eye-off", "skull", "star", "game-controller", "happy", "bonfire", "diamond", "ribbon", "paw"];
const AVATAR_COLORS = ["#E74C3C", "#9B59B6", "#E67E22", "#95A5A6", "#4A90D9", "#D4AF37", "#C0392B", "#00D4FF", "#8B7355", "#1a0020", "#E91E8C", "#2C3E50"];

const COUNTRIES = [
  { code: "MX", name: "México" }, { code: "CO", name: "Colombia" }, { code: "AR", name: "Argentina" },
  { code: "US", name: "EE.UU." }, { code: "ES", name: "España" }, { code: "BR", name: "Brasil" },
  { code: "VE", name: "Venezuela" }, { code: "PE", name: "Perú" }, { code: "CL", name: "Chile" },
  { code: "EC", name: "Ecuador" }, { code: "GT", name: "Guatemala" }, { code: "BO", name: "Bolivia" },
  { code: "DO", name: "R. Dom." }, { code: "HN", name: "Honduras" }, { code: "CR", name: "Costa Rica" },
  { code: "PA", name: "Panamá" }, { code: "UY", name: "Uruguay" }, { code: "PY", name: "Paraguay" },
  { code: "FR", name: "Francia" }, { code: "DE", name: "Alemania" }, { code: "IT", name: "Italia" },
  { code: "PT", name: "Portugal" }, { code: "TR", name: "Turquía" }, { code: "RU", name: "Rusia" },
  { code: "JP", name: "Japón" }, { code: "KR", name: "Corea" }, { code: "CN", name: "China" },
  { code: "IN", name: "India" }, { code: "PH", name: "Filipinas" }, { code: "ID", name: "Indonesia" },
];

function generatePlayer(index: number) {
  const seed = index + 12345;
  const firstName = FIRST_NAMES[Math.floor(seededRand(seed * 1) * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(seededRand(seed * 2) * LAST_NAMES.length)];
  const suffix = seededRand(seed * 3) > 0.6 ? SUFFIXES[Math.floor(seededRand(seed * 4) * SUFFIXES.length)] : "";
  const name = `${firstName}${lastName}${suffix}`;

  const avatarIcon = AVATAR_ICONS[Math.floor(seededRand(seed * 5) * AVATAR_ICONS.length)];
  const avatarColor = AVATAR_COLORS[Math.floor(seededRand(seed * 6) * AVATAR_COLORS.length)];
  const country = COUNTRIES[Math.floor(seededRand(seed * 11) * COUNTRIES.length)];
  const usePhoto = seededRand(seed * 13) > 0.25;
  const photoNum = Math.floor(seededRand(seed * 14) * 70) + 1;
  const photoUrl = usePhoto ? `https://i.pravatar.cc/150?img=${photoNum}` : undefined;
  
  // Rank distribution
  let rankIdx = 0;
  let level = 1;
  if (index < 10) {
    rankIdx = seededRand(seed * 7) > 0.5 ? 11 : 10;
    level = Math.floor(seededRand(seed * 8) * 50) + 150;
  } else if (index < 100) {
    rankIdx = Math.floor(seededRand(seed * 7) * 3) + 8;
    level = Math.floor(seededRand(seed * 8) * 50) + 100;
  } else if (index < 1000) {
    rankIdx = Math.floor(seededRand(seed * 7) * 4) + 5;
    level = Math.floor(seededRand(seed * 8) * 60) + 40;
  } else if (index < 5000) {
    rankIdx = Math.floor(seededRand(seed * 7) * 4) + 2;
    level = Math.floor(seededRand(seed * 8) * 40) + 10;
  } else {
    rankIdx = Math.floor(seededRand(seed * 7) * 3);
    level = Math.floor(seededRand(seed * 8) * 20) + 1;
  }

  return {
    id: `global_${index}`,
    name,
    avatarIcon,
    avatarColor,
    photoUrl,
    country,
    rank: rankIdx,
    division: Math.floor(seededRand(seed * 9) * 5),
    stars: Math.floor(seededRand(seed * 10) * 5) + 1,
    level,
    position: index + 1,
    isMe: false,
  };
}

export default function RankedScreen() {
  const insets = useSafeAreaInsets();
  const { profile, level, addOutgoingFriendRequest } = useProfile();
  const [profilePlayer, setProfilePlayer] = useState<PlayerProfileData | null>(null);
  const [sentFriendIds, setSentFriendIds] = useState<Set<string>>(new Set());
  const T = useT();
  const isDark = profile.darkMode !== false;
  const themeColors = isDark ? Colors : LightColors;
  const rankInfo = useMemo(() => getRankInfo(profile.rankedProfile), [profile.rankedProfile]);
  const season = useMemo(() => getCurrentSeason(), []);
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  
  const [visibleCount, setVisibleCount] = useState(50);
  const totalPlayers = 10000;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const MY_POSITION = 9487;

  // Score formula: rank×10000 + division×1000 + stars  (higher = better)
  // division 4 = División 1 (best within rank), division 0 = División 5 (lowest)
  const rankScore = (rank: number, division: number, stars: number) =>
    rank * 10000 + division * 1000 + stars;

  const visiblePlayers = useMemo(() => {
    const players = Array.from({ length: Math.min(visibleCount, totalPlayers) }).map((_, i) => generatePlayer(i));

    // Sort highest score first so División 1 appears above División 5,
    // and within the same division more stars ranks higher.
    players.sort((a, b) =>
      rankScore(b.rank, b.division, b.stars) - rankScore(a.rank, a.division, a.stars)
    );

    // Re-assign sequential positions after sorting
    players.forEach((p, i) => { p.position = i + 1; });

    // Inject the current player at the fixed position (if loaded that far)
    if (visibleCount >= MY_POSITION + 1) {
      players[MY_POSITION] = {
        id: "player_me",
        name: profile.name || T("you"),
        avatarIcon: "person",
        avatarColor: AVATAR_COLORS[2],
        photoUrl: profile.photoUri ?? undefined,
        country: { code: "MX", name: "México" },
        rank: profile.rankedProfile.rank,
        division: profile.rankedProfile.division,
        stars: profile.rankedProfile.stars,
        level: level ?? 1,
        position: MY_POSITION + 1,
        isMe: true,
      };
    }
    return players;
  }, [visibleCount, profile.name, profile.rankedProfile, level]);

  const loadMore = useCallback(() => {
    if (visibleCount < totalPlayers) {
      setVisibleCount(prev => Math.min(prev + 50, totalPlayers));
    }
  }, [visibleCount]);

  const renderStars = (current: number, max: number, size = 24) => {
    return (
      <View style={styles.starsRow}>
        {Array.from({ length: max }).map((_, i) => (
          <Ionicons
            key={i}
            name={i < current ? "star" : "star-outline"}
            size={size}
            color={i < current ? rankInfo.color : themeColors.textDim}
            style={styles.starIcon}
          />
        ))}
      </View>
    );
  };

  const nextRankProgress = (profile.rankedProfile.stars / profile.rankedProfile.maxStars) * 100;

  const openPlayerProfile = useCallback((item: any) => {
    if (item.isMe) return;
    const rankLabel = `${T(`rank${RANKS[item.rank]}` as any)} ${DIVISIONS[item.division]}`;
    const seed = item.position * 31337;
    const wins = Math.floor(50 + seededRand(seed * 100) * 800);
    const winRate = Math.round(40 + seededRand(seed * 200) * 45);
    const alreadySent = sentFriendIds.has(item.id);
    const data: PlayerProfileData = {
      name: item.name,
      level: item.level,
      wins,
      score: item.stars,
      avatarIcon: item.avatarIcon,
      avatarColor: item.avatarColor,
      photoUrl: item.photoUrl,
      titleName: rankLabel,
      rank: item.position,
      rankName: rankLabel,
      country: item.country,
      winRate,
      isFriend: false,
      requestSent: alreadySent,
    };
    setProfilePlayer(data);
  }, [T, sentFriendIds]);

  const handleAddFriend = useCallback((_name: string) => {
    if (!profilePlayer) return;
    const playerId = `ranked_${profilePlayer.name.replace(/\s/g, "_")}`;
    setSentFriendIds(prev => new Set([...prev, playerId]));
    addOutgoingFriendRequest({ id: playerId, name: profilePlayer.name, level: profilePlayer.level, avatarIcon: profilePlayer.avatarIcon, avatarColor: profilePlayer.avatarColor, photoUrl: profilePlayer.photoUrl });
    setProfilePlayer(prev => prev ? { ...prev, requestSent: true } : prev);
  }, [profilePlayer, addOutgoingFriendRequest]);

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isMe = item.isMe === true;
    return (
      <Pressable
        key={item.id}
        onPress={() => openPlayerProfile(item)}
        style={({ pressed }) => [
          styles.rankingItem,
          { backgroundColor: isMe ? RANK_COLORS[item.rank] + "22" : themeColors.surface },
          isMe && { borderWidth: 1.5, borderColor: RANK_COLORS[item.rank] + "88" },
          !isMe && pressed && { opacity: 0.75 },
        ]}
      >
        <View style={styles.rankingPlace}>
          {index < 3 && !isMe ? (
            <Ionicons name="medal" size={24} color={index === 0 ? "#D4AF37" : index === 1 ? "#C0C0C0" : "#CD7F32"} />
          ) : (
            <Text style={[styles.rankNumber, { color: isMe ? RANK_COLORS[item.rank] : themeColors.textMuted }]}>
              #{item.position}
            </Text>
          )}
        </View>
        
        <View style={[styles.avatarRing, { borderColor: RANK_COLORS[item.rank] }]}>
          {item.photoUrl ? (
            <Image source={{ uri: item.photoUrl }} style={styles.avatarSmallPhoto} />
          ) : (
            <View style={[styles.avatarSmall, { backgroundColor: item.avatarColor }]}>
              <Ionicons name={item.avatarIcon as any} size={16} color="#fff" />
            </View>
          )}
        </View>
        
        <View style={styles.rankingInfo}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={[styles.rankingName, { color: isMe ? RANK_COLORS[item.rank] : themeColors.text }]}>{item.name}</Text>
            {isMe && <Ionicons name="person" size={11} color={RANK_COLORS[item.rank]} />}
          </View>
          <View style={styles.rankingMetaRow}>
            <Text style={[styles.rankingMeta, { color: themeColors.textMuted }]}>
              {T(`rank${RANKS[item.rank]}` as any)} {DIVISIONS[item.division]}
            </Text>
            {item.country && (
              <View style={[styles.countryBadge, { backgroundColor: themeColors.surface === themeColors.background ? "#ffffff18" : "#00000015" }]}>
                <Text style={[styles.countryCode, { color: themeColors.textMuted }]}>{item.country.code}</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.rankBadgeSmall}>
          <Ionicons name={RANK_ICONS[item.rank] as any} size={14} color={RANK_COLORS[item.rank]} />
          <Text style={[styles.rankBadgeTextSmall, { color: RANK_COLORS[item.rank] }]}>Lv.{item.level}</Text>
        </View>
      </Pressable>
    );
  };

  const Header = () => (
    <>
      {/* Header / Back */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={themeColors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>{T("worldRanking") || "RANKING MUNDIAL"}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Season Banner */}
      <View style={styles.seasonBanner}>
        <LinearGradient
          colors={["#D4AF37", "#B8860B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.seasonBadge}
        >
          <Text style={styles.seasonTitle}>TEMPORADA {season.number}: {season.name.toUpperCase()}</Text>
        </LinearGradient>
        <View style={styles.seasonMeta}>
          <View style={styles.timerRow}>
            <Ionicons name="time-outline" size={16} color={themeColors.textMuted} />
            <Text style={[styles.timerText, { color: themeColors.textMuted }]}>
              {season.daysRemaining} {T("daysRemaining") || "días restantes"}
            </Text>
          </View>
          <Pressable onPress={() => setShowRewardsModal(true)} style={styles.rewardsLink}>
            <Text style={styles.rewardsLinkText}>{T("viewRewards") || "Ver recompensas"}</Text>
            <Ionicons name="chevron-forward" size={14} color="#D4AF37" />
          </Pressable>
        </View>
      </View>

      {/* Section label: CLASIFICATORIA */}
      <View style={styles.sectionModeBadge}>
        <LinearGradient colors={["#D4AF37", "#A07800"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modeBadgeGrad}>
          <Ionicons name="trophy" size={14} color="#1a0a00" />
          <Text style={styles.modeBadgeTxt}>{T("modeRanked" as any)}</Text>
        </LinearGradient>
        <Text style={[styles.modeBadgeSubTxt, { color: themeColors.textMuted }]}>{T("myRank" as any) || "Mi rango actual"}</Text>
      </View>

      {/* Current Rank Card */}
      <View style={[styles.rankCard, { backgroundColor: themeColors.card, borderColor: "#D4AF37", borderWidth: 2 }]}>
        <LinearGradient
          colors={[rankInfo.color + "33", "transparent"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        
        <View style={styles.rankCardTop}>
          <View style={styles.playerAvatarContainer}>
            <AvatarDisplay
              avatarId={profile.avatarId}
              frameId={profile.selectedFrameId}
              photoUri={profile.photoUri}
              size={80}
            />
          </View>
          <View style={styles.rankBadgeContainer}>
            <View style={[styles.rankIconCircle, { backgroundColor: rankInfo.color + "22", borderColor: rankInfo.color }]}>
              <Ionicons name={RANK_ICONS[profile.rankedProfile.rank] as any} size={50} color={rankInfo.color} />
            </View>
          </View>
        </View>

        <Text style={[styles.rankName, { color: rankInfo.color }]}>
          {(T(`rank${RANKS[profile.rankedProfile.rank]}` as any) || rankInfo.rankName).toUpperCase()} {rankInfo.divisionName}
        </Text>
        
        {renderStars(profile.rankedProfile.stars, profile.rankedProfile.maxStars, 28)}
        
        <View style={styles.progressContainer}>
          <View style={[styles.progressBarBg, { backgroundColor: themeColors.surface }]}>
            <View style={[styles.progressBarFill, { width: `${nextRankProgress}%`, backgroundColor: rankInfo.color }]} />
          </View>
          <Text style={[styles.progressText, { color: themeColors.textMuted }]}>
            {profile.rankedProfile.stars} / {profile.rankedProfile.maxStars} {T("stars") || "estrellas"}
          </Text>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: themeColors.text }]}>{profile.rankedProfile.totalWins}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>{T("wins").toUpperCase()}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: themeColors.text }]}>{profile.rankedProfile.totalLosses}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>{T("losses").toUpperCase()}</Text>
          </View>
        </View>
      </View>

      {/* Global Ranking Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="globe" size={20} color="#D4AF37" />
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{T("worldRanking") || "RANKING MUNDIAL"}</Text>
        </View>
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <LinearGradient
        colors={isDark ? ["#0a0a1a", "#1a0a2e", "#0a0a1a"] : ["#f0f0f5", "#e6e6f0", "#f0f0f5"]}
        style={StyleSheet.absoluteFill}
      />
      
      <FlatList
        data={visiblePlayers}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingTop: topPad + 10, paddingBottom: botPad + 100 }}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={Header}
        ListFooterComponent={
          visibleCount < totalPlayers ? (
            <View style={{ padding: 20, alignItems: "center" }}>
              <ActivityIndicator color={Colors.gold} />
            </View>
          ) : null
        }
      />

      {/* Rewards Modal */}
      <Modal visible={showRewardsModal} transparent animationType="fade" onRequestClose={() => setShowRewardsModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowRewardsModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>{T("seasonRewards") || "Recompensas de Temporada"}</Text>
            <FlatList
              data={RANKS}
              keyExtractor={item => item}
              renderItem={({ item: rank, index: idx }) => {
                const reward = getSeasonRewardsForRank(idx);
                return (
                  <View style={styles.rewardItem}>
                    <View style={[styles.rewardRankIcon, { backgroundColor: RANK_COLORS[idx] + "22" }]}>
                      <Ionicons name={RANK_ICONS[idx] as any} size={20} color={RANK_COLORS[idx]} />
                    </View>
                    <View style={styles.rewardInfo}>
                      <Text style={[styles.rewardRankName, { color: themeColors.text }]}>{T(`rank${rank}` as any) || rank}</Text>
                      <Text style={[styles.rewardText, { color: themeColors.textMuted }]}>
                        {reward.coins} coins {reward.items.length > 0 ? "+ Items" : ""} {reward.title ? `+ Título` : ""}
                      </Text>
                    </View>
                  </View>
                );
              }}
              style={styles.rewardsList}
            />
            <Pressable onPress={() => setShowRewardsModal(false)} style={styles.closeModalBtn}>
              <Text style={styles.closeModalBtnText}>{T("close") || "Cerrar"}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Player Profile Modal */}
      <PlayerProfileModal
        visible={!!profilePlayer}
        player={profilePlayer}
        onClose={() => setProfilePlayer(null)}
        onAddFriend={handleAddFriend}
      />

      {/* Play Button Fixed Bottom */}
      <View style={[styles.footer, { paddingBottom: botPad + 20, backgroundColor: themeColors.background + "ee" }]}>
        <Pressable
          onPress={() => router.push({ pathname: "/online-lobby", params: { mode: "ranked", playerCount: "4", directSearch: "true" } })}
          style={({ pressed }) => [
            styles.playBtn,
            { backgroundColor: rankInfo.color },
            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
          ]}
        >
          <Ionicons name="play" size={24} color="#000" />
          <Text style={styles.playBtnText}>{T("playRanked").toUpperCase()}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, marginBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 24 },
  
  seasonBanner: {
    marginHorizontal: 16, marginBottom: 20,
    alignItems: "center",
  },
  seasonBadge: {
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, marginBottom: 8,
  },
  seasonTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 14, color: "#000" },
  seasonMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", paddingHorizontal: 4 },
  timerRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  timerText: { fontFamily: "Nunito_700Bold", fontSize: 13 },
  rewardsLink: { flexDirection: "row", alignItems: "center", gap: 2 },
  rewardsLinkText: { fontFamily: "Nunito_800ExtraBold", fontSize: 13, color: "#D4AF37" },

  rankCard: {
    marginHorizontal: 16, borderRadius: 28, padding: 24,
    alignItems: "center", borderWidth: 1, overflow: "hidden",
    elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12,
  },
  rankCardTop: { flexDirection: "row", alignItems: "center", gap: 20, marginBottom: 16 },
  playerAvatarContainer: {
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6,
  },
  rankBadgeContainer: {
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6,
  },
  rankIconCircle: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2,
  },
  rankName: { fontFamily: "Nunito_800ExtraBold", fontSize: 32, marginBottom: 8 },
  starsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  starIcon: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  
  progressContainer: { width: "100%", marginBottom: 24, alignItems: "center" },
  progressBarBg: { width: "100%", height: 10, borderRadius: 5, overflow: "hidden", marginBottom: 6 },
  progressBarFill: { height: "100%", borderRadius: 5 },
  progressText: { fontFamily: "Nunito_700Bold", fontSize: 12 },

  statsRow: { flexDirection: "row", alignItems: "center", gap: 40 },
  statItem: { alignItems: "center" },
  statValue: { fontFamily: "Nunito_800ExtraBold", fontSize: 24 },
  statLabel: { fontFamily: "Nunito_700Bold", fontSize: 11, letterSpacing: 1 },
  statDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.15)" },
  
  section: { paddingHorizontal: 16, marginTop: 32 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  sectionModeBadge: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  modeBadgeGrad: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  modeBadgeTxt: { fontFamily: "Nunito_800ExtraBold", fontSize: 13, color: "#1a0a00", letterSpacing: 1.5 },
  modeBadgeSubTxt: { fontFamily: "Nunito_700Bold", fontSize: 13 },
  sectionTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 20 },
  rankingItem: {
    flexDirection: "row", alignItems: "center", padding: 14,
    borderRadius: 18, marginBottom: 10, gap: 12,
    elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  rankingPlace: { width: 36, alignItems: "center" },
  rankNumber: { fontFamily: "Nunito_800ExtraBold", fontSize: 16 },
  avatarRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  avatarSmall: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarSmallPhoto: { width: 36, height: 36, borderRadius: 18 },
  rankingInfo: { flex: 1 },
  rankingName: { fontFamily: "Nunito_800ExtraBold", fontSize: 16 },
  rankingMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  rankingMeta: { fontFamily: "Nunito_700Bold", fontSize: 13 },
  rankBadgeSmall: { 
    flexDirection: "row", alignItems: "center", gap: 4, 
    backgroundColor: "rgba(0,0,0,0.2)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10
  },
  rankBadgeTextSmall: { fontFamily: "Nunito_800ExtraBold", fontSize: 12 },
  countryBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  countryCode: { fontFamily: "Nunito_700Bold", fontSize: 10, letterSpacing: 0.5 },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { width: "100%", borderRadius: 24, padding: 24, maxHeight: "80%" },
  modalTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 22, marginBottom: 20, textAlign: "center" },
  rewardsList: { marginBottom: 20 },
  rewardItem: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  rewardRankIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  rewardInfo: { flex: 1 },
  rewardRankName: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, marginBottom: 2 },
  rewardText: { fontFamily: "Nunito_700Bold", fontSize: 14 },
  closeModalBtn: { backgroundColor: "#D4AF37", paddingVertical: 14, borderRadius: 16, alignItems: "center" },
  closeModalBtnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: "#000" },

  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 16,
  },
  playBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 12, height: 64, borderRadius: 32,
    elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10,
  },
  playBtnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: "#000" },
});

