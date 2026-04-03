import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  Modal, Platform, Dimensions, TextInput, BackHandler, Alert, Image,
} from "react-native";
import { io } from "socket.io-client";
import { useSwipeTabs } from "../hooks/useSwipeTabs";
import { useT } from "../hooks/useT";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withRepeat, withSequence, Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Colors, LightColors } from "../constants/colors";
import { useTheme } from "../hooks/useTheme";
import { useGame } from "../context/GameContext";
import { useProfile } from "../context/ProfileContext";
import { GAME_MODES, DIFFICULTIES, GameModeId, Difficulty } from "../lib/gameModes";
import { playButton, syncSettings } from "../lib/audioManager";
import { playSound } from "../lib/sounds";
import { modeName as getModeName, modeDesc as getModeDesc, diffName as getDiffName, diffDesc as getDiffDesc } from "../lib/achTranslations";
import type { Lang } from "../lib/i18n";
import { AvatarDisplay } from "../components/AvatarDisplay";
import { Challenge, getDailyChallenges, updateChallengeProgress, claimChallenge } from "../lib/challenges";
import { getRankInfo, RANKS, DIVISIONS } from "../lib/ranked";
import { FlatList } from "react-native";
import ChestOpeningModal from "../components/ChestOpeningModal";
import { ChestType, ChestReward, CHEST_CONFIG, getChestProgress } from "../lib/chestSystem";
import type { Chest } from "../lib/chestSystem";
import { ModeInfoModal } from "../components/ModeInfoModal";

const { width: SW } = Dimensions.get("window");

function FloatSuit({ suit, x, y, size, opacity, duration, isDark }: {
  suit: string; x: number; y: number; size: number; opacity: number; duration: number; isDark: boolean;
}) {
  const ty = useSharedValue(0);
  const rot = useSharedValue(0);
  const opac = useSharedValue(opacity);

  useEffect(() => {
    ty.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: duration * 0.8, easing: Easing.inOut(Easing.sin) }),
        withTiming(20, { duration: duration * 1.2, easing: Easing.inOut(Easing.sin) })
      ), -1, true
    );
    rot.value = withRepeat(
      withTiming(360, { duration: duration * 2, easing: Easing.linear }),
      -1, false
    );
    opac.value = withRepeat(
      withSequence(
        withTiming(opacity * 0.5, { duration: duration }),
        withTiming(opacity, { duration: duration })
      ), -1, true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: ty.value },
      { rotate: `${rot.value}deg` }
    ],
    position: "absolute",
    left: x * SW,
    top: y * 800,
    opacity: opac.value,
  }));

  const isRed = suit === "heart" || suit === "diamond";
  const iconName = suit as any;
  const color = isDark 
    ? (isRed ? "#C0392B" : "#ffffff") 
    : (isRed ? "#C0392B" : "#1a4a1a");

  return (
    <Animated.View style={[style, { pointerEvents: "none" } as any]}>
      <Ionicons name={iconName} size={size} color={color} />
    </Animated.View>
  );
}

function AnimatedBackground({ isDark }: { isDark: boolean }) {
  const baseOpacity = isDark ? 0.06 : 0.03;
  const positions = [
    { suit: "heart", x: 0.1, y: 0.15, size: 40, dur: 8000 },
    { suit: "leaf", x: 0.85, y: 0.1, size: 35, dur: 9500 },
    { suit: "diamond", x: 0.75, y: 0.5, size: 45, dur: 11000 },
    { suit: "flower", x: 0.05, y: 0.6, size: 38, dur: 12500 },
    { suit: "heart", x: 0.2, y: 0.85, size: 42, dur: 14000 },
    { suit: "star", x: 0.8, y: 0.8, size: 36, dur: 10500 },
  ];

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none", zIndex: -1 } as any]}>
      {positions.map((p, i) => (
        <FloatSuit 
          key={i} 
          suit={p.suit} 
          x={p.x} 
          y={p.y} 
          size={p.size} 
          opacity={baseOpacity} 
          duration={p.dur} 
          isDark={isDark} 
        />
      ))}
    </View>
  );
}

function RankedPreviewCard({ isDark }: { isDark: boolean }) {
    const { profile, level } = useProfile();
    const T = useT();
    const rp = profile.rankedProfile;
    const rankInfo = getRankInfo(rp);
    
    const isLocked = level < 5;

    const title = T("modeRanked" as any) || "CLASIFICATORIA";
    const subtitle = isLocked ? T("rankedLockedDesc" as any) : T("rankedUnlockedDesc" as any);
    const playText = T("playRanked");

    const breathe = useSharedValue(1);
    useEffect(() => {
      if (!isLocked) {
        breathe.value = withRepeat(
          withSequence(
            withTiming(1.04, { duration: 900, easing: Easing.inOut(Easing.sin) }),
            withTiming(1.0, { duration: 900, easing: Easing.inOut(Easing.sin) })
          ), -1
        );
      }
    }, [isLocked]);
    const btnAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: breathe.value }] }));

      return (
    <Pressable 
      onPress={() => { 
        if (isLocked) return;
        playButton().catch(() => {}); 
        router.push("/ranked"); 
      }}
      disabled={isLocked}
      style={({ pressed }) => [
        styles.rankedCard, 
        { borderColor: isLocked ? "#444" : "#D4AF37", borderWidth: 1.5 },
        pressed && !isLocked && { transform: [{ scale: 0.98 }] },
        isLocked && { opacity: 0.8 }
      ]}
    >
      <LinearGradient
        colors={isLocked ? ["#111", "#1a1a1a", "#111"] : ["#1a0a00", "#2a1400", "#1a0a00"]}
        style={styles.rankedGrad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />
      <View style={styles.rankedCardContent}>
        <View style={styles.rankedHeader}>
          <View style={styles.rankedIconContainer}>
            <Ionicons name={isLocked ? "lock-closed" : "trophy"} size={32} color={isLocked ? "#666" : "#D4AF37"} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.rankedTitle, isLocked && { color: "#888" }]}>{title}</Text>
            <Text style={[styles.rankedSubtitle, isLocked && { color: "#666" }]}>{subtitle}</Text>
          </View>
        </View>

        {!isLocked && (
          <View style={styles.rankedStatus}>
            <View style={[styles.rankBadge, { backgroundColor: rankInfo.color + "33" }]}>
              <Text style={[styles.rankBadgeText, { color: rankInfo.color }]}>
                {T(`rank${RANKS[rp.rank]}` as any) || rankInfo.rankName} {DIVISIONS[rp.division]}
              </Text>
            </View>
            <View style={styles.starsMini}>
              {Array.from({ length: rp.maxStars }).map((_, i) => (
                <Ionicons 
                  key={i} 
                  name={i < rp.stars ? "star" : "star-outline"} 
                  size={14} 
                  color={i < rp.stars ? rankInfo.color : "#D4AF3744"} 
                />
              ))}
            </View>
          </View>
        )}

        {!isLocked && (
          <Animated.View style={[styles.rankedAction, btnAnimStyle]}>
            <LinearGradient colors={["#D4AF37", "#B8860B"]} style={styles.rankedBtnGrad}>
              <Text style={styles.rankedBtnText}>{playText}</Text>
              <Ionicons name="chevron-forward" size={16} color="#000" />
            </LinearGradient>
          </Animated.View>
        )}
      </View>
    </Pressable>
  );
}

function StarRating({ stars, max = 5 }: { stars: number; max?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {Array.from({ length: max }).map((_, s) => (
        <Ionicons key={s} name="star" size={10} color={s < stars ? Colors.gold : Colors.textDim} />
      ))}
    </View>
  );
}

function DifficultyModal({ visible, onClose, onSelect, modeName }: {
  visible: boolean; onClose: () => void; onSelect: (d: Difficulty) => void; modeName: string;
}) {
  const RARITY_COLORS: Record<Difficulty, string> = {
    easy: "#95A5A6", normal: "#2196F3", intermediate: "#27AE60", hard: "#E74C3C", expert: "#A855F7",
  };
  const DIFF_ICONS: Record<Difficulty, string> = {
    easy: "leaf-outline", normal: "shield-outline", intermediate: "flame-outline",
    hard: "skull-outline", expert: "nuclear-outline",
  };
  const T_diff = useT();
  const { profile: diffProfile } = useProfile();
  const diffLang = (diffProfile.language ?? "es") as Lang;
  const subtitle = T_diff("selectDifficulty");
  const rewardLabel = T_diff("rewardLabel" as any);
  const timerLabel = T_diff("timer8s" as any);

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.modalBg} onPress={onClose}>
        <View style={styles.diffModal}>
          <LinearGradient colors={["#1a2f1a", Colors.surface]} style={styles.diffModalGrad}>
            <View style={styles.diffModalHandle} />
            <Text style={styles.diffTitle}>{modeName}</Text>
            <Text style={styles.diffSub}>{subtitle}</Text>
            <View style={styles.diffList}>
              {DIFFICULTIES.map((d) => {
                const color = RARITY_COLORS[d.id];
                const diffDescKey = { easy: "diffEasyDesc", normal: "diffNormalDesc", intermediate: "diffInterDesc", hard: "diffHardDesc", expert: "diffExpertDesc" }[d.id];
                  const detail = diffDescKey ? T_diff(diffDescKey as any) : "";
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => onSelect(d.id)}
                    style={({ pressed }) => [
                      styles.diffRow,
                      { borderColor: color + "44", backgroundColor: color + "0a" },
                      pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    <LinearGradient colors={[color + "20", "transparent"]} style={StyleSheet.absoluteFill} />
                    <View style={[styles.diffRowIcon, { backgroundColor: color + "22", borderColor: color + "44" }]}>
                      <Ionicons name={DIFF_ICONS[d.id] as any} size={22} color={color} />
                    </View>
                    <View style={styles.diffRowContent}>
                      <View style={styles.diffRowTop}>
                        <Text style={[styles.diffName, { color }]}>{getDiffName(d.id, diffLang) || d.name}</Text>
                        <StarRating stars={d.stars} />
                      </View>
                      <Text style={styles.diffRowDesc}>{detail}</Text>
                      <View style={styles.diffRowBottom}>
                        <View style={styles.diffReward}>
                          <Ionicons name="cash" size={10} color={Colors.gold} />
                          <Text style={styles.diffRewardText}>{rewardLabel} x{d.coinMultiplier}</Text>
                        </View>
                        {d.id === "expert" && (
                          <View style={[styles.expertBadge, { backgroundColor: color + "20" }]}>
                            <Ionicons name="timer" size={9} color={color} />
                            <Text style={[styles.expertBadgeText, { color }]}>{timerLabel}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={color + "88"} />
                  </Pressable>
                );
              })}
            </View>
          </LinearGradient>
        </View>
      </Pressable>
    </Modal>
  );
}

const CHEST_COLORS: Record<string, string> = { common: "#A0522D", rare: "#4A90E2", epic: "#9B59B6", legendary: "#D4AF37" };

// Daily reward modal
function DailyRewardModal({ visible, reward, onClaim }: {
  visible: boolean;
  reward: { coins: number; xp: number; label: string; icon: string; iconColor: string; chestType?: string } | null;
  onClaim: () => void;
}) {
  const T = useT();
  const sc = useSharedValue(0.7);
  const chestPulse = useSharedValue(1);
  useEffect(() => {
    if (visible) {
      sc.value = withSpring(1, { damping: 12 });
      if (reward?.chestType) {
        chestPulse.value = withRepeat(withSequence(
          withTiming(1.12, { duration: 700, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) })
        ), -1, true);
      }
    } else {
      sc.value = 0.7;
    }
  }, [visible]);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  const chestStyle = useAnimatedStyle(() => ({ transform: [{ scale: chestPulse.value }] }));
  if (!reward) return null;

  const isChestDay = !!reward.chestType;
  const chestColor = isChestDay ? (CHEST_COLORS[reward.chestType!] ?? "#A0522D") : reward.iconColor;
  const gradColors: [string, string] = isChestDay
    ? (reward.chestType === "legendary" ? ["#1a1200", "#2a1f00"] : reward.chestType === "epic" ? ["#1a0a2e", "#0a0520"] : reward.chestType === "rare" ? ["#0a1628", "#051020"] : ["#1a0f08", "#0d0806"])
    : ["#1a2e10", "#0a1a08"];

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.dailyOverlay}>
        <Animated.View style={[styles.dailyModal, animStyle]}>
          <LinearGradient colors={gradColors} style={styles.dailyGrad}>
            <Text style={styles.dailyTitle}>{T("dailyReward")}</Text>
            {isChestDay ? (
              <Animated.View style={[styles.dailyIconWrap, { borderColor: chestColor + "99", backgroundColor: chestColor + "18" }, chestStyle]}>
                <Ionicons name={reward.icon as any} size={52} color={chestColor} />
                <View style={{ position: "absolute", bottom: -6, right: -6, backgroundColor: chestColor, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ fontFamily: "Nunito_800ExtraBold", fontSize: 10, color: "#000" }}>
                    {reward.chestType === "legendary" ? "LEGENDARIO" : reward.chestType === "epic" ? "EPICO" : reward.chestType === "rare" ? "RARO" : "COMUN"}
                  </Text>
                </View>
              </Animated.View>
            ) : (
              <View style={[styles.dailyIconWrap, { borderColor: reward.iconColor + "88" }]}>
                <Ionicons name={reward.icon as any} size={42} color={reward.iconColor} />
              </View>
            )}
            <Text style={[styles.dailyLabel, isChestDay && { color: chestColor, fontSize: 17 }]}>{reward.label}</Text>
            {isChestDay && (
              <Text style={{ fontFamily: "Nunito_400Regular", fontSize: 12, color: "#aaa", textAlign: "center", marginBottom: 4 }}>
                Se ha agregado a tu inventario de cofres
              </Text>
            )}
            <View style={styles.dailyChips}>
              {reward.coins > 0 && (
                <View style={styles.dailyChip}>
                  <Ionicons name="cash" size={14} color={Colors.gold} />
                  <Text style={styles.dailyChipText}>+{reward.coins}</Text>
                </View>
              )}
              {reward.xp > 0 && (
                <View style={styles.dailyChipXp}>
                  <Ionicons name="star" size={12} color={Colors.gold} />
                  <Text style={styles.dailyChipText}>+{reward.xp} XP</Text>
                </View>
              )}
            </View>
            <Pressable onPress={onClaim} style={styles.dailyClaimBtn}>
              <LinearGradient colors={isChestDay ? [chestColor, chestColor + "BB"] : [Colors.gold, Colors.goldLight]} style={styles.dailyClaimGrad}>
                <Text style={styles.dailyClaimText}>{T("claimReward").toUpperCase()}</Text>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

function PokerTitle() {
  const theme = useTheme();
  const glowAnim = useSharedValue(0.6);
  useEffect(() => {
    glowAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.6, { duration: 1800, easing: Easing.inOut(Easing.sin) })
      ), -1
    );
  }, []);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowAnim.value }));
  return (
    <View style={styles.titleWrap}>
      <View style={styles.titleSuits}>
        <Text style={styles.suitRed}>♥</Text>
        <Text style={[styles.suitBlack, { color: theme.textMuted }]}>♠</Text>
        <Text style={styles.suitRed}>♦</Text>
        <Text style={[styles.suitBlack, { color: theme.textMuted }]}>♣</Text>
      </View>
      <Animated.View style={glowStyle}>
        <Text style={styles.mainTitle}>OCHO LOCOS</Text>
      </Animated.View>
      <Text style={styles.titleTagline}>CRAZY EIGHTS · CASINO EDITION</Text>
    </View>
  );
}

export default function PlayScreen() {
  const insets = useSafeAreaInsets();
  const { startGame } = useGame();
  const { profile, level, xpProgress, canClaimDailyReward, todaysDailyReward, claimDailyReward, watchAd, adsWatchedToday, adDailyLimit, isLoaded, addCoins, addXp, markTutorialSeen, chestInventory, openChestFromInventory } = useProfile();
  const [selectedMode, setSelectedMode] = useState<GameModeId | null>(null);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [socket, setSocket] = useState(null);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [showModeInfo, setShowModeInfo] = useState(false);
  const [selectedModeForInfo, setSelectedModeForInfo] = useState<GameModeId | null>(null);
  const [showMultiModal, setShowMultiModal] = useState(false);
  const [showOnlineModal, setShowOnlineModal] = useState(false);
  const [multiPlayerCount, setMultiPlayerCount] = useState(2);
  const [onlinePlayerCount, setOnlinePlayerCount] = useState(2);
  const [multiPlayerNames, setMultiPlayerNames] = useState(["Jugador 1", "Jugador 2", "Jugador 3", "Jugador 4", "Jugador 5", "Jugador 6"]);
  const [showAdModal, setShowAdModal] = useState(false);
  const [adCountdown, setAdCountdown] = useState(5);
  const [adComplete, setAdComplete] = useState(false);
  const [onlineTab, setOnlineTab] = useState<"search" | "create" | "join">("search");
  const [generatedRoomCode, setGeneratedRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [showChestModal, setShowChestModal] = useState(false);
  const [selectedChestType, setSelectedChestType] = useState<ChestType>("common");
  const [chestModalReward, setChestModalReward] = useState<ChestReward | null>(null);

  const T = useT();
  const isDark = profile.darkMode !== false;
  const theme = isDark ? Colors : LightColors;
  const lang = (profile.language ?? "es") as "es" | "en" | "pt";

  // Initialize localized player name placeholders
  useEffect(() => {
    setMultiPlayerNames(Array.from({ length: 6 }, (_, i) => `${T("player")} ${i + 1}`));
  }, [lang]);

  // Load challenges
  useEffect(() => {
    if (isLoaded) {
      getDailyChallenges(level).then(setChallenges);
    }
  }, [level, isLoaded]);

useEffect(() => {
  const newSocket = io("https://ocho-locos-the-games.onrender.com");

  newSocket.on("connect", () => {
    console.log("🔥 Conectado al servidor");
  });

  newSocket.on("connect_error", (err) => {
    console.log("Error:", err);
  });

  setSocket(newSocket);

  return () => {
    newSocket.disconnect();
  };
}, []);
if (!socket) {
  return <Text>Cargando...</Text>;
}
  const handleClaimChallenge = async (id: string) => {
    const ch = challenges.find((c) => c.id === id);
    if (!ch || !ch.completed || ch.claimed) return;
    
    await playSound("daily_reward").catch(() => {});
    addCoins(ch.coinReward);
    addXp(ch.xpReward);
    
    const updated = await claimChallenge(id);
    setChallenges(updated);
  };
  const swipeHandlers = useSwipeTabs(0);
  const topPad = Platform.OS === "web" ? 67 : insets.top + 6;
  const xpPct = xpProgress.needed > 0 ? xpProgress.current / xpProgress.needed : 0;

  // ─── Events data (no IIFE, React Compiler safe) ──────────────────────────
  const evIsLocked = level < 5;
  const EV_BASE = new Date("2026-03-01T00:00:00Z").getTime();
  const EV_CYCLE = 3 * 24 * 3600 * 1000;
  const EV_ELAPSED = Date.now() - EV_BASE;
  const EV_IDX = evIsLocked ? 0 : Math.floor(EV_ELAPSED / EV_CYCLE) % 4;
  const EV_NAMES = ["Velocidad Extrema", "Cartas Aleatorias", "Doble Efecto", "Supervivencia"] as const;
  const EV_DESCS = ["Todas las cartas tienen temporizador de 5s", "Las cartas especiales cambian aleatoriamente", "Las cartas especiales tienen efecto doble", "Comienza con 12 cartas. ¡Vacía tu mano!"] as const;
  const EV_ICONS = ["flash", "shuffle", "copy", "shield"] as const;
  const EV_COLORS = ["#F39C12", "#9B59B6", "#E74C3C", "#27AE60"] as const;
  const EV_DURS = [2, 2, 2, 2] as const;
  const evColor = EV_COLORS[EV_IDX];
  const evName = EV_NAMES[EV_IDX];
  const evDesc = EV_DESCS[EV_IDX];
  const evIcon = EV_ICONS[EV_IDX];
  const evCyclePosMs = EV_ELAPSED % EV_CYCLE;
  const evDurMs = EV_DURS[EV_IDX] * 24 * 3600 * 1000;
  const evIsLive = !evIsLocked && evCyclePosMs < evDurMs;
  const evStatus = evIsLocked ? "locked" : evIsLive ? "live" : "upcoming";
  const evHoursLeft = evIsLive ? Math.ceil((evDurMs - evCyclePosMs) / 3600000) : 0;
  const evNextInHours = evIsLocked || evIsLive ? 0 : Math.ceil((EV_CYCLE - evCyclePosMs) / 3600000);
  const evStatusLabel = evStatus === "live" ? "EVENTO EN VIVO" : evStatus === "locked" ? "NIVEL 5 REQUERIDO" : "PROXIMO EVENTO";
  const evStatusColor = evStatus === "live" ? evColor : evStatus === "locked" ? "#666" : "#4A90E2";
  const evStatusIcon = evStatus === "live" ? "radio" : evStatus === "locked" ? "lock-closed" : "time";
  const evBgColors: [string, string, string] = evStatus === "live"
    ? [`${evColor}22`, `${evColor}0a`, "transparent"]
    : evStatus === "locked" ? ["#1a1a1a", "#111111", "transparent"] : ["#0d1520", "#091020", "transparent"];

  const CHEST_CYCLE = 3;
  const chestProg = profile.stats.totalWins % CHEST_CYCLE;
  const chestWinsLeft = CHEST_CYCLE - chestProg;
  const nextChestType: ChestType =
    profile.stats.totalWins > 0 && (profile.stats.totalWins + chestWinsLeft) % 25 === 0 ? "legendary" :
    profile.stats.totalWins > 0 && (profile.stats.totalWins + chestWinsLeft) % 15 === 0 ? "epic" :
    profile.stats.totalWins > 0 && (profile.stats.totalWins + chestWinsLeft) % 7 === 0 ? "rare" : "common";
  const nextCfg = CHEST_CONFIG[nextChestType];
  const showChestSection = chestInventory.length > 0 || profile.stats.totalWins > 0;

  const onlineGlow = useSharedValue(0);
  useEffect(() => {
    onlineGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) })
      ), -1, false
    );
  }, []);
  const onlineGlowStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(74,144,226,${0.18 + onlineGlow.value * 0.52})`,
    shadowColor: "#4A90E2",
    shadowOpacity: 0.12 + onlineGlow.value * 0.38,
    shadowRadius: 6 + onlineGlow.value * 14,
    elevation: 3 + Math.round(onlineGlow.value * 8),
  }));
  const liveDotStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + onlineGlow.value * 0.45,
    transform: [{ scale: 0.85 + onlineGlow.value * 0.25 }],
  }));

  // Auto-redirect new players to tutorial on very first launch
  useEffect(() => {
    if (isLoaded && !profile.tutorialSeen) {
      const timer = setTimeout(() => {
        router.push("/tutorial");
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isLoaded]);

  // Show daily reward on mount if available
  useEffect(() => {
    if (canClaimDailyReward) {
      const timer = setTimeout(() => setShowDailyModal(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Android hardware back button → exit confirmation
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      Alert.alert(
        T("exitAppTitle"),
        T("exitAppMsg"),
        [
          { text: T("cancel"), style: "cancel" },
          { text: T("exitApp"), style: "destructive", onPress: () => BackHandler.exitApp() },
        ],
        { cancelable: true }
      );
      return true;
    });
    return () => sub.remove();
  }, []);

  const handleModePress = async (modeId: GameModeId) => {
    await playSound("menu_open").catch(() => {});
    setSelectedModeForInfo(modeId);
    setShowModeInfo(true);
  };

  const handleModeInfoPlay = async () => {
    setShowModeInfo(false);
    const modeId = selectedModeForInfo;
    if (!modeId) return;
    const mode = GAME_MODES.find((m) => m.id === modeId);
    if (!mode) return;
    if (mode.hasDifficulty) {
      await playSound("menu_open").catch(() => {});
      setSelectedMode(modeId);
      setShowDiffModal(true);
      return;
    }
    await playSound("mode_select").catch(() => {});
    startGame(modeId as any, "normal");
    router.push("/game");
  };

  const handleDifficultySelect = async (difficulty: Difficulty) => {
    if (!selectedMode) return;
    setShowDiffModal(false);
    startGame(selectedMode, difficulty);
    router.push("/game");
  };

  const handleClaimDaily = () => {
    claimDailyReward();
    playSound("daily_reward").catch(() => {});
    setShowDailyModal(false);
  };

  const handleStartMulti = async () => {
    await playButton().catch(() => {});
    const names = multiPlayerNames.slice(0, multiPlayerCount).map((n, i) => n.trim() || `Jugador ${i + 1}`);
    setShowMultiModal(false);
    router.push({ pathname: "/game-multi", params: { names: JSON.stringify(names), count: String(multiPlayerCount) } });
  };

  const handleStartOnline = async () => {
    await playButton().catch(() => {});
    setShowOnlineModal(false);
    router.push({ pathname: "/online-lobby", params: { mode: "classic", playerCount: String(onlinePlayerCount), directSearch: "true" } });
  };

  const handleOpenAd = () => {
    if (adsWatchedToday >= adDailyLimit) return;
    setAdCountdown(5);
    setAdComplete(false);
    setShowAdModal(true);
    let count = 5;
    const timer = setInterval(() => {
      count -= 1;
      setAdCountdown(count);
      if (count <= 0) {
        clearInterval(timer);
        setAdComplete(true);
      }
    }, 1000);
  };

  const handleClaimAd = () => {
    watchAd();
    playSound("purchase").catch(() => {});
    setShowAdModal(false);
  };

  const selectedModeConfig = selectedMode ? GAME_MODES.find((m) => m.id === selectedMode) : null;

  const bgGradient: [string, string, string, string, string] = isDark
    ? ["#041008", "#071510", "#0a1a0f", "#071510", "#041008"]
    : ["#d4edd0", "#dff2da", "#e8f5e2", "#dff2da", "#d4edd0"];

  return (
    <View style={[styles.container, { paddingTop: topPad, backgroundColor: theme.background }]} {...swipeHandlers}>
      <LinearGradient
        colors={bgGradient}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.feltTextureH1, { pointerEvents: "none" } as any]} />
      <View style={[styles.feltTextureH2, { pointerEvents: "none" } as any]} />
      <View style={[styles.feltTextureV1, { pointerEvents: "none" } as any]} />
      <AnimatedBackground isDark={isDark} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Profile bar — clickable to go to profile */}
        <Pressable
          onPress={() => { playButton().catch(() => {}); router.push("/(tabs)/profile"); }}
          style={({ pressed }) => [styles.profileBar, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)" }, pressed && styles.profileBarPressed]}
        >
          <AvatarDisplay
            avatarId={profile.avatarId}
            frameId={profile.selectedFrameId}
            photoUri={profile.photoUri}
            size={36}
            iconSize={18}
          />
          <View style={styles.profileBarInfo}>
            <Text style={[styles.profileBarName, { color: theme.text }]} numberOfLines={1}>{profile.name}</Text>
            <View style={styles.xpMini}>
              <Text style={[styles.levelTag, { color: theme.textMuted }]}>Nv.{level}</Text>
              <View style={[styles.xpBarMini, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)" }]}>
                <View style={[styles.xpFillMini, { width: `${xpPct * 100}%`, backgroundColor: theme.gold }]} />
              </View>
            </View>
          </View>
          <View style={styles.coinsBadge}>
            <Ionicons name="cash" size={13} color={theme.gold} />
            <Text style={[styles.coinsNum, { color: theme.gold }]}>{profile.coins}</Text>
          </View>
          {canClaimDailyReward && (
            <View style={styles.dailyDot}>
              <View style={styles.dailyDotInner} />
            </View>
          )}
          <Pressable
            onPress={(e) => { e.stopPropagation(); playButton().catch(() => {}); router.push("/settings"); }}
            style={styles.settingsBtn}
            hitSlop={8}
          >
            <Ionicons name="settings-outline" size={17} color={theme.textMuted} />
          </Pressable>
        </Pressable>

        {/* Daily reward banner if available */}
        {canClaimDailyReward && (
          <Pressable
            onPress={() => setShowDailyModal(true)}
            style={[styles.dailyBanner, { backgroundColor: isDark ? "rgba(212,175,55,0.12)" : "rgba(160,120,0,0.12)" }]}
          >
            <Ionicons name="gift" size={16} color={theme.gold} />
            <Text style={[styles.dailyBannerText, { color: theme.gold }]}>{T("dailyRewardReady")}</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.gold} />
          </Pressable>
        )}

        <PokerTitle />

        <RankedPreviewCard isDark={isDark} />

        {/* Events Section — inlined for React Compiler compatibility */}
        <View style={{
          marginHorizontal: 16, marginBottom: 12, borderRadius: 14, overflow: "hidden",
          borderWidth: 1.5,
          borderColor: evStatus === "live" ? evColor + "88" : evStatus === "locked" ? "#33333388" : "#4A90E244",
          shadowColor: evColor, shadowOpacity: evStatus === "live" ? 0.4 : 0.1, shadowRadius: 10, elevation: 6,
        }}>
          <LinearGradient colors={evBgColors} style={{ padding: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 6 }}>
              <Ionicons name={evStatusIcon as any} size={11} color={evStatusColor} />
              <Text style={{ fontFamily: "Nunito_800ExtraBold", fontSize: 10, color: evStatusColor, letterSpacing: 1.5 }}>
                {evStatusLabel}
              </Text>
              {evStatus === "live" && (
                <View style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="time-outline" size={11} color={evColor} />
                  <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 11, color: evColor }}>{evHoursLeft}h</Text>
                </View>
              )}
              {evStatus === "upcoming" && evNextInHours > 0 && (
                <View style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 11, color: "#4A90E2" }}>en {evNextInHours}h</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{
                width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center",
                borderWidth: 1.5, borderColor: evStatus === "locked" ? "#33333388" : evColor + "66",
                backgroundColor: evStatus === "locked" ? "#22222244" : evColor + "18",
              }}>
                <Ionicons name={(evStatus === "locked" ? "lock-closed" : evIcon) as any} size={22} color={evStatus === "locked" ? "#666" : evColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Nunito_800ExtraBold", fontSize: 15, color: evStatus === "locked" ? "#666" : "#fff", marginBottom: 2 }}>
                  {evStatus === "locked" ? "Eventos Especiales" : evName}
                </Text>
                <Text style={{ fontFamily: "Nunito_400Regular", fontSize: 12, color: evStatus === "locked" ? "#555" : "#aaa" }} numberOfLines={1}>
                  {evStatus === "locked" ? "Desbloquea eventos al llegar a nivel 5" : evDesc}
                </Text>
              </View>
              {evStatus === "live" && (
                <View style={{ backgroundColor: evColor, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ fontFamily: "Nunito_800ExtraBold", fontSize: 12, color: "#000" }}>Jugar</Text>
                </View>
              )}
            </View>
            {evStatus === "live" && (
              <View style={{ flexDirection: "row", marginTop: 10, gap: 8 }}>
                <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 8, alignItems: "center" }}>
                  <Text style={{ fontFamily: "Nunito_800ExtraBold", fontSize: 13, color: evColor }}>+2</Text>
                  <Text style={{ fontFamily: "Nunito_400Regular", fontSize: 10, color: "#888" }}>pts por victoria</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 8, alignItems: "center" }}>
                  <Text style={{ fontFamily: "Nunito_800ExtraBold", fontSize: 13, color: evColor }}>+1</Text>
                  <Text style={{ fontFamily: "Nunito_400Regular", fontSize: 10, color: "#888" }}>pts por derrota</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 8, alignItems: "center" }}>
                  <Text style={{ fontFamily: "Nunito_800ExtraBold", fontSize: 13, color: evColor }}>Cofre</Text>
                  <Text style={{ fontFamily: "Nunito_400Regular", fontSize: 10, color: "#888" }}>a 10 puntos</Text>
                </View>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Chest Inventory Section */}
        {showChestSection && (
          <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
            <View style={[styles.sectionHeader, { marginBottom: 10, marginTop: 4 }]}>
              <Ionicons name="cube" size={14} color={theme.gold} />
              <Text style={[styles.sectionLabel, { color: theme.gold }]}>Cofres</Text>
              {chestInventory.length > 0 && (
                <View style={{ marginLeft: "auto", backgroundColor: theme.gold + "22", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 11, color: theme.gold }}>{chestInventory.length}</Text>
                </View>
              )}
            </View>
            <View style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)",
              borderRadius: 12, padding: 12, marginBottom: 10,
              borderWidth: 1, borderColor: nextCfg.borderColor + "44",
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 }}>
                <Ionicons
                  name={nextChestType === "legendary" ? "star" : nextChestType === "epic" ? "diamond" : nextChestType === "rare" ? "cube-outline" : "cube"}
                  size={18} color={nextCfg.glowColor}
                />
                <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 13, color: nextCfg.glowColor, flex: 1 }}>
                  {nextCfg.name}
                </Text>
                <Text style={{ fontFamily: "Nunito_400Regular", fontSize: 12, color: theme.textMuted }}>
                  {chestWinsLeft === 1 ? "¡1 victoria más!" : `${chestWinsLeft} victorias más`}
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                <View style={{ height: 6, borderRadius: 3, width: `${(chestProg / CHEST_CYCLE) * 100}%`, backgroundColor: nextCfg.glowColor }} />
              </View>
              <Text style={{ fontFamily: "Nunito_400Regular", fontSize: 10, color: theme.textMuted, marginTop: 4 }}>
                {chestProg}/{CHEST_CYCLE} victorias
              </Text>
            </View>
            {chestInventory.length > 0 && (
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={chestInventory}
                keyExtractor={(c) => c.id}
                contentContainerStyle={{ gap: 10, paddingRight: 4 }}
                renderItem={({ item }) => (
                  <ChestInventoryItem
                    chest={item}
                    onTap={() => {
                      setSelectedChestType(item.type);
                      const rw = openChestFromInventory(item.id);
                      setChestModalReward(rw);
                      setShowChestModal(true);
                    }}
                  />
                )}
              />
            )}
            {chestInventory.length === 0 && (
              <View style={{ alignItems: "center", paddingVertical: 8 }}>
                <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 12, color: theme.textMuted }}>
                  {chestWinsLeft === 1
                    ? "¡Una victoria más para tu cofre!"
                    : `Te falta${chestWinsLeft !== CHEST_CYCLE ? `n ${chestWinsLeft}` : `n ${CHEST_CYCLE}`} victorias para un cofre`}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Daily Challenges Section */}
        {challenges.length > 0 && (
          <View style={{ marginVertical: 10 }}>
            <View style={[styles.sectionHeader, { marginTop: 0 }]}>
              <Ionicons name="flash" size={14} color={theme.gold} />
              <Text style={[styles.sectionLabel, { color: theme.gold }]}>
                {T("dailyChallenges" as any)}
              </Text>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={challenges}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 8 }}
              renderItem={({ item }) => {
                const title = lang === "es" ? item.title : lang === "pt" ? item.titlePt : item.titleEn;
                const desc = lang === "es" ? item.description : lang === "pt" ? item.descriptionPt : item.descriptionEn;
                const progressPct = Math.min(1, item.progress / item.target);
                
                return (
                  <View style={[
                    styles.challengeCard, 
                    { backgroundColor: theme.surface, borderColor: item.completed ? theme.gold : "rgba(255,255,255,0.1)" },
                    item.claimed && { opacity: 0.6 }
                  ]}>
                    <View style={styles.challengeHeader}>
                      <View style={[styles.challengeIcon, { backgroundColor: item.completed ? theme.gold + "20" : "rgba(255,255,255,0.05)" }]}>
                        <Ionicons name={item.icon as any} size={20} color={item.completed ? theme.gold : theme.textMuted} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.challengeTitle, { color: theme.text }]} numberOfLines={1}>{title}</Text>
                        <Text style={[styles.challengeDesc, { color: theme.textMuted }]} numberOfLines={2}>{desc}</Text>
                      </View>
                    </View>

                    <View style={styles.challengeProgressWrap}>
                      <View style={styles.challengeProgressInfo}>
                        <Text style={[styles.challengeProgressText, { color: theme.textMuted }]}>{item.progress}/{item.target}</Text>
                        <Text style={[styles.challengeRewardText, { color: theme.gold }]}>+{item.coinReward} <Ionicons name="cash" size={10} /></Text>
                      </View>
                      <View style={[styles.challengeProgressBar, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
                        <View style={[styles.challengeProgressFill, { width: `${progressPct * 100}%`, backgroundColor: item.completed ? theme.gold : "#4A90E2" }]} />
                      </View>
                    </View>

                    {item.completed && !item.claimed && (
                      <Pressable 
                        onPress={() => handleClaimChallenge(item.id)}
                        style={({ pressed }) => [styles.challengeClaimBtn, pressed && { opacity: 0.8 }]}
                      >
                        <LinearGradient colors={[theme.gold, "#B8860B"]} style={styles.challengeClaimGrad}>
                          <Text style={styles.challengeClaimText}>{T("claim").toUpperCase()}</Text>
                        </LinearGradient>
                      </Pressable>
                    )}
                    
                    {item.claimed && (
                      <View style={styles.challengeClaimedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={theme.gold} />
                        <Text style={[styles.challengeClaimedText, { color: theme.gold }]}>{T("claimed").toUpperCase()}</Text>
                      </View>
                    )}
                  </View>
                );
              }}
            />
          </View>
        )}

        <View style={styles.suitDivider}>
          <View style={[styles.dividerLine, { backgroundColor: theme.gold + "40" }]} />
          <Text style={[styles.dividerSuit, { color: theme.gold }]}>♦</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.gold + "40" }]} />
        </View>

        <View style={styles.sectionHeader}>
          <Ionicons name="game-controller" size={14} color={theme.textMuted} />
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>{T("gameModes")}</Text>
        </View>

        <View style={styles.modesGrid}>
          {GAME_MODES.map((mode, idx) => {
            const wins = profile.stats.winsByMode[mode.id] ?? 0;
            const games = profile.stats.gamesByMode[mode.id] ?? 0;
            const wr = games > 0 ? Math.round((wins / games) * 100) : null;
            const isLastAlone = idx === GAME_MODES.length - 1 && GAME_MODES.length % 2 !== 0;
            return (
              <Pressable
                key={mode.id}
                onPress={() => handleModePress(mode.id)}
                style={({ pressed }) => [styles.modeCard, isLastAlone && styles.modeCardFull, pressed && styles.modeCardPressed]}
              >
                <LinearGradient
                  colors={[mode.color + "28", mode.color + "08", "transparent"]}
                  style={[styles.modeGrad, { borderColor: mode.color + "50", backgroundColor: theme.surface }]}
                >
                  {mode.isNew && (
                    <LinearGradient colors={[Colors.red, "#a01a15"]} style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>{T("newBadge")}</Text>
                    </LinearGradient>
                  )}
                  <View style={[styles.modeIconWrap, { backgroundColor: mode.color + "25" }]}>
                    <Ionicons name={mode.icon as any} size={24} color={mode.color} />
                  </View>
                  <Text style={[styles.modeName, { color: mode.color }]}>{getModeName(mode.id, lang) || mode.name}</Text>
                  <Text style={[styles.modeDesc, { color: theme.textMuted }]} numberOfLines={2}>{getModeDesc(mode.id, lang) || mode.description}</Text>
                  <View style={styles.modeFooter}>
                    <View style={styles.modeReward}>
                      <Ionicons name="cash" size={11} color={Colors.gold} />
                      <Text style={[styles.modeRewardText, { color: theme.gold }]}>{mode.coinsReward}</Text>
                    </View>
                    {wr !== null && (
                      <Text style={[styles.modeWR, { color: theme.textMuted }]}>{wr}% WR</Text>
                    )}
                    {mode.hasDifficulty && (
                      <Ionicons name="chevron-forward" size={12} color={mode.color + "88"} />
                    )}
                  </View>
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>

        {/* Multiplayer section */}
        <View style={styles.sectionHeader}>
          <Ionicons name="people" size={14} color={theme.textMuted} />
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>{T("multiplayer")}</Text>
        </View>
        <View style={styles.multiRow}>
          {/* Local */}
          <Pressable
            style={({ pressed }) => [styles.multiCard, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
            onPress={() => { playButton().catch(() => {}); setShowMultiModal(true); }}
          >
            <LinearGradient colors={["#0a2216", "#0d2e1c"]} style={styles.multiCardGrad}>
              <View style={[styles.multiCardIcon, { borderColor: "#2ECC7155" }]}>
                <Ionicons name="phone-portrait" size={22} color="#2ECC71" />
              </View>
              <Text style={[styles.multiCardTitle, { color: "#2ECC71" }]}>{T("multiLocal")}</Text>
              <Text style={styles.multiCardDesc}>{T("multiLocalDesc")}</Text>
              <View style={[styles.multiCardBadge, { backgroundColor: "#2ECC7122", borderColor: "#2ECC7144" }]}>
                <Ionicons name="people" size={10} color="#2ECC71" />
                <Text style={[styles.multiCardBadgeText, { color: "#2ECC71" }]}>2 – 6 {T("players")}</Text>
              </View>
            </LinearGradient>
          </Pressable>

          {/* Online — highlighted with pulsing glow */}
          <Animated.View style={[styles.multiCard, { borderWidth: 1.5, borderRadius: 14, overflow: "hidden" }, onlineGlowStyle]}>
            <Pressable
              style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
              onPress={() => { playButton().catch(() => {}); setShowOnlineModal(true); }}
            >
              <LinearGradient colors={["#060d1e", "#091428", "#0a1830"]} style={styles.multiCardGrad}>
                <View style={[styles.multiCardIcon, { borderColor: "#4A90E266", backgroundColor: "#4A90E211" }]}>
                  <Ionicons name="globe" size={24} color="#4A90E2" />
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Text style={[styles.multiCardTitle, { color: "#6AADFF", fontSize: 17 }]}>{T("multiOnline")}</Text>
                  <View style={styles.onlineDotPill}>
                    <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#2ecc71" }, liveDotStyle]} />
                    <Text style={styles.onlineDotText}>{T("multiOnlineDesc")}</Text>
                  </View>
                </View>
                <Text style={styles.multiCardDesc}>{T("multiOnlineDesc2")}</Text>
                <View style={[styles.multiCardBadge, { backgroundColor: "#4A90E222", borderColor: "#4A90E255" }]}>
                  <Ionicons name="wifi" size={10} color="#4A90E2" />
                  <Text style={[styles.multiCardBadgeText, { color: "#6AADFF" }]}>2 – 4 {T("players")}</Text>
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>

        {/* Earn Coins / Watch Ads section */}
        <View style={styles.sectionHeader}>
          <Ionicons name="cash" size={14} color={theme.textMuted} />
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>{T("earnCoins")}</Text>
        </View>
        <Pressable
          onPress={handleOpenAd}
          disabled={adsWatchedToday >= adDailyLimit}
          style={({ pressed }) => [
            styles.adBanner,
            { backgroundColor: isDark ? "rgba(212,175,55,0.08)" : "rgba(160,120,0,0.08)", borderColor: isDark ? Colors.gold + "33" : "#A0780044" },
            adsWatchedToday >= adDailyLimit && { opacity: 0.5 },
            pressed && adsWatchedToday < adDailyLimit && { opacity: 0.8, transform: [{ scale: 0.98 }] },
          ]}
        >
          <LinearGradient colors={adsWatchedToday >= adDailyLimit ? ["#33333322","#22222211"] : [Colors.gold + "18", Colors.gold + "08"]} style={StyleSheet.absoluteFill} />
          <View style={[styles.adIconWrap, { backgroundColor: Colors.gold + "22" }]}>
            <Ionicons name="play-circle" size={28} color={adsWatchedToday >= adDailyLimit ? theme.textDim : theme.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.adTitle, { color: adsWatchedToday >= adDailyLimit ? theme.textMuted : theme.gold }]}>
              {adsWatchedToday >= adDailyLimit ? T("adDailyLimit") : T("watchAd")}
            </Text>
            <Text style={[styles.adDesc, { color: theme.textMuted }]}>
              {T("watchAdDesc")} · {T("adReward")}
            </Text>
          </View>
          <View style={styles.adCounter}>
            <Text style={[styles.adCounterText, { color: theme.textMuted }]}>{adsWatchedToday}/{adDailyLimit}</Text>
          </View>
        </Pressable>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <Pressable
            onPress={async () => { await playButton().catch(() => {}); router.push("/tutorial"); }}
            style={[styles.quickBtn, { borderColor: theme.border }]}
          >
            <Ionicons name="help-circle-outline" size={18} color={theme.textMuted} />
            <Text style={[styles.quickBtnText, { color: theme.textMuted }]}>Tutorial</Text>
          </Pressable>
          <Pressable
            onPress={async () => { await playButton().catch(() => {}); router.push("/rules"); }}
            style={[styles.quickBtn, { borderColor: theme.border }]}
          >
            <Ionicons name="book-outline" size={18} color={theme.textMuted} />
            <Text style={[styles.quickBtnText, { color: theme.textMuted }]}>{T("rules")}</Text>
          </Pressable>
          <Pressable
            onPress={async () => { await playButton().catch(() => {}); router.push("/ranking"); }}
            style={[styles.quickBtn, { borderColor: theme.border }]}
          >
            <Ionicons name="earth" size={18} color={theme.textMuted} />
            <Text style={[styles.quickBtnText, { color: theme.textMuted }]}>{T("viewRanking")}</Text>
          </Pressable>
          {profile.stats.totalGames > 0 && (
            <View style={styles.statChip}>
              <Ionicons name="trophy" size={14} color={Colors.gold} />
              <Text style={styles.statChipText}>{profile.stats.totalWins}V</Text>
              <Text style={styles.statChipSep}>·</Text>
              <Text style={styles.statChipText}>{profile.stats.totalGames}P</Text>
            </View>
          )}
          {(profile.stats.winStreak ?? 0) >= 2 && (
            <View style={[styles.statChip, { backgroundColor: "#E67E2222", borderColor: "#E67E2255" }]}>
              <Ionicons name="flame" size={14} color="#E67E22" />
              <Text style={[styles.statChipText, { color: "#E67E22" }]}>Racha x{profile.stats.winStreak}</Text>
            </View>
          )}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {(() => {
        const infoMode = selectedModeForInfo ? GAME_MODES.find((m) => m.id === selectedModeForInfo) : null;
        return (
          <ModeInfoModal
            visible={showModeInfo}
            modeId={selectedModeForInfo}
            modeName={infoMode ? (getModeName(infoMode.id, lang) || infoMode.name) : ""}
            modeColor={infoMode?.color ?? Colors.gold}
            modeIcon={infoMode?.icon ?? "card-outline"}
            coins={infoMode?.coinsReward ?? 0}
            xp={infoMode?.xpReward ?? 0}
            hasDifficulty={infoMode?.hasDifficulty ?? false}
            lang={lang}
            onClose={() => setShowModeInfo(false)}
            onPlay={handleModeInfoPlay}
          />
        );
      })()}

      <DifficultyModal
        visible={showDiffModal}
        onClose={() => setShowDiffModal(false)}
        onSelect={handleDifficultySelect}
        modeName={selectedModeConfig ? (getModeName(selectedModeConfig.id, lang) || selectedModeConfig.name) : ""}
      />

      <DailyRewardModal
        visible={showDailyModal}
        reward={canClaimDailyReward ? todaysDailyReward : null}
        onClaim={handleClaimDaily}
      />

      <ChestOpeningModal
        visible={showChestModal}
        chestType={selectedChestType}
        reward={chestModalReward}
        onClose={() => { setShowChestModal(false); setChestModalReward(null); }}
      />

      {/* Online modal */}
      <Modal visible={showOnlineModal} transparent animationType="slide" onRequestClose={() => { setShowOnlineModal(false); setOnlineTab("search"); setJoinCode(""); }}>
        <View style={styles.multiModalOverlay}>
          <LinearGradient colors={["#060f22", "#0a1632"]} style={styles.multiModalBox}>
            <View style={styles.multiModalHeader}>
              <View style={styles.onlineDotPill}>
                <View style={styles.onlineDotSmall} />
                <Text style={[styles.onlineDotText, { fontSize: 10, color: "#2ecc71" }]}>{T("multiOnlineDesc")}</Text>
              </View>
              <Text style={[styles.multiModalTitle, { color: "#4A90E2", flex: 1 }]}>Online</Text>
              <Pressable onPress={() => { setShowOnlineModal(false); setOnlineTab("search"); setJoinCode(""); }} style={styles.multiModalClose}>
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </Pressable>
            </View>

            {/* Tab bar */}
            <View style={{ flexDirection: "row", gap: 6, marginBottom: 6 }}>
              {(["search", "create", "join"] as const).map((tab) => {
                const labels: Record<string, string> = { search: T("searchTab" as any), create: T("createRoom" as any), join: T("joinRoom" as any) };
                const icons: Record<string, any> = { search: "search", create: "add-circle-outline", join: "enter-outline" };
                return (
                  <Pressable key={tab} onPress={() => setOnlineTab(tab)} style={[{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: onlineTab === tab ? "#4A90E266" : "rgba(255,255,255,0.08)", backgroundColor: onlineTab === tab ? "#4A90E222" : "rgba(255,255,255,0.03)" }]}>
                    <Ionicons name={icons[tab]} size={13} color={onlineTab === tab ? "#4A90E2" : theme.textMuted} />
                    <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 11, color: onlineTab === tab ? "#4A90E2" : theme.textMuted }}>{labels[tab]}</Text>
                  </Pressable>
                );
              })}
            </View>

            {onlineTab === "search" && (
              <>
            <Text style={[styles.multiModalSectionLabel, { color: theme.textDim }]}>{T("howManyPlayersLocal")}</Text>
                <View style={styles.multiCountRow}>
                  {[2, 3, 4].map(n => (
                    <Pressable key={n} onPress={() => setOnlinePlayerCount(n)} style={[styles.multiCountBtn, onlinePlayerCount === n && { backgroundColor: "#4A90E222", borderColor: "#4A90E266" }, { borderColor: theme.border }]}>
                      <Text style={[styles.multiCountBtnText, onlinePlayerCount === n ? { color: "#4A90E2" } : { color: theme.textMuted }]}>{n}</Text>
                      <Text style={[styles.multiCountBtnSub, onlinePlayerCount === n ? { color: "#4A90E2" } : { color: theme.textDim }]}>{n === 2 ? "1 rival" : `${n - 1} rivales`}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable onPress={handleStartOnline} style={styles.multiStartBtn}>
                  <LinearGradient colors={["#1a3a7a", "#4A90E2"]} style={styles.multiStartBtnGrad}>
                    <Ionicons name="search" size={18} color="#fff" />
                    <Text style={styles.multiStartBtnText}>{T("searchMatch")}</Text>
                  </LinearGradient>
                </Pressable>
                <Text style={[styles.multiModalHint, { color: theme.textDim }]}>{T("onlineRivals")}</Text>
              </>
            )}

            {onlineTab === "create" && (
              <>
                <Text style={[styles.multiModalSectionLabel, { marginBottom: 4, color: theme.textDim }]}>{T("yourRoomCode" as any) || "TU CÓDIGO DE SALA"}</Text>
                <View style={{ alignItems: "center", paddingVertical: 12, gap: 8 }}>
                  {generatedRoomCode ? (
                    <>
                      <Text style={{ fontFamily: "Nunito_800ExtraBold", fontSize: 42, color: "#4A90E2", letterSpacing: 8 }}>{generatedRoomCode}</Text>
                      <Image
                        source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(generatedRoomCode)}&size=150x150&bgcolor=ffffff&color=000000&margin=6` }}
                        style={{ width: 130, height: 130, borderRadius: 12, borderWidth: 3, borderColor: "#4A90E266" }}
                        resizeMode="contain"
                      />
                      <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 10, color: theme.textMuted, textAlign: "center" }}>
                        {T("shareCode" as any) || "Comparte el código o QR con tus amigos"}
                      </Text>
                    </>
                  ) : (
                    <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 12, color: theme.textMuted, textAlign: "center", paddingVertical: 20 }}>
                      {T("pressGenCode" as any) || "Presiona para generar un código de sala"}
                    </Text>
                  )}
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable 
                    onPress={() => {
                      playButton().catch(() => {});
                      setGeneratedRoomCode(Math.random().toString(36).substr(2, 6).toUpperCase());
                    }} 
                    style={[styles.multiStartBtn, { flex: 1, borderWidth: 1, borderColor: "#4A90E244", backgroundColor: "transparent", borderRadius: 14, overflow: "hidden" }]}
                  >
                    <View style={[styles.multiStartBtnGrad, { backgroundColor: "rgba(74,144,226,0.12)" }]}>
                      <Ionicons name="refresh" size={16} color="#4A90E2" />
                      <Text style={[styles.multiStartBtnText, { color: "#4A90E2" }]}>{T("newCode" as any)}</Text>
                    </View>
                  </Pressable>
                  {!!generatedRoomCode && (
                    <Pressable onPress={handleStartOnline} style={[styles.multiStartBtn, { flex: 2 }]}>
                      <LinearGradient colors={["#1a3a7a", "#4A90E2"]} style={styles.multiStartBtnGrad}>
                        <Ionicons name="play" size={18} color="#fff" />
                        <Text style={styles.multiStartBtnText}>{T("startRoom" as any)}</Text>
                      </LinearGradient>
                    </Pressable>
                  )}
                </View>
              </>
            )}

            {onlineTab === "join" && (
              <>
                <Text style={[styles.multiModalSectionLabel, { marginBottom: 4, color: theme.textDim }]}>{T("enterRoomCode" as any)}</Text>
                <View style={{ gap: 10 }}>
                  <TextInput
                    value={joinCode}
                    onChangeText={(t) => setJoinCode(t.toUpperCase().replace(/[^A-Z0-9]/g, "").substr(0, 6))}
                    placeholder={lang === "en" ? "XXXXXX" : "XXXXXX"}
                    placeholderTextColor={theme.textDim}
                    maxLength={6}
                    autoCapitalize="characters"
                    style={{ fontFamily: "Nunito_800ExtraBold", fontSize: 32, color: "#4A90E2", textAlign: "center", letterSpacing: 8, paddingVertical: 14, paddingHorizontal: 12, backgroundColor: "rgba(74,144,226,0.08)", borderRadius: 12, borderWidth: 1, borderColor: "#4A90E233" }}
                  />
                  <Pressable
                    disabled={joinCode.length < 6}
                    onPress={() => { if (joinCode.length >= 6) { setShowOnlineModal(false); setJoinCode(""); router.push({ pathname: "/online-lobby", params: { mode: "classic", playerCount: "2" } }); } }}
                    style={[styles.multiStartBtn, { opacity: joinCode.length < 6 ? 0.4 : 1 }]}
                  >
                    <LinearGradient colors={["#1a3a7a", "#4A90E2"]} style={styles.multiStartBtnGrad}>
                      <Ionicons name="enter" size={18} color="#fff" />
                      <Text style={styles.multiStartBtnText}>{T("joinRoomBtn" as any)}</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
                <Text style={[styles.multiModalHint, { color: theme.textDim }]}>{T("friendCode6" as any)}</Text>
              </>
            )}
          </LinearGradient>
        </View>
      </Modal>

      <Modal visible={showMultiModal} transparent animationType="slide" onRequestClose={() => setShowMultiModal(false)}>
        <View style={styles.multiModalOverlay}>
          <LinearGradient colors={["#0a1a2e", "#0d2244"]} style={styles.multiModalBox}>
            <View style={styles.multiModalHeader}>
              <Ionicons name="people" size={22} color="#63B3ED" />
              <Text style={styles.multiModalTitle}>{T("multiLocal")}</Text>
              <Pressable onPress={() => setShowMultiModal(false)} style={styles.multiModalClose}>
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </Pressable>
            </View>

            <Text style={[styles.multiModalSectionLabel, { color: theme.textDim }]}>{T("howManyPlayersLocal")}</Text>
            <View style={styles.multiCountRow}>
              {[2, 3, 4, 6].map(n => (
                <Pressable
                  key={n}
                  onPress={async () => {
                    await playButton().catch(() => {});
                    setMultiPlayerCount(n);
                    const names = multiPlayerNames.slice(0, n).map((nm, i) => nm.trim() || `Jugador ${i + 1}`);
                    setShowMultiModal(false);
                    router.push({ pathname: "/game-multi", params: { names: JSON.stringify(names), count: String(n) } });
                  }}
                  style={[styles.multiCountBtn, multiPlayerCount === n && styles.multiCountBtnActive, { borderColor: theme.border }]}
                >
                  <Text style={[styles.multiCountBtnText, multiPlayerCount === n ? styles.multiCountBtnTextActive : { color: theme.textMuted }]}>
                    {n}
                  </Text>
                  <Text style={[styles.multiCountBtnSub, multiPlayerCount === n ? { color: "#63B3ED" } : { color: theme.textDim }]}>
                    {n === 2 ? "1vs1" : n === 3 ? "3p" : n === 4 ? "4p" : "6p"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.multiModalSectionLabel, { marginTop: 12, color: theme.textDim }]}>{T("namesOptional")}</Text>
            {Array.from({ length: multiPlayerCount }).map((_, i) => {
              const colors = ["#D4AF37", "#27AE60", "#E74C3C", "#9B59B6"];
              const c = colors[i % colors.length];
              return (
                <View key={i} style={[styles.multiNameRow, { borderColor: theme.border }]}>
                  <View style={[styles.multiNameDot, { backgroundColor: c }]} />
                  <TextInput
                    style={[styles.multiNameInput, { color: theme.text }]}
                    value={multiPlayerNames[i]}
                    onChangeText={t => setMultiPlayerNames(prev => {
                      const n = [...prev];
                      n[i] = t;
                      return n;
                    })}
                    placeholder={`Jugador ${i + 1}`}
                    placeholderTextColor={theme.textDim}
                    maxLength={16}
                  />
                </View>
              );
            })}

            <Pressable onPress={handleStartMulti} style={styles.multiStartBtn}>
              <LinearGradient colors={["#2B6CB0", "#63B3ED"]} style={styles.multiStartBtnGrad}>
                <Ionicons name="play" size={18} color="#fff" />
                <Text style={styles.multiStartBtnText}>{T("startMatch")}</Text>
              </LinearGradient>
            </Pressable>

            <Text style={[styles.multiModalHint, { color: theme.textDim }]}>{T("passDeviceHint")}</Text>
          </LinearGradient>
        </View>
      </Modal>

      {/* Watch Ad Modal */}
      <Modal visible={showAdModal} transparent animationType="fade" onRequestClose={() => !adComplete && setShowAdModal(false)}>
        <View style={styles.adModalOverlay}>
          <View style={[styles.adModalBox, { backgroundColor: isDark ? "#0d1a0f" : "#e8f5e2", borderColor: Colors.gold + "44" }]}>
            <LinearGradient colors={[Colors.gold + "18", "transparent"]} style={StyleSheet.absoluteFill} />
            <View style={styles.adModalIcon}>
              <Ionicons name="play-circle" size={48} color={Colors.gold} />
            </View>
            <Text style={[styles.adModalTitle, { color: theme.gold }]}>
              {adComplete ? "+50" : T("adWatching")}
            </Text>
            {!adComplete && (
              <View style={styles.adCountdownWrap}>
                <Text style={[styles.adCountdownNum, { color: theme.text }]}>{adCountdown}</Text>
              </View>
            )}
            {adComplete && (
              <>
                <Text style={[styles.adModalSub, { color: theme.textMuted }]}>
                  {T("adComplete")}
                </Text>
                <View style={styles.adRewardRow}>
                  <Ionicons name="cash" size={20} color={Colors.gold} />
                  <Text style={[styles.adRewardText, { color: theme.gold }]}>+50 {T("coins")}</Text>
                </View>
                <Pressable onPress={handleClaimAd} style={styles.adClaimBtn}>
                  <LinearGradient colors={[Colors.goldLight, Colors.gold]} style={styles.adClaimGrad}>
                    <Text style={styles.adClaimText}>{T("adClose")}</Text>
                  </LinearGradient>
                </Pressable>
              </>
            )}
            {!adComplete && (
              <Pressable onPress={() => setShowAdModal(false)} style={styles.adCancelBtn}>
                <Text style={[styles.adCancelText, { color: theme.textMuted }]}>{T("cancel")}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#041008" },
  scroll: { paddingHorizontal: 16 },

  feltTextureH1: { position: "absolute", left: 0, right: 0, top: "30%", height: 1, backgroundColor: "rgba(255,255,255,0.02)" },
  feltTextureH2: { position: "absolute", left: 0, right: 0, top: "65%", height: 1, backgroundColor: "rgba(255,255,255,0.02)" },
  feltTextureV1: { position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, backgroundColor: "rgba(255,255,255,0.015)" },

  // Profile bar
  profileBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14,
    padding: 10, borderWidth: 1, borderColor: "rgba(212,175,55,0.15)", marginBottom: 10,
  },
  profileBarPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  avatarSmall: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  profileBarInfo: { flex: 1 },
  profileBarName: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.text },
  xpMini: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  levelTag: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 9, color: Colors.gold,
    backgroundColor: Colors.gold + "20", paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3,
  },
  xpBarMini: { flex: 1, height: 3, backgroundColor: Colors.border, borderRadius: 2 },
  xpFillMini: { height: "100%", backgroundColor: Colors.gold, borderRadius: 2 },
  coinsBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.gold + "18", borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: Colors.gold + "40",
  },
  coinsNum: { fontFamily: "Nunito_800ExtraBold", fontSize: 14, color: Colors.gold },
  settingsBtn: {
    width: 30, height: 30, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 15,
  },
  dailyDot: {
    position: "absolute", top: 6, right: 54,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: "#E74C3C", alignItems: "center", justifyContent: "center",
  },
  dailyDotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },

  // Daily reward banner
  dailyBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(212,175,55,0.1)", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8,
    borderWidth: 1, borderColor: "rgba(212,175,55,0.3)",
  },
  dailyBannerText: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.gold, flex: 1 },

  // Poker title
  titleWrap: { alignItems: "center", paddingVertical: 10, gap: 4 },
  titleSuits: { flexDirection: "row", gap: 12, marginBottom: 4 },
  suitRed: { fontSize: 22, color: "#C0392B", opacity: 0.8 },
  suitBlack: { fontSize: 22, color: Colors.textMuted, opacity: 0.8 },
  mainTitle: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 36, color: Colors.gold,
    letterSpacing: 5,
    textShadowColor: "rgba(212,175,55,0.5)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20,
  },
  titleTagline: {
    fontFamily: "Nunito_400Regular", fontSize: 10, color: Colors.textDim,
    letterSpacing: 3, textTransform: "uppercase",
  },

  // Divider
  suitDivider: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerSuit: { fontSize: 14, color: Colors.gold + "60" },

  // Section header
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  sectionLabel: { fontFamily: "Nunito_700Bold", fontSize: 11, color: Colors.textMuted, letterSpacing: 2 },

  // Mode grid
  modesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  modeCard: { width: "47.5%", borderRadius: 16, overflow: "hidden" },
  modeCardFull: { width: "100%" },
  modeCardPressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
  modeGrad: {
    padding: 14, minHeight: 150, justifyContent: "space-between",
    borderWidth: 1.5, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  newBadge: {
    position: "absolute", top: 8, right: 8,
    borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1,
  },
  newBadgeText: { fontFamily: "Nunito_800ExtraBold", fontSize: 7, color: "#fff", letterSpacing: 1 },
  modeIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  modeName: { fontFamily: "Nunito_800ExtraBold", fontSize: 14, marginBottom: 4 },
  modeDesc: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted, lineHeight: 15, flex: 1 },
  modeFooter: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8, flexWrap: "wrap" },
  modeReward: { flexDirection: "row", alignItems: "center", gap: 3 },
  modeRewardText: { fontFamily: "Nunito_700Bold", fontSize: 11, color: Colors.gold },
  modeWR: { fontFamily: "Nunito_400Regular", fontSize: 10, color: Colors.textDim, flex: 1, textAlign: "right" },

  // Quick actions
  quickRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  quickBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border,
  },
  quickBtnText: { fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.textMuted },
  statChip: {
    flexDirection: "row", alignItems: "center", gap: 4, marginLeft: "auto" as any,
    backgroundColor: Colors.gold + "12", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: Colors.gold + "30",
  },
  statChipText: { fontFamily: "Nunito_700Bold", fontSize: 11, color: Colors.gold },
  statChipSep: { color: Colors.textDim, fontSize: 11 },

  // Difficulty modal
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  diffModal: { borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: "hidden", maxHeight: "85%" },
  diffModalGrad: { padding: 22, paddingBottom: 36 },
  diffModalHandle: {
    width: 38, height: 4, backgroundColor: Colors.border, borderRadius: 2,
    alignSelf: "center", marginBottom: 18,
  },
  diffTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: Colors.gold, marginBottom: 4 },
  diffSub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted, marginBottom: 18 },
  diffGrid: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  diffOption: {
    flex: 1, minWidth: "18%", borderRadius: 12, overflow: "hidden",
    borderWidth: 1, borderColor: Colors.border,
  },
  diffOptionPressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
  diffOptionGrad: { padding: 10, alignItems: "center", gap: 5 },
  diffList: { gap: 8 },
  diffRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 12, overflow: "hidden",
  },
  diffRowIcon: {
    width: 46, height: 46, borderRadius: 12, borderWidth: 1,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  diffRowContent: { flex: 1, gap: 3 },
  diffRowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  diffRowDesc: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted, lineHeight: 16 },
  diffRowBottom: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  diffName: { fontFamily: "Nunito_700Bold", fontSize: 15 },
  diffReward: { flexDirection: "row", alignItems: "center", gap: 3 },
  diffRewardText: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted },
  expertBadge: {
    flexDirection: "row", alignItems: "center", gap: 2,
    borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2,
  },
  expertBadgeText: { fontFamily: "Nunito_700Bold", fontSize: 10 },

  // Daily reward modal
  dailyOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center" },
  dailyModal: { width: 300, borderRadius: 24, overflow: "hidden", borderWidth: 1.5, borderColor: Colors.gold + "44" },
  dailyGrad: { padding: 28, alignItems: "center", gap: 12 },
  dailyTitle: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.gold,
    letterSpacing: 2, textAlign: "center",
  },
  dailyIconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center",
    borderWidth: 2, marginVertical: 4,
  },
  dailyLabel: { fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.text, textAlign: "center" },
  dailyChips: { flexDirection: "row", gap: 10 },
  dailyChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.gold + "20", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.gold + "44",
  },
  dailyChipXp: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.border,
  },
  dailyChipText: { fontFamily: "Nunito_800ExtraBold", fontSize: 14, color: Colors.gold },
  dailyClaimBtn: { width: "100%", borderRadius: 14, overflow: "hidden" },
  dailyClaimGrad: { paddingVertical: 14, alignItems: "center" },
  dailyClaimText: { fontFamily: "Nunito_800ExtraBold", fontSize: 15, color: "#1a0a00", letterSpacing: 1 },

  // Multiplayer cards
  multiRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  multiCard: { flex: 1, borderRadius: 14, overflow: "hidden" },
  multiCardGrad: {
    padding: 14, gap: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 14, minHeight: 140,
  },
  multiCardIcon: {
    width: 42, height: 42, borderRadius: 12, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  multiCardTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 16 },
  multiCardDesc: { fontFamily: "Nunito_400Regular", fontSize: 10, color: Colors.textDim, flex: 1 },
  multiCardBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1,
    alignSelf: "flex-start",
  },
  multiCardBadgeText: { fontFamily: "Nunito_700Bold", fontSize: 9 },
  onlineDotPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#2ecc7118", borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  onlineDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#2ecc71" },
  onlineDotText: { fontFamily: "Nunito_800ExtraBold", fontSize: 8, color: "#2ecc71", letterSpacing: 1 },

  // Challenge Cards
  challengeCard: {
    width: 200,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    gap: 10,
    justifyContent: "space-between",
  },
  challengeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  challengeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  challengeTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
  },
  challengeDesc: {
    fontFamily: "Nunito_400Regular",
    fontSize: 10,
    lineHeight: 12,
  },
  challengeProgressWrap: {
    gap: 4,
  },
  challengeProgressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  challengeProgressText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 10,
  },
  challengeRewardText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
  },
  challengeProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  challengeProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  challengeClaimBtn: {
    borderRadius: 10,
    overflow: "hidden",
  },
  challengeClaimGrad: {
    paddingVertical: 8,
    alignItems: "center",
  },
  challengeClaimText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 12,
    color: "#1a0a00",
  },
  challengeClaimedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
  },
  challengeClaimedText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 12,
  },

  // Multiplayer modal
  multiModalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  multiModalBox: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36,
    gap: 10,
  },
  multiModalHeader: {
    flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4,
  },
  multiModalTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 17, color: "#63B3ED", flex: 1 },
  multiModalClose: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center",
  },
  multiModalSectionLabel: {
    fontFamily: "Nunito_700Bold", fontSize: 10, letterSpacing: 2,
  },
  multiCountRow: { flexDirection: "row", gap: 10 },
  multiCountBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, gap: 2,
  },
  multiCountBtnActive: {
    backgroundColor: "#63B3ED22", borderColor: "#63B3ED66",
  },
  multiCountBtnText: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 22,
  },
  multiCountBtnTextActive: { color: "#63B3ED" },
  multiCountBtnSub: { fontFamily: "Nunito_400Regular", fontSize: 10 },
  multiNameRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 2,
    borderWidth: 1,
  },
  multiNameDot: { width: 10, height: 10, borderRadius: 5 },
  multiNameInput: {
    flex: 1, fontFamily: "Nunito_700Bold", fontSize: 14,
    paddingVertical: 10,
  },
  multiStartBtn: { marginTop: 8, borderRadius: 14, overflow: "hidden" },
  multiStartBtnGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 15,
  },
  multiStartBtnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 15, color: "#fff", letterSpacing: 1 },
  multiModalHint: {
    fontFamily: "Nunito_400Regular", fontSize: 11, textAlign: "center", marginTop: 4,
  },
  // Watch Ads section
  adBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 12, overflow: "hidden",
  },
  adIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  adTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 14, letterSpacing: 0.5 },
  adDesc: { fontFamily: "Nunito_400Regular", fontSize: 11, marginTop: 2 },
  adCounter: {
    borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 4, minWidth: 36, alignItems: "center",
  },
  adCounterText: { fontFamily: "Nunito_700Bold", fontSize: 11 },
  // Watch Ad Modal
  adModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center" },
  adModalBox: {
    width: 280, borderRadius: 20, borderWidth: 1, paddingVertical: 30, paddingHorizontal: 24,
    alignItems: "center", gap: 12, overflow: "hidden",
  },
  adModalIcon: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  adModalTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 32 },
  adModalSub: { fontFamily: "Nunito_400Regular", fontSize: 13, textAlign: "center" },
  adCountdownWrap: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: "center", justifyContent: "center",
  },
  adCountdownNum: { fontFamily: "Nunito_800ExtraBold", fontSize: 28 },
  adRewardRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  adRewardText: { fontFamily: "Nunito_800ExtraBold", fontSize: 20 },
  adClaimBtn: { width: "100%", borderRadius: 12, overflow: "hidden", marginTop: 4 },
  adClaimGrad: { paddingVertical: 13, alignItems: "center" },
  adClaimText: { fontFamily: "Nunito_800ExtraBold", fontSize: 14, color: "#1a0a00", letterSpacing: 1 },
  adCancelBtn: { marginTop: 4 },
  adCancelText: { fontFamily: "Nunito_400Regular", fontSize: 13 },

  // Ranked Card
  rankedCard: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  rankedGrad: {
    ...StyleSheet.absoluteFillObject,
  },
  rankedCardContent: {
    padding: 16,
    gap: 12,
  },
  rankedHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  rankedIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(212,175,55,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D4AF3733",
  },
  rankedTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 18,
    color: "#D4AF37",
    letterSpacing: 1,
  },
  rankedSubtitle: {
    fontFamily: "Nunito_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    lineHeight: 14,
  },
  rankedStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  rankBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rankBadgeText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 12,
  },
  starsMini: {
    flexDirection: "row",
    gap: 4,
  },
  rankedAction: {
    borderRadius: 12,
    overflow: "hidden",
  },
  rankedBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  rankedBtnText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14,
    color: "#000",
    letterSpacing: 0.5,
  },
});

// ─── Chest Inventory Item ────────────────────────────────────────────────────
function ChestInventoryItem({ chest, onTap }: { chest: Chest; onTap: () => void }) {
  const cfg = CHEST_CONFIG[chest.type];
  const chestIcon = chest.type === "legendary" ? "star" :
    chest.type === "epic" ? "diamond" :
    chest.type === "rare" ? "cube-outline" : "cube";
  const bounce = useSharedValue(0);
  const glow = useSharedValue(0);
  useEffect(() => {
    bounce.value = withRepeat(
      withSequence(withTiming(-4, { duration: 500 }), withTiming(0, { duration: 500 })), -1, true
    );
    glow.value = withRepeat(
      withSequence(withTiming(1, { duration: 800 }), withTiming(0.4, { duration: 800 })), -1, false
    );
  }, []);
  const bounceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bounce.value }] }));
  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glow.value * 0.8,
    shadowRadius: glow.value * 12,
  }));
  return (
    <Pressable onPress={onTap}>
      <Animated.View style={[{
        width: 80, alignItems: "center", gap: 6,
        backgroundColor: cfg.bgColors[1],
        borderRadius: 12, padding: 12,
        borderWidth: 1.5, borderColor: cfg.borderColor,
        shadowColor: cfg.glowColor, shadowOffset: { width: 0, height: 0 }, elevation: 6,
      }, glowStyle]}>
        <Animated.View style={bounceStyle}>
          <Ionicons name={chestIcon as any} size={28} color={cfg.glowColor} />
        </Animated.View>
        <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 10, color: cfg.glowColor, textAlign: "center" }}>
          {cfg.name.replace("Cofre ", "")}
        </Text>
        <View style={{ backgroundColor: cfg.color + "33", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 10, color: cfg.glowColor }}>Abrir</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}
