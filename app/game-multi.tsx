import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  Modal, Platform, Dimensions, useWindowDimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence,
  withSpring, Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { useT } from "../hooks/useT";
import { PlayingCard } from "../components/PlayingCard";
import {
  MultiGameState, Card, Suit,
  initMultiGame, multiCanPlay, multiPlayCard, multiDraw, multiChooseSuit, multiConfirmTurn,
  suitName, suitSymbol, suitColor, multiGetTopCard,
} from "../lib/multiplayerEngine";
import { playCardFlip, playCardDraw, playButton, stopMusic } from "../lib/audioManager";
import { useProfile } from "../context/ProfileContext";
import { CARD_BACKS } from "../lib/storeItems";

const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
const PLAYER_COLORS = ["#D4AF37", "#27AE60", "#E74C3C", "#9B59B6"];
const PLAYER_ICONS: ("person" | "person-circle" | "happy" | "star")[] = ["person", "person-circle", "happy", "star"];

// ─── Small face-down card ────────────────────────────────────────────────
function FaceDownMini({ angle = 0 }: { angle?: number }) {
  const { profile } = useProfile();
  const cardBack = CARD_BACKS.find(b => b.id === profile.cardBackId) ?? CARD_BACKS[0];
  const backColors = (cardBack.backColors ?? ["#1E4080", "#0e2248", "#0a1832"]) as [string, string, string];
  const backAccent = cardBack.backAccent ?? "#D4AF37";
  return (
    <View style={[styles.faceDownMini, { transform: [{ rotate: `${angle}deg` }] }]}>
      <LinearGradient colors={backColors} style={StyleSheet.absoluteFill}>
        <Text style={[styles.faceDownDot, { color: backAccent }]}>◆</Text>
      </LinearGradient>
    </View>
  );
}

// ─── Opponent hand (horizontal fan) ─────────────────────────────────────
function OpponentFan({ count, name, color, highlight, iconName }: {
  count: number; name: string; color: string; highlight?: boolean; iconName?: string;
}) {
  const maxCards = Math.min(count, 8);
  return (
    <View style={styles.opponentFanWrap}>
      <View style={styles.opponentFanCards}>
        {Array.from({ length: maxCards }).map((_, i) => (
          <View key={i} style={{
            marginLeft: i === 0 ? 0 : -20,
            zIndex: i,
            transform: [{ rotate: `${(i - maxCards / 2) * 5}deg` }, { translateY: Math.abs(i - maxCards / 2) * 2 }],
          }}>
            <FaceDownMini />
          </View>
        ))}
      </View>
      <View style={styles.opponentFanLabel}>
        <View style={[styles.opponentAvatarRing, { borderColor: color + (highlight ? "cc" : "55"), backgroundColor: color + "18" }]}>
          <Ionicons name={(iconName ?? "person") as any} size={11} color={color} />
        </View>
        <Text style={[styles.opponentName, { color: highlight ? color : Colors.textMuted }]} numberOfLines={1}>{name}</Text>
        <View style={[styles.opponentCountBadge, { backgroundColor: color + "33", borderColor: color + "66" }]}>
          <Text style={[styles.opponentCountText, { color }]}>{count}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Side opponent (vertical fan) ────────────────────────────────────────
function SideOpponentFan({ count, name, color, side, iconName }: {
  count: number; name: string; color: string; side: "left" | "right"; iconName?: string;
}) {
  const maxCards = Math.min(count, 6);
  return (
    <View style={[styles.sideOpponentWrap, side === "right" && styles.sideOpponentRight]}>
      <View style={styles.sideOpponentCards}>
        {Array.from({ length: maxCards }).map((_, i) => (
          <View key={i} style={{ marginTop: i === 0 ? 0 : -24, zIndex: i }}>
            <FaceDownMini angle={side === "left" ? 90 : -90} />
          </View>
        ))}
      </View>
      <View style={styles.sideOpponentLabel}>
        <View style={[styles.opponentAvatarRing, { borderColor: color + "66", backgroundColor: color + "18" }]}>
          <Ionicons name={(iconName ?? "person") as any} size={10} color={color} />
        </View>
        <Text style={[styles.sideOpponentName, { color }]} numberOfLines={1}>{name}</Text>
        <View style={[styles.opponentCountBadge, { backgroundColor: color + "33", borderColor: color + "66" }]}>
          <Text style={[styles.opponentCountText, { color }]}>{count}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Direction arrow ─────────────────────────────────────────────────────
function DirectionArrow({ direction }: { direction: 1 | -1 }) {
  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withRepeat(
      withTiming(direction === 1 ? 360 : -360, { duration: 4000, easing: Easing.linear }),
      -1,
    );
  }, [direction]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  return (
    <Animated.Text style={[styles.dirArrow, style]}>
      {direction === 1 ? "↻" : "↺"}
    </Animated.Text>
  );
}

// ─── Suit picker ──────────────────────────────────────────────────────────
function SuitPicker({ onChoose }: { onChoose: (s: Suit) => void }) {
  const T = useT();
  return (
    <View style={styles.suitOverlay}>
      <Text style={styles.suitTitle}>{T("chooseSuit")}</Text>
      <View style={styles.suitGrid}>
        {SUITS.map(s => (
          <Pressable key={s} onPress={() => onChoose(s)} style={styles.suitBtn}>
            <Text style={[styles.suitSym, { color: suitColor(s) }]}>{suitSymbol(s)}</Text>
            <Text style={styles.suitLbl}>{suitName(s)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Pass device overlay ──────────────────────────────────────────────────
function PassDeviceOverlay({ playerName, playerColor, message, onReady }: {
  playerName: string; playerColor: string; message: string; onReady: () => void;
}) {
  const T = useT();
  const pulse = useSharedValue(0.96);
  useEffect(() => {
    pulse.value = withRepeat(withSequence(
      withTiming(1.04, { duration: 900 }),
      withTiming(0.96, { duration: 900 }),
    ), -1);
  }, []);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <View style={styles.passOverlay}>
      <LinearGradient colors={["#010805", "#020c08"]} style={StyleSheet.absoluteFill} />
      <View style={styles.passContent}>
        <View style={[styles.passAvatarRing, { borderColor: playerColor }]}>
          <Ionicons name="person" size={40} color={playerColor} />
        </View>
        <Text style={styles.passTurnLabel}>{T("turnOf")}</Text>
        <Text style={[styles.passPlayerName, { color: playerColor }]} numberOfLines={1}>{playerName}</Text>
        {message ? <Text style={styles.passMessage} numberOfLines={2}>{message}</Text> : null}
        <Text style={styles.passInstruction}>{T("passDevice")} {playerName}</Text>
        <Animated.View style={btnStyle}>
          <Pressable style={[styles.passBtn, { borderColor: playerColor }]} onPress={onReady}>
            <LinearGradient colors={[playerColor + "30", playerColor + "10"]} style={styles.passBtnInner}>
              <Ionicons name="eye-outline" size={20} color={playerColor} />
              <Text style={[styles.passBtnText, { color: playerColor }]}>{T("showMyCards")}</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Win overlay ──────────────────────────────────────────────────────────
function WinOverlay({ winnerName, winnerColor, onClose }: {
  winnerName: string; winnerColor: string; onClose: () => void;
}) {
  const T = useT();
  return (
    <View style={styles.winOverlay}>
      <LinearGradient colors={["#010805", "#020d06"]} style={StyleSheet.absoluteFill} />
      <View style={styles.winContent}>
        <Ionicons name="trophy" size={72} color={winnerColor} />
        <Text style={[styles.winSubtitle, { color: winnerColor, opacity: 0.7 }]}>{T("winner")}</Text>
        <Text style={[styles.winName, { color: winnerColor }]} numberOfLines={2}>{winnerName}</Text>
        <Pressable style={styles.winBtn} onPress={onClose}>
          <LinearGradient colors={[Colors.gold, Colors.gold + "bb"]} style={styles.winBtnGrad}>
            <Text style={styles.winBtnText}>{T("returnMenu")}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────
export default function MultiGameScreen() {
  const insets = useSafeAreaInsets();
  const { width: SW, height: SH } = useWindowDimensions();
  const params = useLocalSearchParams<{ names?: string; count?: string }>();
  const T = useT();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom + 4;
  const headerH = 50;
  const zoneH = SH - topPad - botPad - headerH;

  const tableW = Math.min(SW * 0.68, 260);
  const tableH = tableW * 0.56;
  const tableCenterY = zoneH * 0.42;
  const tableCenterX = SW / 2;

  const playerNames = React.useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => `${T("player")} ${i + 1}`);
  }, [T]);

  const [gameStarted, setGameStarted] = useState(false);
  const [playerCountSelect, setPlayerCountSelect] = useState(3);
  const [gameState, setGameState] = useState<MultiGameState>(() => initMultiGame(playerNames.slice(0, playerCountSelect)));

  useEffect(() => {
    if (gameState.phase === "game_over") {
      stopMusic().catch(() => {});
    }
  }, [gameState.phase]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  // Re-initialize when starting
  const handleStartGame = useCallback(() => {
    playButton().catch(() => {});
    const selectedNames = playerNames.slice(0, playerCountSelect);
    setGameState(initMultiGame(selectedNames));
    setGameStarted(true);
  }, [playerCountSelect, playerNames]);

  const pidx = gameState.currentPlayerIndex;
  const currentHand = gameState.hands[pidx] ?? [];
  const playerCount = gameState.playerCount;
  const topCard = multiGetTopCard(gameState);
  const isPlaying = gameState.phase === "playing";
  const cardSz = playerCount >= 3 ? "sm" : "md";
  const currentColor = PLAYER_COLORS[pidx % PLAYER_COLORS.length];
  const topSuitColor = suitColor(gameState.currentSuit);

  // Build opponent list (everyone except current player)
  const opponents = React.useMemo(() => {
    const arr = [];
    for (let i = 1; i < playerCount; i++) {
      const idx = (pidx + i) % playerCount;
      arr.push({ idx, name: playerNames[idx], color: PLAYER_COLORS[idx % PLAYER_COLORS.length] });
    }
    return arr;
  }, [pidx, playerCount, playerNames]);

  const handleCardPress = useCallback((card: Card) => {
    if (!isPlaying) return;
    if (!multiCanPlay(card, gameState)) { playCardFlip().catch(() => {}); return; }
    if (selectedCard?.id === card.id) {
      if (card.rank === "8" || (card.rank === "Joker" && gameState.pendingDraw === 0)) return;
      playCardFlip().catch(() => {});
      setGameState(multiPlayCard(gameState, card));
      setSelectedCard(null);
    } else {
      setSelectedCard(card);
    }
  }, [gameState, isPlaying, selectedCard]);

  const handleChooseSuit = useCallback((suit: Suit) => {
    if (!selectedCard) return;
    playCardFlip().catch(() => {});
    setGameState(multiPlayCard(gameState, selectedCard, suit));
    setSelectedCard(null);
  }, [gameState, selectedCard]);

  const handleDraw = useCallback(() => {
    if (!isPlaying) return;
    playCardDraw().catch(() => {});
    setGameState(multiDraw(gameState));
    setSelectedCard(null);
  }, [gameState, isPlaying]);

  // Opponent zone positions based on count
  const getOpponentPositions = () => {
    if (playerCount === 2) {
      return [{ ...opponents[0], pos: "top" as const }];
    }
    if (playerCount === 3) {
      return [
        { ...opponents[0], pos: "topLeft" as const },
        { ...opponents[1], pos: "topRight" as const },
      ];
    }
    if (playerCount === 4) {
      return [
        { ...opponents[0], pos: "right" as const },
        { ...opponents[1], pos: "top" as const },
        { ...opponents[2], pos: "left" as const },
      ];
    }
    // For 6 players
    return [
      { ...opponents[0], pos: "right" as const },
      { ...opponents[1], pos: "topRight" as const },
      { ...opponents[2], pos: "top" as const },
      { ...opponents[3], pos: "topLeft" as const },
      { ...opponents[4], pos: "left" as const },
    ];
  };

  const opponentPositions = getOpponentPositions();

  // Absolute positions for each opponent zone
  const posStyles: Record<string, object> = {
    top: {
      position: "absolute" as const, top: 4,
      left: 0, right: 0, alignItems: "center" as const,
    },
    topLeft: {
      position: "absolute" as const, top: 4,
      left: 8,
    },
    topRight: {
      position: "absolute" as const, top: 4,
      right: 8,
    },
    left: {
      position: "absolute" as const, top: tableCenterY - 70,
      left: 4,
    },
    right: {
      position: "absolute" as const, top: tableCenterY - 70,
      right: 4,
    },
  };

  if (!gameStarted) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <LinearGradient
          colors={["#051209", "#081a0d", "#0a1f10", "#081a0d", "#051209"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.header}>
          <Pressable onPress={() => { playButton().catch(() => {}); router.back(); }} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={18} color={Colors.gold} />
          </Pressable>
          <Text style={styles.configTitle}>{T("multiplayer")}</Text>
          <View style={{ width: 34 }} />
        </View>

        <View style={styles.configContainer}>
          <View style={styles.configCard}>
            <Ionicons name="people" size={48} color={Colors.gold} style={{ alignSelf: "center", marginBottom: 20 }} />
            <Text style={styles.configLabel}>{T("playerCount")}</Text>
            <View style={styles.chipRow}>
              {[2, 3, 4, 6].map(n => (
                <Pressable
                  key={n}
                  onPress={() => { playButton().catch(() => {}); setPlayerCountSelect(n); }}
                  style={[styles.chip, playerCountSelect === n && styles.chipActive]}
                >
                  <Text style={[styles.chipText, playerCountSelect === n && styles.chipTextActive]}>{n}P</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.configDesc}>
              {playerCountSelect} {T("players")} {T("local").toLowerCase()}. {T("passDevicePrompt") || "Pasa el dispositivo entre turnos."}
            </Text>

            <Pressable style={styles.startBtn} onPress={handleStartGame}>
              <LinearGradient colors={[Colors.gold, "#B8860B"]} style={styles.startBtnGrad}>
                <Ionicons name="play" size={20} color="#000" />
                <Text style={styles.startBtnText}>{T("startGame")}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <LinearGradient
        colors={["#051209", "#081a0d", "#0a1f10", "#081a0d", "#051209"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { height: headerH }]}>
        <Pressable onPress={() => { playButton().catch(() => {}); router.back(); }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={18} color={Colors.gold} />
        </Pressable>
        <View style={styles.headerMid}>
          <Ionicons name="people" size={12} color={Colors.textMuted} />
          <Text style={styles.headerTitle}>{playerCount} {T("players")} · {T("local")}</Text>
        </View>
        <View style={styles.deckBadge}>
          <Ionicons name="layers-outline" size={12} color={Colors.textDim} />
          <Text style={styles.deckCount}>{gameState.drawPile.length}</Text>
        </View>
      </View>

      {/* Game zone */}
      <View style={[styles.gameZone, { height: zoneH, paddingBottom: botPad }]}>

        {/* ─── Oval table ─── */}
        <View style={[styles.tableOval, {
          width: tableW, height: tableH,
          left: tableCenterX - tableW / 2,
          top: tableCenterY - tableH / 2,
          borderRadius: tableH / 2,
        }]}>
          <LinearGradient
            colors={["#0e3e10", "#0a2d0c", "#082409"]}
            style={[StyleSheet.absoluteFill, { borderRadius: tableH / 2 }]}
          />
          {/* Felt inner ring */}
          <View style={[styles.tableInnerRing, { borderRadius: (tableH - 14) / 2 }]} />

          {/* Table content */}
          <View style={styles.tableContent}>
            {/* Draw pile */}
            <Pressable onPress={handleDraw} disabled={!isPlaying} style={styles.drawPileBtn}>
              <View style={styles.drawPileStack}>
                {[2, 1, 0].map(i => (
                  <View key={i} style={[styles.drawCardAbs, { top: -i * 1.5, left: i * 1.5, zIndex: 3 - i }]}>
                    <LinearGradient colors={["#1E4080", "#0e2248"]} style={styles.drawCardInner}>
                      <Text style={styles.drawCardDot}>◆</Text>
                    </LinearGradient>
                  </View>
                ))}
              </View>
              {isPlaying && (
                <View style={[styles.drawLabel, { backgroundColor: gameState.pendingDraw > 0 ? Colors.red : Colors.gold }]}>
                  <Text style={styles.drawLabelText}>
                    {gameState.pendingDraw > 0 ? `+${gameState.pendingDraw}` : T("drawCard")}
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Direction arrow */}
            <View style={styles.dirArrowWrap}>
              <DirectionArrow direction={gameState.direction} />
              <Text style={[styles.suitOnTable, { color: topSuitColor }]}>{suitSymbol(gameState.currentSuit)}</Text>
            </View>

            {/* Discard pile */}
            <View style={styles.discardPileWrap}>
              {topCard && <PlayingCard card={topCard} size="sm" />}
            </View>
          </View>
        </View>

        {/* ─── Opponents ─── */}
        {opponentPositions.map(op => {
          const handCount = gameState.hands[op.idx].length;
          const isSkipped = gameState.lastSkipped === op.idx;
          if (op.pos === "left" || op.pos === "right") {
            return (
              <View key={op.idx} style={posStyles[op.pos]}>
                <SideOpponentFan count={handCount} name={op.name} color={op.color} side={op.pos} iconName={PLAYER_ICONS[op.idx % PLAYER_ICONS.length]} />
                {isSkipped && <Text style={styles.skipLabel}>⊗ {T("action_skip")}</Text>}
              </View>
            );
          }
          return (
            <View key={op.idx} style={posStyles[op.pos]}>
              <OpponentFan count={handCount} name={op.name} color={op.color} highlight={isSkipped} iconName={PLAYER_ICONS[op.idx % PLAYER_ICONS.length]} />
              {isSkipped && <Text style={styles.skipLabel}>⊗ {T("action_skip")}</Text>}
            </View>
          );
        })}

        {/* ─── Current player hand ─── */}
        <View style={[styles.playerZone, { top: tableCenterY + tableH / 2 + 10 }]}>
          <View style={styles.playerLabel}>
            <View style={[styles.opponentAvatarRing, { borderColor: currentColor, backgroundColor: currentColor + "22", width: 22, height: 22, borderRadius: 11 }]}>
              <Ionicons name={PLAYER_ICONS[pidx % PLAYER_ICONS.length]} size={13} color={currentColor} />
            </View>
            <Text style={[styles.playerName, { color: currentColor }]} numberOfLines={1}>
              {playerNames[pidx]} · {currentHand.length} {T("cards")}
            </Text>
            {isPlaying && gameState.pendingDraw > 0 && (
              <View style={[styles.pendingBadge, { backgroundColor: Colors.red + "22", borderColor: Colors.red + "66" }]}>
                <Text style={[styles.pendingText, { color: Colors.red }]}>+{gameState.pendingDraw}</Text>
              </View>
            )}
          </View>
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.handContainer}
          >
            {currentHand.map((card, i) => {
              const playable = isPlaying && multiCanPlay(card, gameState);
              const selected = selectedCard?.id === card.id;
              return (
                <View
                  key={card.id}
                  style={{
                    marginLeft: i === 0 ? 0 : cardSz === "sm" ? -20 : -16,
                    zIndex: selected ? 100 : i,
                    transform: [{ translateY: selected ? -10 : 0 }],
                  }}
                >
                  <PlayingCard
                    card={card}
                    onPress={() => handleCardPress(card)}
                    isPlayable={playable}
                    isSelected={selected}
                    size={cardSz}
                  />
                </View>
              );
            })}
          </ScrollView>
          {selectedCard && isPlaying && (
            <Text style={styles.selectedHint}>
              {(selectedCard.rank === "8" || (selectedCard.rank === "Joker" && gameState.pendingDraw === 0))
                ? "Toca de nuevo → elegir palo"
                : "Toca de nuevo para jugar"}
            </Text>
          )}
        </View>

        {/* Message bar */}
        <View style={[styles.messageBubble, { top: tableCenterY + tableH / 2 - 4 }]}>
          <Text style={styles.messageText} numberOfLines={1}>{gameState.message}</Text>
        </View>

      </View>

      {/* Suit picker */}
      {gameState.phase === "choosing_suit" && selectedCard && (
        <View style={StyleSheet.absoluteFill}>
          <SuitPicker onChoose={handleChooseSuit} />
        </View>
      )}

      {/* Pass device overlay */}
      {gameState.phase === "pass_device" && (
        <PassDeviceOverlay
          playerName={playerNames[pidx]}
          playerColor={currentColor}
          message={gameState.message}
          onReady={() => { playButton().catch(() => {}); setGameState(multiConfirmTurn(gameState)); setSelectedCard(null); }}
        />
      )}

      {/* Win overlay */}
      {gameState.phase === "game_over" && gameState.winnerIndex !== null && (
        <WinOverlay
          winnerName={playerNames[gameState.winnerIndex]}
          winnerColor={PLAYER_COLORS[gameState.winnerIndex % PLAYER_COLORS.length]}
          onClose={() => { playButton().catch(() => {}); router.back(); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#051209" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center",
  },
  headerMid: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.textMuted },
  deckBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  deckCount: { fontFamily: "Nunito_700Bold", fontSize: 11, color: Colors.textDim },

  gameZone: { flex: 1, position: "relative" },

  // Oval table
  tableOval: {
    position: "absolute",
    borderWidth: 2.5, borderColor: Colors.gold + "55",
    overflow: "hidden",
    shadowColor: Colors.gold, shadowOpacity: 0.15, shadowRadius: 20,
    elevation: 8,
  },
  tableInnerRing: {
    position: "absolute", inset: 6,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  tableContent: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 12,
  },
  drawPileBtn: { alignItems: "center", justifyContent: "center" },
  drawPileStack: { width: 44, height: 60, position: "relative" },
  drawCardAbs: { position: "absolute", width: 40, height: 56, borderRadius: 6, overflow: "hidden" },
  drawCardInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  drawCardDot: { fontSize: 8, color: Colors.gold, opacity: 0.25 },
  drawLabel: {
    marginTop: 4, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, alignSelf: "center",
  },
  drawLabelText: { fontFamily: "Nunito_800ExtraBold", fontSize: 8, color: "#fff" },
  dirArrowWrap: { alignItems: "center", gap: 2 },
  dirArrow: { fontSize: 18, color: Colors.gold, opacity: 0.6 },
  suitOnTable: { fontSize: 16, fontFamily: "Nunito_800ExtraBold" },
  discardPileWrap: { alignItems: "center", justifyContent: "center" },

  // Opponents
  opponentFanWrap: { alignItems: "center", gap: 4 },
  opponentFanCards: { flexDirection: "row", alignItems: "flex-end" },
  opponentFanLabel: { flexDirection: "row", alignItems: "center", gap: 5 },
  opponentDot: { width: 7, height: 7, borderRadius: 3.5 },
  opponentAvatarRing: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  opponentName: { fontFamily: "Nunito_700Bold", fontSize: 10, maxWidth: 80 },
  opponentCountBadge: {
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, borderWidth: 1,
  },
  opponentCountText: { fontFamily: "Nunito_800ExtraBold", fontSize: 9 },
  skipLabel: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 9, color: Colors.red,
    marginTop: 2, letterSpacing: 1,
  },

  // Side opponents
  sideOpponentWrap: { alignItems: "center", gap: 4 },
  sideOpponentRight: {},
  sideOpponentCards: { alignItems: "center" },
  sideOpponentLabel: { flexDirection: "row", alignItems: "center", gap: 4 },
  sideOpponentName: { fontFamily: "Nunito_700Bold", fontSize: 9, maxWidth: 52 },

  faceDownMini: {
    width: 30, height: 44, borderRadius: 5,
    overflow: "hidden", borderWidth: 1, borderColor: Colors.gold + "44",
  },
  faceDownDot: { fontSize: 7, color: Colors.gold, opacity: 0.3, textAlign: "center", marginTop: 16 },

  // Current player
  playerZone: {
    position: "absolute", left: 0, right: 0, gap: 4,
  },
  playerLabel: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16,
  },
  playerDot: { width: 9, height: 9, borderRadius: 4.5 },
  playerName: { fontFamily: "Nunito_700Bold", fontSize: 13, flex: 1 },
  pendingBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1,
  },
  pendingText: { fontFamily: "Nunito_800ExtraBold", fontSize: 11 },
  handContainer: { paddingHorizontal: 12, paddingVertical: 4 },
  selectedHint: {
    fontFamily: "Nunito_700Bold", fontSize: 10, color: Colors.gold,
    textAlign: "center", marginTop: 2,
  },

  messageBubble: {
    position: "absolute", left: 16, right: 16,
    backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
  },
  messageText: { fontFamily: "Nunito_700Bold", fontSize: 11, color: Colors.textMuted },

  // Suit picker
  suitOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center", justifyContent: "center", gap: 20,
  },
  suitTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 18, color: Colors.gold, letterSpacing: 2 },
  suitGrid: { flexDirection: "row", gap: 14, flexWrap: "wrap", justifyContent: "center" },
  suitBtn: {
    width: 80, height: 80, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center",
    gap: 4, borderWidth: 1, borderColor: Colors.border,
  },
  suitSym: { fontSize: 28, fontFamily: "Nunito_800ExtraBold" },
  suitLbl: { fontFamily: "Nunito_700Bold", fontSize: 10, color: Colors.textMuted },

  // Pass device overlay
  passOverlay: { position: "absolute", inset: 0, zIndex: 200, alignItems: "center", justifyContent: "center" },
  passContent: { alignItems: "center", gap: 10, paddingHorizontal: 28 },
  passAvatarRing: {
    width: 90, height: 90, borderRadius: 45, borderWidth: 3,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  passTurnLabel: {
    fontFamily: "Nunito_700Bold", fontSize: 10, color: Colors.textDim, letterSpacing: 4, marginTop: 4,
  },
  passPlayerName: { fontFamily: "Nunito_800ExtraBold", fontSize: 34, textAlign: "center" },
  passMessage: {
    fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.textMuted, textAlign: "center",
    backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 10, maxWidth: 300,
  },
  passInstruction: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textDim, textAlign: "center" },
  passBtn: { marginTop: 18, borderRadius: 18, overflow: "hidden", borderWidth: 2, width: 270 },
  passBtnInner: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 17, paddingHorizontal: 24,
  },
  passBtnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 14, letterSpacing: 1 },

  // Win overlay
  winOverlay: { position: "absolute", inset: 0, zIndex: 300, alignItems: "center", justifyContent: "center" },
  winContent: { alignItems: "center", gap: 10 },
  winSubtitle: { fontFamily: "Nunito_700Bold", fontSize: 12, letterSpacing: 5 },
  winName: { fontFamily: "Nunito_800ExtraBold", fontSize: 42, textAlign: "center", paddingHorizontal: 20 },
  winBtn: { marginTop: 24, borderRadius: 16, overflow: "hidden", width: 250 },
  winBtnGrad: { paddingVertical: 16, alignItems: "center" },
  winBtnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 15, color: "#1a0a00" },

  // Config Screen
  configTitle: { fontFamily: "Nunito_700Bold", fontSize: 18, color: Colors.gold },
  configContainer: { flex: 1, padding: 20, justifyContent: "center" },
  configCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  configLabel: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  chipRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 24,
  },
  chip: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  chipActive: {
    backgroundColor: Colors.gold + "22",
    borderColor: Colors.gold,
  },
  chipText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 16,
    color: Colors.textDim,
  },
  chipTextActive: {
    color: Colors.gold,
  },
  configDesc: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: Colors.textDim,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 32,
  },
  startBtn: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  startBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  startBtnText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 16,
    color: "#1a0a00",
  },
});
