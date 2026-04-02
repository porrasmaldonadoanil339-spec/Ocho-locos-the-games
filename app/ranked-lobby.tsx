import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView, Platform, Modal,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { useT } from "../hooks/useT";
import { useProfile } from "../context/ProfileContext";
import { playButton, startMenuMusic } from "../lib/audioManager";
import { getLocalizedRankInfo } from "../lib/ranked";
import { CPU_PROFILES } from "../lib/cpuProfiles";

const AVATAR_COLORS = ["#E74C3C","#9B59B6","#E67E22","#2ECC71","#1A8FC1","#D4AF37","#C0392B","#27AE60","#8E44AD","#F39C12"];
const RANK_GOLD = "#D4AF37";

// Simulated friends list
const SIMULATED_FRIENDS = [
  { id: "f1", name: "CarlosX99",   avatarColor: "#E74C3C", avatarIcon: "person", level: 18, status: "available" as const, winRate: 62 },
  { id: "f2", name: "LunaMaster",  avatarColor: "#9B59B6", avatarIcon: "person", level: 24, status: "online" as const,    winRate: 71 },
  { id: "f3", name: "FireStrike",  avatarColor: "#E67E22", avatarIcon: "person", level: 31, status: "playing" as const,   winRate: 58 },
  { id: "f4", name: "ShadowKing",  avatarColor: "#1A8FC1", avatarIcon: "person", level: 15, status: "available" as const, winRate: 55 },
  { id: "f5", name: "CristinaPro", avatarColor: "#2ECC71", avatarIcon: "person", level: 22, status: "available" as const, winRate: 67 },
  { id: "f6", name: "NightWolf",   avatarColor: "#C0392B", avatarIcon: "person", level: 12, status: "online" as const,    winRate: 48 },
  { id: "f7", name: "TigerBeat",   avatarColor: "#27AE60", avatarIcon: "person", level: 35, status: "playing" as const,   winRate: 79 },
];

type FriendStatus = "available" | "online" | "playing";
interface FriendSlot { id: string; name: string; avatarColor: string; avatarIcon: string; level: number; winRate: number; status?: FriendStatus; isMe?: boolean; }

function StatusDot({ status }: { status: FriendStatus }) {
  const color = status === "available" ? "#2ECC71" : status === "online" ? "#F39C12" : "#E74C3C";
  return <View style={[dotStyles.dot, { backgroundColor: color }]} />;
}
const dotStyles = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4 },
});

function SearchingDots() {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const iv = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(iv);
  }, []);
  return <Text style={srStyles.dots}>{dots}</Text>;
}
const srStyles = StyleSheet.create({ dots: { fontFamily: "Nunito_700Bold", fontSize: 22, color: RANK_GOLD } });

export default function RankedLobbyScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { profile, level } = useProfile();
  const T = useT();

  const lang = profile.language ?? "es";
  const rankInfo = getLocalizedRankInfo(profile.rankedProfile, lang);
  const ACCENT = rankInfo.color;

  const [slots, setSlots] = useState<(FriendSlot | null)[]>([null, null, null]);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [invitingSlotIdx, setInvitingSlotIdx] = useState(0);
  const [invitedIds, setInvitedIds] = useState<string[]>([]);
  const [phase, setPhase] = useState<"lobby" | "searching" | "found">("lobby");
  const [searchProgress, setSearchProgress] = useState(0);

  const mySlot: FriendSlot = {
    id: "me",
    name: profile.name || T("you"),
    avatarColor: AVATAR_COLORS[0],
    avatarIcon: "person",
    level: level || 1,
    winRate: Math.min(88, 40 + (level || 1)),
    isMe: true,
  };

  const filledSlots = slots.filter(Boolean).length;
  const totalPlayers = 1 + filledSlots;
  const canSearch = totalPlayers >= 1;

  const handleInvitePress = (slotIdx: number) => {
    setInvitingSlotIdx(slotIdx);
    setShowFriendModal(true);
  };

  const handleInviteFriend = (friend: typeof SIMULATED_FRIENDS[0]) => {
    if (invitedIds.includes(friend.id)) return;
    const newSlots = [...slots];
    const emptyIdx = newSlots.findIndex(s => !s);
    if (emptyIdx < 0) return;
    newSlots[emptyIdx] = {
      id: friend.id, name: friend.name,
      avatarColor: friend.avatarColor, avatarIcon: friend.avatarIcon,
      level: friend.level, winRate: friend.winRate,
    };
    setSlots(newSlots);
    setInvitedIds(prev => [...prev, friend.id]);
    setShowFriendModal(false);
  };

  const handleRemoveSlot = (idx: number) => {
    const newSlots = [...slots];
    const removed = newSlots[idx];
    newSlots[idx] = null;
    setSlots(newSlots);
    if (removed) setInvitedIds(prev => prev.filter(id => id !== removed.id));
  };

  useEffect(() => {
    startMenuMusic().catch(() => {});
  }, []);

  const handleSearch = useCallback(async () => {
    await playButton().catch(() => {});
    setPhase("searching");
    let progress = 0;
    const iv = setInterval(() => {
      progress += Math.random() * 8 + 4;
      setSearchProgress(Math.min(progress, 95));
    }, 400);
    setTimeout(() => {
      clearInterval(iv);
      setSearchProgress(100);
      setPhase("found");
    }, 4000 + Math.random() * 3000);
  }, []);

  const handleStartMatch = useCallback(async () => {
    await playButton().catch(() => {});
    router.replace({ pathname: "/game-online", params: { count: "4", mode: "ranked", skipLobby: "true" } });
  }, []);

  const statusLabel = (s: FriendStatus) => s === "available" ? T("statusAvailable" as any) : s === "online" ? T("statusOnline" as any) : T("statusPlaying" as any);
  const statusOrder = (s: FriendStatus) => s === "available" ? 0 : s === "online" ? 1 : 2;
  const sortedFriends = [...SIMULATED_FRIENDS].sort((a, b) => statusOrder(a.status) - statusOrder(b.status));

  const renderSlot = (slot: FriendSlot | null, idx: number) => {
    if (slot) {
      return (
        <Animated.View key={idx} entering={FadeIn.duration(300)} style={styles.playerCard}>
          <LinearGradient colors={[slot.avatarColor + "22", slot.avatarColor + "08"]} style={StyleSheet.absoluteFill} />
          <View style={[styles.playerAvatar, { backgroundColor: slot.avatarColor + "33", borderColor: slot.avatarColor }]}>
            <Ionicons name={slot.avatarIcon as any} size={22} color={slot.avatarColor} />
            {slot.isMe && <View style={styles.meTag}><Text style={styles.meTxt}>TÚ</Text></View>}
          </View>
          <Text style={styles.playerName} numberOfLines={1}>{slot.name}</Text>
          <Text style={styles.playerLevel}>Nv. {slot.level} · {slot.winRate}%WR</Text>
          {!slot.isMe && (
            <Pressable onPress={() => handleRemoveSlot(idx)} style={styles.removeBtn}>
              <Ionicons name="close" size={12} color="rgba(255,255,255,0.5)" />
            </Pressable>
          )}
        </Animated.View>
      );
    }

    return (
      <Pressable key={idx} onPress={() => handleInvitePress(idx)} style={styles.emptySlot}>
        <View style={styles.addCircle}>
          <Ionicons name="add" size={24} color={ACCENT} />
        </View>
        <Text style={[styles.addLabel, { color: ACCENT + "88" }]}>Invitar amigo</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <LinearGradient colors={["#041008", "#061510", "#041008"]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.gold} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>CLASIFICATORIA</Text>
          <Text style={[styles.headerRank, { color: ACCENT }]}>{rankInfo.displayName}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {phase === "lobby" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: botPad + 16 }} showsVerticalScrollIndicator={false}>
          {/* My slot + teammates */}
          <Text style={styles.sectionTitle}>MI EQUIPO</Text>
          <View style={styles.slotsGrid}>
            {/* My slot */}
            {renderSlot(mySlot, -1)}
            {/* Invitable slots */}
            {slots.map((slot, i) => renderSlot(slot, i))}
          </View>

          {/* Player count info */}
          <View style={styles.countInfo}>
            <Ionicons name="people" size={14} color="rgba(255,255,255,0.4)" />
            <Text style={styles.countTxt}>{totalPlayers} jugador{totalPlayers !== 1 ? "es" : ""} · mínimo 1 para buscar · máximo 4</Text>
          </View>

          {/* Search button */}
          <Pressable onPress={handleSearch} style={styles.searchBtn}>
            <LinearGradient
              colors={[ACCENT, ACCENT + "BB"]}
              style={styles.searchGrad}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Ionicons name="search" size={20} color="#fff" />
              <Text style={styles.searchTxt}>BUSCAR PARTIDA</Text>
            </LinearGradient>
          </Pressable>

          {/* Info */}
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.35)" />
            <Text style={styles.infoTxt}>El sistema buscará rivales con rango similar al tuyo</Text>
          </View>
          <View style={[styles.infoRow, { marginTop: 6 }]}>
            <Ionicons name="hardware-chip-outline" size={14} color={ACCENT + "88"} />
            <Text style={[styles.infoTxt, { color: ACCENT + "99" }]}>Los slots vacíos se rellenarán con bots si no hay suficientes jugadores</Text>
          </View>
        </ScrollView>
      )}

      {phase === "searching" && (
        <View style={styles.searchingWrap}>
          <Animated.View entering={FadeIn.duration(400)}>
            <View style={styles.searchingIcon}>
              <Ionicons name={rankInfo.icon as any} size={40} color={rankInfo.color} />
            </View>
            <Text style={styles.searchingTitle}>Buscando partida</Text>
            <View style={styles.dotsRow}>
              <SearchingDots />
            </View>
            <Text style={styles.searchingRank}>Tu rango: <Text style={{ color: ACCENT }}>{rankInfo.displayName}</Text></Text>
            <View style={styles.progressBarWrap}>
              <View style={[styles.progressBar, { width: `${searchProgress}%` as any, backgroundColor: ACCENT }]} />
            </View>
            <Text style={styles.progressTxt}>Buscando rivales con ranking similar...</Text>
            <Pressable onPress={() => setPhase("lobby")} style={styles.cancelBtn}>
              <Text style={styles.cancelTxt}>Cancelar</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}

      {phase === "found" && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.foundWrap}>
          <View style={styles.foundIcon}>
            <Ionicons name="checkmark-circle" size={56} color="#2ECC71" />
          </View>
          <Text style={styles.foundTitle}>¡Partida encontrada!</Text>
          <Text style={styles.foundSub}>Rivales con rango similar han sido emparejados</Text>
          <View style={styles.foundRankRow}>
            <Ionicons name={rankInfo.icon as any} size={18} color={rankInfo.color} />
            <Text style={[styles.foundRankTxt, { color: ACCENT }]}>{rankInfo.displayName}</Text>
          </View>
          <Pressable onPress={handleStartMatch} style={styles.startBtn}>
            <LinearGradient colors={["#2ECC71", "#1a9a50"]} style={styles.startGrad}>
              <Ionicons name="play" size={20} color="#fff" />
              <Text style={styles.startTxt}>COMENZAR PARTIDA</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      )}

      {/* Friend invite modal */}
      <Modal visible={showFriendModal} transparent animationType="slide" onRequestClose={() => setShowFriendModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowFriendModal(false)}>
          <Pressable style={styles.friendModal} onPress={() => {}}>
            <LinearGradient colors={["#0A1A0A", "#061208"]} style={StyleSheet.absoluteFill} />
            <View style={styles.friendModalHeader}>
              <Text style={styles.friendModalTitle}>INVITAR AMIGO</Text>
              <Pressable onPress={() => setShowFriendModal(false)}>
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
              </Pressable>
            </View>
            <ScrollView style={styles.friendList} showsVerticalScrollIndicator={false}>
              {sortedFriends.map(friend => {
                const isInvited = invitedIds.includes(friend.id);
                const isPlaying = friend.status === "playing";
                return (
                  <Pressable
                    key={friend.id}
                    onPress={() => !isInvited && !isPlaying && handleInviteFriend(friend)}
                    style={[styles.friendRow, (isInvited || isPlaying) && { opacity: 0.5 }]}
                  >
                    <View style={[styles.friendAvatar, { backgroundColor: friend.avatarColor + "33", borderColor: friend.avatarColor }]}>
                      <Ionicons name={friend.avatarIcon as any} size={18} color={friend.avatarColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.friendNameRow}>
                        <Text style={styles.friendName}>{friend.name}</Text>
                        <StatusDot status={friend.status} />
                      </View>
                      <Text style={styles.friendMeta}>Nv. {friend.level} · {statusLabel(friend.status)}</Text>
                    </View>
                    {isInvited ? (
                      <Ionicons name="checkmark-circle" size={20} color="#2ECC71" />
                    ) : isPlaying ? (
                      <Ionicons name="game-controller" size={18} color="#E74C3C" />
                    ) : (
                      <Pressable onPress={() => handleInviteFriend(friend)} style={[styles.inviteBtn, { backgroundColor: ACCENT + "33", borderColor: ACCENT + "66" }]}>
                        <Text style={[styles.inviteBtnTxt, { color: ACCENT }]}>Invitar</Text>
                      </Pressable>
                    )}
                  </Pressable>
                );
              })}
              {sortedFriends.length === 0 && (
                <View style={styles.noFriends}>
                  <Ionicons name="people-outline" size={36} color="rgba(255,255,255,0.2)" />
                  <Text style={styles.noFriendsTxt}>No tienes amigos disponibles</Text>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center",
  },
  headerCenter: { alignItems: "center" },
  headerTitle: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 17,
    color: Colors.gold, letterSpacing: 2,
  },
  headerRank: { fontFamily: "Nunito_700Bold", fontSize: 12, letterSpacing: 1 },
  sectionTitle: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 11,
    color: "rgba(255,255,255,0.4)", letterSpacing: 2,
    marginHorizontal: 16, marginTop: 8, marginBottom: 10,
  },
  slotsGrid: { paddingHorizontal: 16, gap: 8 },
  playerCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14, paddingVertical: 12, gap: 12, overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)", position: "relative",
  },
  playerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center", borderWidth: 2, position: "relative",
  },
  meTag: {
    position: "absolute", bottom: -2, right: -4,
    backgroundColor: Colors.gold, borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1,
  },
  meTxt: { fontFamily: "Nunito_800ExtraBold", fontSize: 7, color: "#000" },
  playerName: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "#fff", flex: 1 },
  playerLevel: { fontFamily: "Nunito_700Bold", fontSize: 11, color: "rgba(255,255,255,0.5)" },
  removeBtn: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center",
  },
  emptySlot: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14, paddingVertical: 12, gap: 12,
    borderStyle: "dashed", backgroundColor: "rgba(255,255,255,0.02)",
  },
  addCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
  },
  addLabel: { fontFamily: "Nunito_700Bold", fontSize: 13 },
  countInfo: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
  },
  countTxt: { fontFamily: "Nunito_700Bold", fontSize: 11, color: "rgba(255,255,255,0.4)" },
  searchBtn: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, overflow: "hidden" },
  searchGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16,
  },
  searchTxt: { fontFamily: "Nunito_800ExtraBold", fontSize: 17, color: "#fff", letterSpacing: 1 },
  infoRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginHorizontal: 16, marginTop: 12,
  },
  infoTxt: { fontFamily: "Nunito_700Bold", fontSize: 11, color: "rgba(255,255,255,0.35)" },
  searchingWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  searchingIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: RANK_GOLD + "22", borderWidth: 2, borderColor: RANK_GOLD + "66",
    alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 20,
  },
  searchingTitle: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: "#fff", textAlign: "center",
  },
  dotsRow: { flexDirection: "row", justifyContent: "center", marginTop: 4, marginBottom: 12 },
  searchingRank: {
    fontFamily: "Nunito_700Bold", fontSize: 14, color: "rgba(255,255,255,0.6)", textAlign: "center", marginBottom: 20,
  },
  progressBarWrap: {
    height: 6, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 3,
    overflow: "hidden", marginBottom: 10,
  },
  progressBar: { height: 6, borderRadius: 3 },
  progressTxt: {
    fontFamily: "Nunito_700Bold", fontSize: 12, color: "rgba(255,255,255,0.45)", textAlign: "center", marginBottom: 24,
  },
  cancelBtn: { alignSelf: "center", paddingVertical: 10, paddingHorizontal: 20 },
  cancelTxt: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "rgba(255,255,255,0.4)" },
  foundWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  foundIcon: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: "#2ECC7122", borderWidth: 2, borderColor: "#2ECC7166",
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  foundTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 24, color: "#fff", textAlign: "center", marginBottom: 8 },
  foundSub: {
    fontFamily: "Nunito_700Bold", fontSize: 13, color: "rgba(255,255,255,0.55)", textAlign: "center", marginBottom: 16,
  },
  foundRankRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 24 },
  foundRankTxt: { fontFamily: "Nunito_800ExtraBold", fontSize: 18 },
  startBtn: { width: "100%", borderRadius: 16, overflow: "hidden" },
  startGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16,
  },
  startTxt: { fontFamily: "Nunito_800ExtraBold", fontSize: 18, color: "#fff", letterSpacing: 1 },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end",
  },
  friendModal: {
    height: "70%", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: "hidden", borderTopWidth: 1.5, borderColor: "rgba(255,255,255,0.12)",
  },
  friendModalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)",
  },
  friendModalTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: "#fff", letterSpacing: 2 },
  friendList: { flex: 1 },
  friendRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
  },
  friendAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center", borderWidth: 2,
  },
  friendNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  friendName: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "#fff" },
  friendMeta: { fontFamily: "Nunito_700Bold", fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 },
  inviteBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1,
  },
  inviteBtnTxt: { fontFamily: "Nunito_700Bold", fontSize: 12 },
  noFriends: { alignItems: "center", padding: 40, gap: 12 },
  noFriendsTxt: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "rgba(255,255,255,0.35)" },
});
