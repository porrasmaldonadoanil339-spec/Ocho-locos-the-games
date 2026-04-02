import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, Pressable, TextInput, Platform,
  KeyboardAvoidingView, ScrollView, ActivityIndicator, Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence,
  withSpring, FadeIn, FadeInDown, FadeInUp, SlideInDown, Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { Colors } from "../constants/colors";
import { useT } from "../hooks/useT";
import { useProfile } from "../context/ProfileContext";
import { getSocket, ensureDisconnected } from "../lib/onlineSocket";
import { getLocalizedRankInfo } from "../lib/ranked";
import { playButton, startMenuMusic } from "../lib/audioManager";
import { CPU_PROFILES } from "../lib/cpuProfiles";
import { playSound } from "../lib/sounds";

const ACCENT = Colors.gold;

interface PlayerInfo {
  name: string;
  playerIndex: number;
  avatarColor: string;
  avatarIcon: string;
  photoUrl?: string;
  level: number;
  rankColor: string;
  rankIcon: string;
  rankName: string;
}

type Phase =
  | "select"
  | "matchmaking"
  | "create_room"
  | "join_room"
  | "pre_match"
  | "countdown"
  | "direct_search"
  | "direct_found";

const FAKE_RANK_NAMES = ["Hierro 5", "Hierro 4", "Hierro 3", "Bronce 5", "Bronce 4", "Plata 5", "Hierro 2", "Bronce 3", "Plata 4", "Oro 5"];
const FAKE_RANK_COLORS = ["#8B7355", "#CD7F32", "#A8A8A8", "#D4AF37", "#4A90D9"];

const CPU_PROFILES_WITH_PHOTO = CPU_PROFILES.filter(p => p.photoUrl);

function makeFakePlayer(idx: number): PlayerInfo {
  const pool = CPU_PROFILES_WITH_PHOTO.length > 5 ? CPU_PROFILES_WITH_PHOTO : CPU_PROFILES;
  const seed = ((idx + 1) * 13 + Date.now() % 71) % pool.length;
  const cpu = pool[seed];
  const rankSeed = seed % FAKE_RANK_NAMES.length;
  return {
    name: cpu.name,
    playerIndex: idx,
    avatarColor: cpu.avatarColor,
    avatarIcon: cpu.avatarIcon,
    photoUrl: cpu.photoUrl,
    level: cpu.level,
    rankColor: FAKE_RANK_COLORS[seed % FAKE_RANK_COLORS.length],
    rankIcon: "shield",
    rankName: FAKE_RANK_NAMES[rankSeed],
  };
}

function SpinnerIcon() {
  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withRepeat(withTiming(360, { duration: 1000, easing: Easing.linear }), -1);
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  return (
    <Animated.View style={style}>
      <Ionicons name="reload" size={28} color={ACCENT} />
    </Animated.View>
  );
}

function PulseDot({ color }: { color: string }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.4, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1,
    );
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[styles.onlineDot, { backgroundColor: color }, style]} />;
}

function PlayerSlot({ player, isSelf, delay = 0 }: { player: PlayerInfo | null; isSelf?: boolean; delay?: number }) {
  const T = useT();
  if (!player) {
    return (
      <View style={[styles.playerSlot, styles.playerSlotEmpty]}>
        <View style={styles.slotAvatarWrap}>
          <SpinnerIcon />
        </View>
        <Text style={styles.slotSearching}>{T("searching")}</Text>
        <View style={[styles.onlineDot, { backgroundColor: "#555" }]} />
      </View>
    );
  }
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.playerSlot}>
      <View style={[styles.slotAvatarWrap, { borderColor: isSelf ? ACCENT : player.avatarColor }]}>
        {player.photoUrl ? (
          <Image source={{ uri: player.photoUrl }} style={styles.slotAvatarPhoto} />
        ) : (
          <Ionicons name={player.avatarIcon as any} size={22} color={isSelf ? ACCENT : player.avatarColor} />
        )}
      </View>
      <View style={styles.slotInfo}>
        <Text style={[styles.slotName, { color: isSelf ? ACCENT : "#fff" }]} numberOfLines={1}>
          {player.name}{isSelf ? ` (${T("you")})` : ""}
        </Text>
        <Text style={styles.slotSub}>{T("levelAbbr" as any)}{player.level} · {player.rankName}</Text>
      </View>
      <PulseDot color="#2ecc71" />
    </Animated.View>
  );
}

function PreMatchTeamCard({ players, teamName, isMyTeam }: { players: PlayerInfo[]; teamName: string; isMyTeam: boolean }) {
  const T = useT();
  return (
    <Animated.View entering={FadeInDown.duration(500)} style={[styles.teamCard, isMyTeam && styles.teamCardSelf]}>
      <Text style={[styles.teamLabel, { color: isMyTeam ? ACCENT : "#E74C3C" }]}>{teamName}</Text>
      {players.map((p, i) => (
        <View key={i} style={styles.preMatchSlot}>
          <View style={[styles.preMatchAvatar, { borderColor: p.avatarColor }]}>
            <Ionicons name={p.avatarIcon as any} size={18} color={p.avatarColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.preMatchName} numberOfLines={1}>{p.name}</Text>
            <Text style={styles.preMatchSub}>{T("levelAbbr" as any)}{p.level} · {p.rankName}</Text>
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

export default function OnlineLobbyScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { profile, level } = useProfile();
  const T = useT();
  const params = useLocalSearchParams<{ mode?: string; playerCount?: string; directSearch?: string }>();

  const mode = params.mode ?? "classic";
  const playerCount = parseInt(params.playerCount ?? "2", 10);
  const directSearch = params.directSearch === "true";

  const lang = profile.language ?? "es";
  const rankInfo = getLocalizedRankInfo(profile.rankedProfile, lang);

  const myProfile: PlayerInfo = {
    name: profile.name || T("you"),
    playerIndex: 0,
    avatarColor: rankInfo.color,
    avatarIcon: "person",
    level: level,
    rankColor: rankInfo.color,
    rankIcon: rankInfo.icon,
    rankName: rankInfo.displayName,
  };

  const [phase, setPhase] = useState<Phase>(directSearch ? "direct_search" : "select");
  const [fakePlayers, setFakePlayers] = useState<PlayerInfo[]>([]);
  const [foundPlayers, setFoundPlayers] = useState<PlayerInfo[]>([myProfile]);
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [myPlayerIndex, setMyPlayerIndex] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [preMatchData, setPreMatchData] = useState<{ code: string; myPlayerIndex: number; players: PlayerInfo[] } | null>(null);

  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const countAnim = useSharedValue(1);

  const cleanup = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    socketRef.current?.off("room_created");
    socketRef.current?.off("room_joined");
    socketRef.current?.off("join_error");
    socketRef.current?.off("player_joined");
    socketRef.current?.off("matchmaking_joined");
    socketRef.current?.off("matchmaking_found");
    socketRef.current?.off("pre_match");
    socketRef.current?.off("matchmaking_status");
  }, []);

  useEffect(() => {
    startMenuMusic().catch(() => {});
    return () => {
      cleanup();
    };
  }, []);

  // ── Direct fake matchmaking flow ─────────────────────────────────────────────
  const directSearchTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const latestFakePlayers = useRef<PlayerInfo[]>([]);
  useEffect(() => { latestFakePlayers.current = fakePlayers; }, [fakePlayers]);

  function startDirectGame() {
    const allFakes = latestFakePlayers.current;
    const names = allFakes.map(p => p.name).join(",");
    router.replace({
      pathname: "/game-online",
      params: {
        count: String(playerCount),
        mode: mode,
        skipLobby: "true",
        names: names,
      },
    });
  }

  useEffect(() => {
    if (!directSearch) return;
    const needed = playerCount - 1; // fake players needed
    const timers: ReturnType<typeof setTimeout>[] = [];
    playSound("searching").catch(() => {});

    // Add fake players one by one with staggered delays (~10s total search)
    for (let i = 0; i < needed; i++) {
      const delay = 2000 + i * 2500 + Math.floor(Math.random() * 600);
      const t = setTimeout(() => {
        const fp = makeFakePlayer(i + 1);
        setFakePlayers(prev => [...prev, fp]);
      }, delay);
      timers.push(t);
    }

    // After all fake players "joined", show found screen (~10s total)
    const foundDelay = Math.max(8500, 2000 + needed * 2500 + 1000) + Math.floor(Math.random() * 1500);
    const t2 = setTimeout(() => {
      playSound("win").catch(() => {});
      setPhase("direct_found");
    }, foundDelay);
    timers.push(t2);

    // Start game after showing found screen
    const gameDelay = foundDelay + 2200;
    const t3 = setTimeout(() => {
      startDirectGame();
    }, gameDelay);
    timers.push(t3);

    directSearchTimers.current = timers;
    return () => timers.forEach(t => clearTimeout(t));
  }, [directSearch]);

  function buildProfilePayload() {
    return {
      playerName: myProfile.name,
      avatarColor: myProfile.avatarColor,
      avatarIcon: myProfile.avatarIcon,
      level: myProfile.level,
      rankColor: myProfile.rankColor,
      rankIcon: myProfile.rankIcon,
      rankName: myProfile.rankName,
    };
  }

  function connectSocket() {
    try {
      const s = getSocket();
      socketRef.current = s;

      s.off("pre_match");
      s.on("pre_match", (data: { code: string; myPlayerIndex: number; players: PlayerInfo[] }) => {
        setPreMatchData(data);
        setMyPlayerIndex(data.myPlayerIndex);
        setFoundPlayers(data.players);
        setPhase("pre_match");
      });

      s.off("player_left");
      s.on("player_left", ({ playerIndex }: { playerIndex: number }) => {
        setFoundPlayers(prev => prev.filter(p => p.playerIndex !== playerIndex));
      });

      return s;
    } catch {
      return null;
    }
  }

  function handleQuickMatch() {
    playButton().catch(() => {});
    playSound("searching").catch(() => {});
    const s = connectSocket();
    if (!s) return;
    setPhase("matchmaking");

    s.off("matchmaking_joined");
    s.off("matchmaking_found");
    s.off("matchmaking_status");

    s.on("matchmaking_joined", ({ queueSize }: { queueSize: number }) => {
      setFoundPlayers([myProfile]);
    });

    s.on("matchmaking_found", ({ code, playerIndex, players }: { code: string; playerIndex: number; players: PlayerInfo[] }) => {
      setRoomCode(code);
      setMyPlayerIndex(playerIndex);
      setFoundPlayers(players);
    });

    s.emit("join_matchmaking", {
      ...buildProfilePayload(),
      mode,
      playerCount,
    });
  }

  function handleCreateRoom() {
    playButton().catch(() => {});
    const s = connectSocket();
    if (!s) return;

    s.off("room_created");
    s.off("player_joined");

    s.on("room_created", ({ code, playerIndex, players }: { code: string; playerIndex: number; players: PlayerInfo[] }) => {
      setRoomCode(code);
      setMyPlayerIndex(playerIndex);
      setFoundPlayers(players);
      setPhase("create_room");
    });

    s.on("player_joined", ({ players }: { players: PlayerInfo[] }) => {
      setFoundPlayers(players);
    });

    s.emit("create_room", {
      ...buildProfilePayload(),
      maxPlayers: playerCount,
      mode,
    });

    setPhase("create_room");
  }

  function handleJoinRoom() {
    if (joinCode.trim().length < 4) {
      setJoinError(T("enterValidCode" as any));
      return;
    }
    playButton().catch(() => {});
    const s = connectSocket();
    if (!s) return;

    s.off("room_joined");
    s.off("join_error");
    s.off("player_joined");

    s.on("room_joined", ({ code, playerIndex, players }: { code: string; playerIndex: number; players: PlayerInfo[] }) => {
      setRoomCode(code);
      setMyPlayerIndex(playerIndex);
      setFoundPlayers(players);
      setJoinError("");
    });

    s.on("join_error", ({ error }: { error: string }) => {
      setJoinError(error);
    });

    s.on("player_joined", ({ players }: { players: PlayerInfo[] }) => {
      setFoundPlayers(players);
    });

    s.emit("join_room", {
      code: joinCode.trim().toUpperCase(),
      ...buildProfilePayload(),
    });
  }

  function startCountdown(code: string, pidx: number) {
    setPhase("countdown");
    setCountdown(3);
    let c = 3;
    countdownRef.current = setInterval(() => {
      c--;
      if (c <= 0) {
        clearInterval(countdownRef.current!);
        navigateToGame(code, pidx);
      } else {
        setCountdown(c);
        countAnim.value = withSequence(withTiming(1.3, { duration: 150 }), withSpring(1));
      }
    }, 1000);
  }

  useEffect(() => {
    if (phase === "pre_match" && preMatchData) {
      const t = setTimeout(() => {
        startCountdown(preMatchData.code, preMatchData.myPlayerIndex);
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [phase, preMatchData]);

  function navigateToGame(code: string, pidx: number) {
    router.replace(`/game-online?code=${encodeURIComponent(code)}&pidx=${pidx}&mode=${encodeURIComponent(mode)}&count=${playerCount}`);
  }

  function handleBack() {
    playButton().catch(() => {});
    socketRef.current?.emit("leave_room");
    socketRef.current?.emit("cancel_matchmaking");
    cleanup();
    ensureDisconnected();
    router.back();
  }

  const countStyle = useAnimatedStyle(() => ({ transform: [{ scale: countAnim.value }] }));

  if (phase === "countdown") {
    return (
      <View style={styles.fullBg}>
        <LinearGradient colors={["#02060e", "#041020", "#02060e"]} style={StyleSheet.absoluteFill} />
        <Animated.Text style={[styles.countdownNumber, countStyle]}>{countdown}</Animated.Text>
        <Text style={styles.countdownLabel}>{T("startingNow" as any)}</Text>
      </View>
    );
  }

  if (phase === "pre_match" && preMatchData) {
    const players = preMatchData.players;
    const midpoint = Math.ceil(players.length / 2);
    const team1 = players.slice(0, midpoint);
    const team2 = players.slice(midpoint);
    const myTeam = myPlayerIndex < midpoint ? 1 : 2;

    return (
      <View style={[styles.fullBg, { paddingTop: topPad + 10, paddingBottom: botPad + 10 }]}>
        <LinearGradient colors={["#020810", "#041530", "#08050a"]} style={StyleSheet.absoluteFill} />

        <Animated.Text entering={FadeInDown.duration(500)} style={styles.preMatchTitle}>
          {T("matchFound")}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={styles.preMatchTitleSub}>
          {T("getReady" as any)}
        </Animated.Text>

        <View style={styles.teamsContainer}>
          <PreMatchTeamCard
            players={team1}
            teamName={T("playersCount" as any)}
            isMyTeam={myTeam === 1}
          />
        </View>

        <Animated.View entering={FadeInUp.delay(500).duration(500)} style={styles.preMatchFooter}>
          <Text style={styles.preMatchCountdown}>{T("startingSoon" as any)}</Text>
          <View style={styles.preMatchBar}>
            <LinearGradient colors={[ACCENT, "#A07800"]} style={styles.preMatchBarFill} />
          </View>
        </Animated.View>
      </View>
    );
  }

  if (phase === "direct_search" || phase === "direct_found") {
    const isFound = phase === "direct_found";

    // ── First interface: player slot list (all modes) ──────────────────────
    const allPlayers = [{ ...myProfile, playerIndex: 0 }, ...fakePlayers];

    return (
      <View style={[styles.fullBg, { paddingTop: topPad + 10, paddingBottom: botPad + 10 }]}>
        <LinearGradient colors={["#020810", "#041530", "#08050a"]} style={StyleSheet.absoluteFill} />

        <View style={styles.header}>
          <Pressable onPress={() => { directSearchTimers.current.forEach(t => clearTimeout(t)); router.back(); }} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={ACCENT} />
          </Pressable>
          <Text style={styles.headerTitle}>
            {isFound ? T("rivalFound" as any) : T("searchingMatch" as any)}
          </Text>
        </View>

        <View style={styles.matchmakingContent}>
          {!isFound && <SpinnerIcon />}
          {isFound && (
            <Animated.View entering={FadeIn.duration(400)}>
              <Ionicons name="checkmark-circle" size={64} color="#27AE60" />
            </Animated.View>
          )}

          <Text style={[styles.matchmakingLabel, isFound && { color: "#27AE60" }]}>
            {isFound ? T("rivalFound" as any) : T("waitingPlayers")}
          </Text>

          <View style={styles.slotsList}>
            {Array.from({ length: playerCount }).map((_, i) => (
              <PlayerSlot
                key={i}
                player={i === 0 ? myProfile : (fakePlayers[i - 1] ?? null)}
                isSelf={i === 0}
                delay={i * 200}
              />
            ))}
          </View>

          {!isFound && (
            <Pressable onPress={() => { directSearchTimers.current.forEach(t => clearTimeout(t)); router.back(); }} style={styles.cancelBtn}>
              <Text style={styles.cancelTxt}>{T("cancelSearch" as any)}</Text>
            </Pressable>
          )}
          {isFound && (
            <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.preMatchBar}>
              <LinearGradient colors={[ACCENT, "#A07800"]} style={styles.preMatchBarFill} />
            </Animated.View>
          )}
        </View>
      </View>
    );
  }

  if (phase === "matchmaking") {
    return (
      <View style={[styles.fullBg, { paddingTop: topPad, paddingBottom: botPad }]}>
        <LinearGradient colors={["#020810", "#041530", "#020810"]} style={StyleSheet.absoluteFill} />

        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={ACCENT} />
          </Pressable>
          <Text style={styles.headerTitle}>{T("searchingMatch" as any)}</Text>
        </View>

        <View style={styles.matchmakingContent}>
          <SpinnerIcon />
          <Text style={styles.matchmakingLabel}>{T("waitingPlayers")}</Text>
          <Text style={styles.matchmakingSub}>{foundPlayers.length}/{playerCount} {T("foundCount" as any)}</Text>

          <View style={styles.slotsList}>
            {Array.from({ length: playerCount }).map((_, i) => (
              <PlayerSlot
                key={i}
                player={foundPlayers[i] ?? null}
                isSelf={i === 0 || (foundPlayers[i]?.playerIndex === myPlayerIndex)}
                delay={i * 100}
              />
            ))}
          </View>

          <Pressable onPress={() => {
            socketRef.current?.emit("cancel_matchmaking");
            setPhase("select");
          }} style={styles.cancelBtn}>
            <Text style={styles.cancelTxt}>{T("cancelSearch" as any)}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (phase === "create_room") {
    return (
      <View style={[styles.fullBg, { paddingTop: topPad, paddingBottom: botPad }]}>
        <LinearGradient colors={["#020810", "#04100a", "#020810"]} style={StyleSheet.absoluteFill} />

        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={ACCENT} />
          </Pressable>
          <Text style={styles.headerTitle}>{T("privateRoom" as any)}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.roomContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.codeLabel}>{T("roomCode" as any)}</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{roomCode}</Text>
          </View>
          {roomCode ? (
            <Animated.View entering={FadeIn.delay(300).duration(500)} style={styles.qrBox}>
              <QRCode
                value={`ocholocos://join/${roomCode}`}
                size={150}
                color={ACCENT}
                backgroundColor="transparent"
              />
            </Animated.View>
          ) : null}
          <Text style={styles.codeSub}>{T("shareCodeFriends" as any)}</Text>

          <View style={styles.slotsList}>
            <Text style={styles.playersHeader}>{T("playersCount" as any)} ({foundPlayers.length}/{playerCount})</Text>
            {Array.from({ length: playerCount }).map((_, i) => (
              <PlayerSlot
                key={i}
                player={foundPlayers[i] ?? null}
                isSelf={foundPlayers[i]?.playerIndex === myPlayerIndex}
                delay={i * 80}
              />
            ))}
          </View>

          {foundPlayers.length < playerCount && (
            <View style={styles.waitingRow}>
              <ActivityIndicator size="small" color={ACCENT} />
              <Text style={styles.waitingTxt}>{T("waitingMorePlayers" as any)}</Text>
            </View>
          )}

          {/* Ranked: start immediately with bots filling empty slots */}
          {mode === "ranked" && myPlayerIndex === 0 && (
            <Animated.View entering={FadeInDown.delay(400).duration(400)}>
              <Pressable
                onPress={() => {
                  playButton().catch(() => {});
                  socketRef.current?.emit("start_game", { botFill: true });
                }}
                style={({ pressed }) => [styles.startBotsBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
              >
                <LinearGradient
                  colors={[Colors.gold, "#A07800"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.startBotsBtnGrad}
                >
                  <Ionicons name="flash" size={20} color="#000" />
                  <Text style={styles.startBotsTxt}>
                    {foundPlayers.length >= playerCount ? "INICIAR PARTIDA" : "INICIAR CON BOTS"}
                  </Text>
                </LinearGradient>
              </Pressable>
              {foundPlayers.length < playerCount && (
                <Text style={styles.startBotsHint}>
                  Los espacios vacíos se llenarán con bots
                </Text>
              )}
            </Animated.View>
          )}
        </ScrollView>
      </View>
    );
  }

  if (phase === "join_room") {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.fullBg, { paddingTop: topPad, paddingBottom: botPad }]}>
          <LinearGradient colors={["#020810", "#04100a", "#020810"]} style={StyleSheet.absoluteFill} />

          <View style={styles.header}>
            <Pressable onPress={() => { playButton().catch(() => {}); setPhase("select"); }} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color={ACCENT} />
            </Pressable>
            <Text style={styles.headerTitle}>{T("joinRoom").toUpperCase()}</Text>
          </View>

          <View style={styles.joinContent}>
            <Ionicons name="people" size={52} color={ACCENT} />
            <Text style={styles.joinTitle}>{T("enterRoomCode" as any)}</Text>
            <Text style={styles.joinSub}>{T("askFriendCode" as any)}</Text>

            <TextInput
              style={styles.codeInput}
              value={joinCode}
              onChangeText={v => { setJoinCode(v.toUpperCase()); setJoinError(""); }}
              placeholder={T("roomCode")}
              placeholderTextColor="#555"
              maxLength={8}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            {joinError ? <Text style={styles.errorTxt}>{joinError}</Text> : null}

            <Pressable onPress={handleJoinRoom} style={styles.joinBtn}>
              <LinearGradient colors={[ACCENT, "#A07800"]} style={styles.joinBtnGrad}>
                <Text style={styles.joinBtnTxt}>{T("joinRoomBtn").toUpperCase()}</Text>
              </LinearGradient>
            </Pressable>

            {foundPlayers.length > 1 && (
              <View style={styles.slotsList}>
                <Text style={styles.playersHeader}>{T("inRoom" as any)} ({foundPlayers.length}/{playerCount})</Text>
                {foundPlayers.map((p, i) => (
                  <PlayerSlot key={i} player={p} isSelf={p.playerIndex === myPlayerIndex} delay={i * 80} />
                ))}
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.fullBg, { paddingTop: topPad, paddingBottom: botPad }]}>
      <LinearGradient colors={["#020810", "#04100a", "#080520"]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={ACCENT} />
        </Pressable>
        <Text style={styles.headerTitle}>{T("onlineMultiplayer" as any)}</Text>
      </View>

      <View style={styles.selectContent}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <View style={styles.myCard}>
            <View style={[styles.myAvatar, { borderColor: rankInfo.color }]}>
              <Ionicons name={(profile.avatarId ?? "person") as any} size={28} color={rankInfo.color} />
            </View>
            <View>
              <Text style={styles.myName}>{profile.name || T("player" as any)}</Text>
              <Text style={[styles.myRank, { color: rankInfo.color }]}>
                <Ionicons name={rankInfo.icon as any} size={11} /> {rankInfo.displayName}
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={{ width: "100%", gap: 14 }}>
          <Pressable onPress={handleQuickMatch} style={styles.optionBtn}>
            <LinearGradient
              colors={["#0A1520", "#122040", "#0A1520"]}
              style={styles.optionBtnGrad}
            >
              <View style={styles.optionIconWrap}>
                <Ionicons name="flash" size={28} color={ACCENT} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>{T("quickMatch")}</Text>
                <Text style={styles.optionSub}>{T("quickMatchSub" as any)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={ACCENT + "88"} />
            </LinearGradient>
          </Pressable>

          <Pressable onPress={handleCreateRoom} style={styles.optionBtn}>
            <LinearGradient
              colors={["#100a20", "#20154A", "#100a20"]}
              style={styles.optionBtnGrad}
            >
              <View style={[styles.optionIconWrap, { backgroundColor: "#9B59B622" }]}>
                <Ionicons name="add-circle" size={28} color="#9B59B6" />
              </View>
              <View style={styles.optionInfo}>
                <Text style={[styles.optionTitle, { color: "#9B59B6" }]}>{T("createRoom").toUpperCase()}</Text>
                <Text style={styles.optionSub}>{T("createRoomSub" as any)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9B59B688" />
            </LinearGradient>
          </Pressable>

          <Pressable onPress={() => { playButton().catch(() => {}); setPhase("join_room"); }} style={styles.optionBtn}>
            <LinearGradient
              colors={["#0a1a10", "#152A18", "#0a1a10"]}
              style={styles.optionBtnGrad}
            >
              <View style={[styles.optionIconWrap, { backgroundColor: "#27AE6022" }]}>
                <Ionicons name="enter" size={28} color="#27AE60" />
              </View>
              <View style={styles.optionInfo}>
                <Text style={[styles.optionTitle, { color: "#27AE60" }]}>{T("joinWithCode" as any)}</Text>
                <Text style={styles.optionSub}>{T("joinWithCodeSub" as any)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#27AE6088" />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.footerNote}>
          {T("syncNote" as any)}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullBg: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
    borderBottomColor: "rgba(212,175,55,0.1)",
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 14, color: ACCENT, letterSpacing: 2,
  },
  selectContent: {
    flex: 1, paddingHorizontal: 20, paddingTop: 24, gap: 20, alignItems: "center",
  },
  myCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16,
    paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1,
    borderColor: "rgba(212,175,55,0.15)",
  },
  myAvatar: {
    width: 50, height: 50, borderRadius: 25, borderWidth: 2,
    alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)",
  },
  myName: { fontFamily: "Nunito_700Bold", fontSize: 15, color: "#fff" },
  myRank: { fontFamily: "Nunito_400Regular", fontSize: 12, marginTop: 2 },
  optionBtn: { width: "100%", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  optionBtnGrad: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 16, paddingVertical: 16,
  },
  optionIconWrap: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: ACCENT + "22",
    alignItems: "center", justifyContent: "center",
  },
  optionInfo: { flex: 1, gap: 3 },
  optionTitle: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 13, color: ACCENT, letterSpacing: 1,
  },
  optionSub: { fontFamily: "Nunito_400Regular", fontSize: 11, color: "rgba(255,255,255,0.45)" },
  footerNote: {
    fontFamily: "Nunito_400Regular", fontSize: 11,
    color: "rgba(255,255,255,0.3)", textAlign: "center", paddingHorizontal: 20,
  },
  matchmakingContent: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 24,
  },
  matchmakingLabel: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 18, color: ACCENT, letterSpacing: 2,
  },
  matchmakingSub: {
    fontFamily: "Nunito_400Regular", fontSize: 13, color: "rgba(255,255,255,0.5)",
  },
  slotsList: { width: "100%", gap: 8, marginTop: 8 },
  playerSlot: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
  },
  playerSlotEmpty: { borderStyle: "dashed", borderColor: "rgba(255,255,255,0.12)" },
  slotAvatarWrap: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 2,
    alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)",
    overflow: "hidden",
  },
  slotAvatarPhoto: { width: 44, height: 44, borderRadius: 22 },
  slotInfo: { flex: 1, gap: 2 },
  slotName: { fontFamily: "Nunito_700Bold", fontSize: 14 },
  slotSub: { fontFamily: "Nunito_400Regular", fontSize: 11, color: "rgba(255,255,255,0.4)" },
  slotSearching: { flex: 1, fontFamily: "Nunito_400Regular", fontSize: 13, color: "rgba(255,255,255,0.3)" },
  onlineDot: { width: 10, height: 10, borderRadius: 5 },
  cancelBtn: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 24 },
  cancelTxt: { fontFamily: "Nunito_700Bold", fontSize: 13, color: "rgba(255,255,255,0.35)" },
  qrBox: {
    alignItems: "center", justifyContent: "center",
    padding: 16, backgroundColor: "rgba(212,175,55,0.06)",
    borderRadius: 16, borderWidth: 1, borderColor: ACCENT + "33",
    alignSelf: "center",
  },
  codeLabel: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 12, color: ACCENT, letterSpacing: 3,
    textAlign: "center",
  },
  codeBox: {
    backgroundColor: "rgba(212,175,55,0.08)", borderRadius: 16,
    borderWidth: 2, borderColor: ACCENT + "55",
    paddingHorizontal: 32, paddingVertical: 18, alignItems: "center",
  },
  codeText: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 36, color: ACCENT, letterSpacing: 10,
  },
  codeSub: {
    fontFamily: "Nunito_400Regular", fontSize: 12, color: "rgba(255,255,255,0.45)", textAlign: "center",
  },
  playersHeader: {
    fontFamily: "Nunito_700Bold", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 2,
  },
  waitingRow: {
    flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "center", marginTop: 12,
  },
  waitingTxt: { fontFamily: "Nunito_400Regular", fontSize: 12, color: "rgba(255,255,255,0.4)" },
  startBotsBtn: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  startBotsBtnGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16, paddingHorizontal: 24,
  },
  startBotsTxt: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: "#000", letterSpacing: 1 },
  startBotsHint: {
    fontFamily: "Nunito_400Regular", fontSize: 11, color: "rgba(255,255,255,0.35)",
    textAlign: "center", marginTop: 6,
  },
  roomContent: { paddingHorizontal: 20, paddingTop: 24, gap: 16 },
  joinContent: {
    flex: 1, alignItems: "center", paddingHorizontal: 24, paddingTop: 32, gap: 16,
  },
  joinTitle: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: "#fff", textAlign: "center",
  },
  joinSub: {
    fontFamily: "Nunito_400Regular", fontSize: 13, color: "rgba(255,255,255,0.45)", textAlign: "center",
  },
  codeInput: {
    width: "100%", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 20, paddingVertical: 16,
    fontFamily: "Nunito_800ExtraBold", fontSize: 28, color: "#fff",
    letterSpacing: 8, textAlign: "center",
  },
  errorTxt: {
    fontFamily: "Nunito_700Bold", fontSize: 13, color: "#E74C3C", textAlign: "center",
  },
  joinBtn: { width: "100%", borderRadius: 14, overflow: "hidden", marginTop: 4 },
  joinBtnGrad: {
    alignItems: "center", justifyContent: "center", paddingVertical: 16,
  },
  joinBtnTxt: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: "#1a0a00", letterSpacing: 2,
  },
  teamsContainer: { flex: 1, paddingHorizontal: 20, justifyContent: "center", gap: 12 },
  teamCard: {
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 16, gap: 10,
  },
  teamCardSelf: { borderColor: ACCENT + "44", backgroundColor: "rgba(212,175,55,0.06)" },
  teamLabel: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 11, letterSpacing: 3, marginBottom: 2,
  },
  preMatchSlot: { flexDirection: "row", alignItems: "center", gap: 12 },
  preMatchAvatar: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 2,
    alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)",
  },
  preMatchName: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "#fff" },
  preMatchSub: { fontFamily: "Nunito_400Regular", fontSize: 11, color: "rgba(255,255,255,0.4)" },
  vsContainer: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4 },
  vsLine: { flex: 1, height: 1 },
  vsCircle: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "#1a0a00",
    borderWidth: 2, borderColor: ACCENT, alignItems: "center", justifyContent: "center",
  },
  vsText: { fontFamily: "Nunito_800ExtraBold", fontSize: 14, color: ACCENT, letterSpacing: 1 },
  preMatchTitle: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: ACCENT, letterSpacing: 3,
    textAlign: "center", marginBottom: 2,
  },
  preMatchTitleSub: {
    fontFamily: "Nunito_400Regular", fontSize: 13, color: "rgba(255,255,255,0.5)",
    textAlign: "center", marginBottom: 8,
  },
  preMatchFooter: { alignItems: "center", gap: 8, paddingHorizontal: 24 },
  preMatchCountdown: {
    fontFamily: "Nunito_700Bold", fontSize: 13, color: "rgba(255,255,255,0.5)",
  },
  preMatchBar: {
    width: "100%", height: 4, borderRadius: 2, backgroundColor: "rgba(212,175,55,0.2)",
    overflow: "hidden",
  },
  preMatchBarFill: { flex: 1 },
  countdownNumber: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 96, color: ACCENT, textAlign: "center",
  },
  countdownLabel: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: "rgba(255,255,255,0.6)",
    letterSpacing: 4, textAlign: "center",
  },
  vsSearchCenter: {
    flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, gap: 28,
  },
  vsSearchTitle: {
    fontFamily: "Nunito_700Bold", fontSize: 16, color: "rgba(255,255,255,0.6)",
    letterSpacing: 2, textAlign: "center",
  },
  vsCirclesRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 0, width: "100%",
  },
  vsPlayerCol: { flex: 1, alignItems: "center", gap: 10 },
  vsAvatarRing: {
    width: 100, height: 100, borderRadius: 50, borderWidth: 3,
    overflow: "hidden", alignItems: "center", justifyContent: "center",
  },
  vsAvatarInner: {
    width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center",
  },
  vsAvatarPhoto: { width: 100, height: 100 },
  vsPlayerNameTxt: {
    fontFamily: "Nunito_700Bold", fontSize: 14, color: "#FFFFFF", textAlign: "center", maxWidth: 120,
  },
  vsPlayerRankTxt: {
    fontFamily: "Nunito_400Regular", fontSize: 11, color: "rgba(255,255,255,0.4)", textAlign: "center",
  },
  vsMiddleCol: { width: 48, alignItems: "center", justifyContent: "center", gap: 0 },
  vsVertLine: { width: 2, height: 36 },
  vsMiddleCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(212,175,55,0.15)", borderWidth: 1, borderColor: ACCENT + "44",
    alignItems: "center", justifyContent: "center",
  },
  vsMiddleText: { fontFamily: "Nunito_800ExtraBold", fontSize: 13, color: ACCENT, letterSpacing: 1 },
  vsFoundRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  vsFoundText: { fontFamily: "Nunito_700Bold", fontSize: 15, color: "#27AE60" },
  vsSearchingDots: {
    fontFamily: "Nunito_400Regular", fontSize: 13, color: "rgba(255,255,255,0.4)", textAlign: "center",
  },
});
