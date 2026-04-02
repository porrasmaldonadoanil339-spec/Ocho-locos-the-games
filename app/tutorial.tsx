import React, { useState, useEffect } from "react";
import { useProfile } from "../context/ProfileContext";
import {
  View, Text, StyleSheet, Pressable, Platform, Dimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence,
  FadeIn, FadeOut,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { PlayingCard } from "../components/PlayingCard";
import { playSound } from "../lib/sounds";
import type { Card } from "../lib/gameEngine";
import { canPlay } from "../lib/gameEngine";

const { width: SW } = Dimensions.get("window");

// Tutorial demo cards
const DEMO_HAND: Card[] = [
  { id: "demo-1", suit: "hearts", rank: "7" },
  { id: "demo-2", suit: "spades", rank: "A" },
  { id: "demo-3", suit: "hearts", rank: "K" },
  { id: "demo-4", suit: "diamonds", rank: "3" },
  { id: "demo-5", suit: "clubs", rank: "8" },
];

const DEMO_TOP: Card = { id: "demo-top", suit: "hearts", rank: "5" };
const DEMO_STATE = {
  currentSuit: "hearts" as const,
  currentPlayer: "player" as const,
  discardPile: [DEMO_TOP],
  phase: "playing" as const,
  playerHand: DEMO_HAND,
  aiHand: [],
  drawPile: [],
  message: "",
  consecutiveDraws: 0,
  difficulty: "normal",
  pendingDraw: 0,
  pendingDrawType: null as "two" | "seven" | null,
  pendingDrawSuit: null as "hearts" | "diamonds" | "clubs" | "spades" | null,
  jActive: false,
  jSuit: null as "hearts" | "diamonds" | "clubs" | "spades" | null,
  direction: 1 as 1 | -1,
  turnId: 0,
  lastPlayedCard: null as any,
};

interface Step {
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  body: string;
  highlight?: string;
  interactive?: "play_card" | "pick_wild" | "done";
}

const STEPS: Step[] = [
  {
    title: "Bienvenido",
    subtitle: "Tutorial Interactivo",
    icon: "hand-right",
    iconColor: Colors.gold,
    body: "Aprenderás a jugar Ocho Locos en pocos pasos. Cada jugador recibe cartas y el primero en quedarse sin ninguna ¡GANA!",
  },
  {
    title: "El Objetivo",
    subtitle: "Vacía tu mano",
    icon: "trophy",
    iconColor: Colors.gold,
    body: "Debes deshacerte de todas tus cartas antes que el Rival. Juega cartas que coincidan en PALO o en NÚMERO con la carta superior de la pila.",
  },
  {
    title: "Jugar una carta",
    subtitle: "Toca la carta correcta",
    icon: "card",
    iconColor: Colors.blue,
    body: "La carta superior es el 5 de Corazones (♥). Puedes jugar cualquier carta de Corazones ♥ o cualquier carta con el número 5.",
    highlight: "Toca una carta válida para jugarla",
    interactive: "play_card",
  },
  {
    title: "Los Ochos Locos",
    subtitle: "¡El comodín!",
    icon: "star",
    iconColor: Colors.gold,
    body: "El 8 es especial — puedes jugarlo en cualquier momento. Después, eliges el palo que quieras continuar. ¡Úsalo estratégicamente!",
  },
  {
    title: "Robar Cartas",
    subtitle: "Cuando no puedes jugar",
    icon: "add-circle",
    iconColor: Colors.red,
    body: "Si ninguna de tus cartas coincide con la carta superior, debes robar una carta del mazo. Si la que robas puede jugarse, puedes jugarla de inmediato.",
  },
  {
    title: "Modos de Juego",
    subtitle: "Variedad y diversión",
    icon: "grid",
    iconColor: "#9B59B6",
    body: "Clásico (8 cartas), Relámpago (5 cartas y más rápido), Torneo (mejor de 3 rondas), Clasificatoria (4 jugadores), Desafíos y Práctica. ¡Cada modo tiene sus propias recompensas!",
  },
  {
    title: "Recompensas",
    subtitle: "Gana, colecciona, mejora",
    icon: "cash",
    iconColor: Colors.gold,
    body: "Cada victoria te da monedas y XP. Usa las monedas en la Tienda para obtener nuevos dorsos de cartas, avatares y títulos. El XP desbloquea el Pase de Batalla.",
  },
  {
    title: "¡Listo para jugar!",
    subtitle: "Suerte en la mesa",
    icon: "rocket",
    iconColor: Colors.success,
    body: "Ya conoces las bases. Recuerda: guarda tus 8 para momentos clave, observa las cartas del Rival y siempre planifica tu próxima jugada. ¡Buena suerte!",
    interactive: "done",
  },
];

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot, i === current && styles.dotActive, i < current && styles.dotPast]} />
      ))}
    </View>
  );
}

function InteractivePlayDemo({ onSuccess }: { onSuccess: () => void }) {
  const [played, setPlayed] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const shakeVal = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeVal.value }] }));

  const handleCardPress = async (card: Card) => {
    if (played) return;
    const playable = canPlay(card, DEMO_STATE);
    if (selected === card.id) {
      if (playable) {
        await playSound("card_play");
        setPlayed(card.id);
        setTimeout(onSuccess, 600);
      } else {
        await playSound("error");
        setWrong(card.id);
        shakeVal.value = withSequence(
          withTiming(8, { duration: 50 }), withTiming(-8, { duration: 50 }),
          withTiming(8, { duration: 50 }), withTiming(0, { duration: 50 })
        );
        setTimeout(() => setWrong(null), 400);
      }
    } else {
      await playSound("card_draw");
      setSelected(card.id);
    }
  };

  return (
    <View style={styles.interactiveDemo}>
      <View style={styles.demoTable}>
        <Text style={styles.demoLabel}>Carta superior:</Text>
        <PlayingCard card={DEMO_TOP} size="md" />
      </View>
      <Text style={styles.demoInstruct}>Tu mano — selecciona y toca de nuevo para jugar</Text>
      <Animated.View style={[styles.demoHand, shakeStyle]}>
        {DEMO_HAND.map((card, i) => {
          const playable = canPlay(card, DEMO_STATE);
          const isSelected = selected === card.id;
          const isPlayed = played === card.id;
          const isWrong = wrong === card.id;
          return (
            <View
              key={card.id}
              style={{
                marginLeft: i === 0 ? 0 : -16,
                zIndex: isSelected ? 50 : i,
                opacity: isPlayed ? 0.3 : 1,
                transform: [{ translateY: isSelected ? -12 : 0 }],
              }}
            >
              <PlayingCard
                card={card}
                onPress={() => handleCardPress(card)}
                isPlayable={playable && !isPlayed}
                isSelected={isSelected}
                size="md"
              />
            </View>
          );
        })}
      </Animated.View>
      {played && (
        <Animated.View entering={FadeIn} style={styles.successMsg}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          <Text style={styles.successText}>¡Perfecto!</Text>
        </Animated.View>
      )}
    </View>
  );
}

export default function TutorialScreen() {
  const insets = useSafeAreaInsets();
  const { markTutorialSeen } = useProfile();
  const [step, setStep] = useState(0);
  const [interactiveDone, setInteractiveDone] = useState(false);
  const slideX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const hasInteractive = !!current.interactive;
  const canAdvance = !hasInteractive || current.interactive === "done" || interactiveDone;

  const goNext = async () => {
    if (!canAdvance) return;
    await playSound("button_press");
    if (isLast) {
      markTutorialSeen();
      router.back();
      return;
    }
    opacity.value = withTiming(0, { duration: 150 }, () => {
      slideX.value = -30;
    });
    setTimeout(() => {
      setStep((s) => s + 1);
      setInteractiveDone(false);
      slideX.value = 30;
      opacity.value = withTiming(1, { duration: 200 });
      slideX.value = withSpring(0, { damping: 16 });
    }, 160);
  };

  const goBack = async () => {
    if (step === 0) { markTutorialSeen(); router.back(); return; }
    await playSound("button_press");
    opacity.value = withTiming(0, { duration: 150 });
    setTimeout(() => {
      setStep((s) => s - 1);
      setInteractiveDone(false);
      opacity.value = withTiming(1, { duration: 200 });
    }, 160);
  };

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: slideX.value }],
  }));

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}>
      <LinearGradient colors={["#061209", "#0a1a0f", "#0d2418"]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <Pressable onPress={() => { markTutorialSeen(); router.back(); }} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={Colors.textMuted} />
        </Pressable>
        <Text style={styles.headerTitle}>TUTORIAL</Text>
        <View style={{ width: 40 }} />
      </View>

      <ProgressDots total={STEPS.length} current={step} />

      <Animated.View style={[styles.stepCard, cardStyle]}>
        <View style={[styles.iconCircle, { backgroundColor: current.iconColor + "22" }]}>
          <Ionicons name={current.icon as any} size={36} color={current.iconColor} />
        </View>

        <Text style={styles.stepSubtitle}>{current.subtitle}</Text>
        <Text style={styles.stepTitle}>{current.title}</Text>

        <View style={styles.divider} />
        <Text style={styles.stepBody}>{current.body}</Text>

        {current.highlight && !interactiveDone && (
          <View style={styles.highlightBox}>
            <Ionicons name="hand-right" size={16} color={Colors.gold} />
            <Text style={styles.highlightText}>{current.highlight}</Text>
          </View>
        )}

        {current.interactive === "play_card" && (
          <InteractivePlayDemo onSuccess={() => setInteractiveDone(true)} />
        )}
      </Animated.View>

      <View style={styles.navRow}>
        <Pressable onPress={goBack} style={styles.navBack}>
          <Ionicons name="arrow-back" size={20} color={Colors.textMuted} />
          <Text style={styles.navBackText}>{step === 0 ? "Salir" : "Anterior"}</Text>
        </Pressable>

        <Pressable
          onPress={goNext}
          disabled={!canAdvance}
          style={({ pressed }) => [
            styles.navNext,
            !canAdvance && styles.navNextDisabled,
            pressed && canAdvance && { opacity: 0.85 },
          ]}
        >
          <LinearGradient
            colors={canAdvance ? [Colors.goldLight, Colors.gold] : [Colors.surface, Colors.surface]}
            style={styles.navNextGrad}
          >
            <Text style={[styles.navNextText, !canAdvance && { color: Colors.textDim }]}>
              {isLast ? "¡Empezar!" : "Siguiente"}
            </Text>
            <Ionicons name={isLast ? "rocket" : "arrow-forward"} size={18} color={canAdvance ? "#1a0a00" : Colors.textDim} />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 8,
  },
  closeBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.gold, letterSpacing: 3 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 5, marginBottom: 16 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.gold, width: 18 },
  dotPast: { backgroundColor: Colors.gold + "55" },
  stepCard: {
    flex: 1, marginHorizontal: 20, backgroundColor: Colors.surface,
    borderRadius: 24, padding: 24, alignItems: "center",
    borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  iconCircle: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  stepSubtitle: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted, letterSpacing: 1, textTransform: "uppercase" },
  stepTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 24, color: Colors.gold, textAlign: "center" },
  divider: { width: 60, height: 1.5, backgroundColor: Colors.border },
  stepBody: {
    fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.text,
    textAlign: "center", lineHeight: 22,
  },
  highlightBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.gold + "15", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.gold + "33",
  },
  highlightText: { fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.gold },
  interactiveDemo: { width: "100%", gap: 10, marginTop: 8 },
  demoTable: { alignItems: "center", gap: 6 },
  demoLabel: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted },
  demoInstruct: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted, textAlign: "center" },
  demoHand: { flexDirection: "row", justifyContent: "center", alignItems: "flex-end" },
  successMsg: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
  successText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.success },
  navRow: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 14, gap: 12 },
  navBack: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 14, paddingHorizontal: 18, borderRadius: 14,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  navBackText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.textMuted },
  navNext: { flex: 1, borderRadius: 14, overflow: "hidden" },
  navNextDisabled: { opacity: 0.5 },
  navNextGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14 },
  navNextText: { fontFamily: "Nunito_800ExtraBold", fontSize: 15, color: "#1a0a00" },
});
