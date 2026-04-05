import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useSegments, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { Animated, View, Text, Image, StyleSheet, Platform, Dimensions, TextInput, Pressable, LogBox } from "react-native";

LogBox.ignoreLogs([
  '"shadow*" style props are deprecated',
  '"textShadow*" style props are deprecated',
  'props.pointerEvents is deprecated',
]);
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { queryClient } from "../lib/query-client";
import { GameProvider } from "../context/GameContext";
import { ProfileProvider } from "../context/ProfileContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { NetworkProvider, useNetwork } from "../context/NetworkContext";
import { OfflineScreen } from "../components/OfflineScreen";
import { LinearGradient } from "expo-linear-gradient";
import {
  useFonts,
  Nunito_400Regular,
  Nunito_700Bold,
  Nunito_800ExtraBold as Nunito_800ExtraBold_Asset,
} from "@expo-google-fonts/nunito";
import { StatusBar } from "expo-status-bar";
import { initAudio, preloadSounds, startMenuMusic, startGameMusic, stopMusic, syncSettings } from "../lib/audioManager";
import { useProfile } from "../context/ProfileContext";
import { useT } from "../hooks/useT";
import { playSound } from "../lib/sounds";
import { scheduleAllNotifications, requestNotificationPermissions } from "../lib/notifications";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

SplashScreen.preventAutoHideAsync();

let splashShownThisSession = false;

function Particle({ delay }: { delay: number }) {
  const moveAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const sideAnim = useRef(new Animated.Value(0)).current;

  const randomX = useMemo(() => (Math.random() - 0.5) * 300, []);
  const randomTargetX = useMemo(() => randomX + (Math.random() - 0.5) * 100, []);
  const duration = useMemo(() => 3000 + Math.random() * 2000, []);

  useEffect(() => {
    const nativeDriver = Platform.OS !== "web";
    
    const startAnimation = () => {
      moveAnim.setValue(0);
      opacityAnim.setValue(0);
      sideAnim.setValue(randomX);

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(moveAnim, {
            toValue: -SCREEN_HEIGHT * 0.6,
            duration: duration,
            useNativeDriver: nativeDriver,
          }),
          Animated.timing(sideAnim, {
            toValue: randomTargetX,
            duration: duration,
            useNativeDriver: nativeDriver,
          }),
          Animated.sequence([
            Animated.timing(opacityAnim, {
              toValue: 0.6,
              duration: 500,
              useNativeDriver: nativeDriver,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: duration - 500,
              useNativeDriver: nativeDriver,
            }),
          ]),
        ]),
      ]).start(() => startAnimation());
    };

    startAnimation();
  }, []);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          opacity: opacityAnim,
          transform: [
            { translateY: moveAnim },
            { translateX: sideAnim },
          ],
        },
      ]}
    />
  );
}

const STUDIO_DURATION = 5000;
const LOADING_DURATION = 20000;

const LOADING_MESSAGES = [
  "Iniciando motor de juego…",
  "Cargando cartas…",
  "Preparando la mesa…",
  "Reuniendo jugadores…",
  "Sincronizando progreso…",
  "¡Listo para jugar!",
];

// Decorative card suits for the loading screen background
const CARD_SUITS = ["♠", "♥", "♦", "♣", "8", "★", "♠", "♣"];
const SUIT_POSITIONS = [
  { top: "8%",  left: "5%",  size: 48, opacity: 0.07, color: "#D4AF37" },
  { top: "12%", right: "8%", size: 36, opacity: 0.06, color: "#E53935" },
  { top: "30%", left: "2%",  size: 26, opacity: 0.05, color: "#fff" },
  { top: "38%", right: "4%", size: 32, opacity: 0.06, color: "#D4AF37" },
  { top: "55%", left: "8%",  size: 22, opacity: 0.05, color: "#E53935" },
  { top: "60%", right: "6%", size: 40, opacity: 0.06, color: "#fff" },
  { top: "75%", left: "3%",  size: 30, opacity: 0.05, color: "#D4AF37" },
  { top: "78%", right: "3%", size: 20, opacity: 0.04, color: "#E53935" },
];

interface SplashAuthProps {
  isFirstLaunch: boolean;
  onGuestLogin: () => void;
  onGoogleLogin: () => void;
  onFacebookLogin: () => void;
}

function CustomSplashScreen({ onComplete, authProps }: { onComplete: () => void; authProps?: SplashAuthProps }) {
  const T = useT();
  const nativeDriver = Platform.OS !== "web";

  // Phase 1 — Studio
  const studioFade = useRef(new Animated.Value(0)).current;
  const studioScale = useRef(new Animated.Value(0.82)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;

  // Phase 2 — Loading
  const loadingFade = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.88)).current;
  const loadAnim = useRef(new Animated.Value(0)).current;
  const [loadPct, setLoadPct] = useState(1);
  const [loadMsg, setLoadMsg] = useState(LOADING_MESSAGES[0]);
  const [phase, setPhase] = useState<"studio" | "loading">("studio");
  const [loadingDone, setLoadingDone] = useState(false);
  const loginButtonsOpacity = useRef(new Animated.Value(0)).current;
  const authPropsRef = useRef(authProps);
  useEffect(() => { authPropsRef.current = authProps; }, [authProps]);

  useEffect(() => {
    // ── Phase 1: Studio logo ──────────────────────────────────────────────
    Animated.parallel([
      Animated.timing(studioFade, { toValue: 1, duration: 700, useNativeDriver: nativeDriver }),
      Animated.spring(studioScale, { toValue: 1, friction: 7, tension: 45, useNativeDriver: nativeDriver }),
    ]).start();

    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1.45, duration: 1200, useNativeDriver: nativeDriver }),
      Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: nativeDriver }),
    ])).start();

    // Startup fanfare
    setTimeout(() => { playSound("win").catch(() => {}); }, 300);

    // ── Transition to Phase 2 ─────────────────────────────────────────────
    const studioTimer = setTimeout(() => {
      Animated.timing(studioFade, { toValue: 0, duration: 600, useNativeDriver: nativeDriver }).start(() => {
        setPhase("loading");

        // Fade in loading screen
        Animated.parallel([
          Animated.timing(loadingFade, { toValue: 1, duration: 600, useNativeDriver: nativeDriver }),
          Animated.spring(titleScale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: nativeDriver }),
        ]).start();

        // Progress bar
        Animated.timing(loadAnim, {
          toValue: 1,
          duration: LOADING_DURATION - 1000,
          useNativeDriver: false,
        }).start();

        // Progress text steps
        const stepMs = (LOADING_DURATION - 1000) / LOADING_MESSAGES.length;
        const steps = LOADING_MESSAGES.map((msg, i) =>
          setTimeout(() => {
            setLoadMsg(msg);
            setLoadPct(Math.round(((i + 1) / LOADING_MESSAGES.length) * 100));
          }, i * stepMs)
        );

        // Exit after loading completes (or show login buttons for first launch)
        const exitTimer = setTimeout(() => {
          if (authPropsRef.current?.isFirstLaunch) {
            setLoadingDone(true);
            Animated.timing(loginButtonsOpacity, { toValue: 1, duration: 500, useNativeDriver: nativeDriver }).start();
          } else {
            Animated.timing(loadingFade, {
              toValue: 0,
              duration: 800,
              useNativeDriver: nativeDriver,
            }).start(() => onComplete());
          }
        }, LOADING_DURATION);

        return () => { steps.forEach(clearTimeout); clearTimeout(exitTimer); };
      });
    }, STUDIO_DURATION);

    return () => clearTimeout(studioTimer);
  }, []);

  const loadBarWidth = loadAnim.interpolate({ inputRange: [0, 1], outputRange: ["1%", "100%"] });

  return (
    <View style={[styles.splashOverlay, StyleSheet.absoluteFillObject]}>

      {/* ── PHASE 1: STUDIO LOGO ─────────────────────────────────────── */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: studioFade, zIndex: 2 }]}>
        <LinearGradient colors={["#000000", "#05050F", "#000000"]} style={StyleSheet.absoluteFill} />

        <View style={styles.particlesContainer}>
          {[...Array(8)].map((_, i) => <Particle key={i} delay={i * 350} />)}
        </View>

        <Animated.View style={[styles.studioCenterWrap, { transform: [{ scale: studioScale }] }]}>
          <View style={styles.logoContainer}>
            <Animated.View style={[styles.glow, { transform: [{ scale: glowAnim }], opacity: Animated.multiply(glowAnim, 0.28) }]} />
            <Image
              source={require("@/assets/images/biyis-logo.png")}
              resizeMode="contain"
              style={{ width: 200, height: 200 }}
            />
          </View>
          <Text style={styles.splashBrand}>BIYIS PRIME STUDIOS</Text>
          <Text style={styles.splashPresenta}>PRESENTA</Text>
        </Animated.View>
      </Animated.View>

      {/* ── PHASE 2: GAME COVER LOADING ──────────────────────────────── */}
      {phase === "loading" && (
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: loadingFade, zIndex: 1, justifyContent: "center", alignItems: "center" }]}>
          <LinearGradient
            colors={["#010D03", "#041008", "#000000"]}
            style={StyleSheet.absoluteFill}
          />

          {/* Casino felt texture overlay */}
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(2, 25, 8, 0.6)" }]} />

          {/* Decorative card suits background */}
          {SUIT_POSITIONS.map((pos, i) => (
            <Text
              key={i}
              style={{
                position: "absolute",
                top: pos.top as any,
                left: (pos as any).left,
                right: (pos as any).right,
                fontSize: pos.size,
                color: pos.color,
                opacity: pos.opacity,
                fontFamily: "Nunito_700Bold",
              }}
            >
              {CARD_SUITS[i]}
            </Text>
          ))}

          {/* Outer ring decoration */}
          <View style={styles.coverRingOuter} />
          <View style={styles.coverRingInner} />

          {/* Center content */}
          <Animated.View style={[styles.coverCenter, { transform: [{ scale: titleScale }] }]}>
            {/* Mini card icons row */}
            <View style={styles.coverCardsRow}>
              {["♠", "♥", "♦", "♣"].map((suit, i) => (
                <View key={i} style={[styles.coverCardMini, { borderColor: i % 2 === 1 ? "#E53935" : "#D4AF37" }]}>
                  <Text style={[styles.coverCardSuit, { color: i % 2 === 1 ? "#E53935" : "#D4AF37" }]}>{suit}</Text>
                </View>
              ))}
            </View>

            <View style={styles.coverTitleWrap}>
              <Text style={styles.coverTitleMain}>OCHO LOCOS</Text>
              <Text style={styles.coverTitleSub}>EL JUEGO DE CARTAS MÁS LOCO</Text>
            </View>

            <View style={styles.coverDivider} />

            {/* Loading bar */}
            <View style={styles.loadingBarContainer}>
              <View style={styles.loadingBarTrack}>
                <Animated.View style={[styles.loadingBarFill, { width: loadBarWidth }]}>
                  <LinearGradient
                    colors={["#7B5800", "#D4AF37", "#F5D76E", "#D4AF37"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.loadingBarShine} />
                </Animated.View>
              </View>
              <View style={styles.loadingBarFooter}>
                <Text style={styles.loadingMsg}>{loadMsg}</Text>
                <Text style={styles.loadingPct}>{loadPct}%</Text>
              </View>
            </View>
          </Animated.View>

          <Text style={styles.dataInfoText}>Sincronizando datos... (no consume datos móviles)</Text>
          <Text style={styles.versionText}>Versión 3.0.0</Text>

          {/* Login buttons — only shown on first launch after loading */}
          {authProps?.isFirstLaunch && (
            <Animated.View style={[styles.splashLoginArea, { opacity: loginButtonsOpacity, pointerEvents: loadingDone ? "auto" : "none" }]}>
              <Text style={styles.splashLoginTitle}>{T("splashConnectTitle")}</Text>
              <Text style={styles.splashLoginSub}>{T("splashConnectSub")}</Text>

              <Pressable style={styles.splashBtnGoogle} onPress={() => { authProps.onGoogleLogin(); }}>
                <View style={styles.splashBtnGoogleIcon}>
                  <Text style={{ fontSize: 14, fontFamily: "Nunito_700Bold" }}>
                    <Text style={{ color: "#EA4335" }}>G</Text>
                    <Text style={{ color: "#4285F4" }}>o</Text>
                    <Text style={{ color: "#FBBC05" }}>o</Text>
                    <Text style={{ color: "#34A853" }}>g</Text>
                    <Text style={{ color: "#EA4335" }}>l</Text>
                    <Text style={{ color: "#4285F4" }}>e</Text>
                  </Text>
                </View>
                <Text style={styles.splashBtnText}>{T("splashContinueGoogle")}</Text>
              </Pressable>

              <Pressable style={styles.splashBtnFacebook} onPress={() => { authProps.onFacebookLogin(); }}>
                <Ionicons name="logo-facebook" size={20} color="#fff" />
                <Text style={[styles.splashBtnText, { color: "#fff" }]}>{T("splashContinueFacebook")}</Text>
              </Pressable>

              <Pressable style={styles.splashBtnGuest} onPress={() => { authProps.onGuestLogin(); }}>
                <Ionicons name="person-outline" size={18} color="#95A5A6" />
                <Text style={styles.splashBtnGuestText}>{T("splashPlayGuest")}</Text>
              </Pressable>
              <Text style={styles.splashGuestNote}>{T("splashGuestNoteText")}</Text>
            </Animated.View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

// Routes that should play game music (not menu music)
// NOTE: "game-online" is intentionally excluded — it manages its own music
// (menu music plays during the lobby/searching/dealing phase, then game-online
// itself calls startGameMusic() only when the actual match begins).
const GAME_MUSIC_ROUTES = ["game", "game-multi"];
function isGameRoute(segments: string[]): boolean {
  return segments.some(s => GAME_MUSIC_ROUTES.includes(s));
}

function AudioManager() {
  const segments = useSegments();
  const isFirstRun = useRef(true);
  const { profile, isLoaded } = useProfile();

  // One-time init — no cleanup (music should outlive this effect)
  useEffect(() => {
    if (!isLoaded) return;
    initAudio().then(() => {
      syncSettings(profile.musicEnabled, profile.sfxEnabled);
      preloadSounds().catch(() => {});
      const inGame = isGameRoute(segments as string[]);
      if (inGame) {
        startGameMusic().catch(() => {});
      } else {
        startMenuMusic().catch(() => {});
      }
    });
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    syncSettings(profile.musicEnabled, profile.sfxEnabled);
  }, [profile.musicEnabled, profile.sfxEnabled, isLoaded]);

  // React to route changes — skip the very first run (handled by init above)
  useEffect(() => {
    if (!isLoaded) return;
    if (isFirstRun.current) { isFirstRun.current = false; return; }
    const inGame = isGameRoute(segments as string[]);
    if (inGame) {
      startGameMusic().catch(() => {});
    } else {
      startMenuMusic().catch(() => {});
    }
  }, [segments.join(","), isLoaded]);

  return null;
}

function NotificationManager() {
  const { profile, isLoaded } = useProfile();
  const initialized = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (initialized.current) return;
    initialized.current = true;
    if (Platform.OS !== "web") {
      requestNotificationPermissions().catch(() => {});
      scheduleAllNotifications({
        notificationsEnabled: profile.notificationsEnabled ?? true,
        missionNotifications: profile.missionNotifications ?? true,
        rewardNotifications: profile.rewardNotifications ?? true,
        eventNotifications: profile.eventNotifications ?? true,
        reminderNotifications: profile.reminderNotifications ?? true,
      }).catch(() => {});
    }
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded || !initialized.current) return;
    if (Platform.OS !== "web") {
      scheduleAllNotifications({
        notificationsEnabled: profile.notificationsEnabled ?? true,
        missionNotifications: profile.missionNotifications ?? true,
        rewardNotifications: profile.rewardNotifications ?? true,
        eventNotifications: profile.eventNotifications ?? true,
        reminderNotifications: profile.reminderNotifications ?? true,
      }).catch(() => {});
    }
  }, [
    profile.notificationsEnabled,
    profile.missionNotifications,
    profile.rewardNotifications,
    profile.eventNotifications,
    profile.reminderNotifications,
  ]);

  return null;
}

function SplashWithAuth({ onComplete }: { onComplete: () => void }) {
  const { user, isLoading, loginAsGuest } = useAuth();
  const [authResolved, setAuthResolved] = useState(false);
  const autoLoginDone = useRef(false);

  useEffect(() => {
    if (!isLoading) setAuthResolved(true);
  }, [isLoading]);

  // Auto-login as guest on first launch — no login screen shown
  useEffect(() => {
    if (authResolved && !user && !autoLoginDone.current) {
      autoLoginDone.current = true;
      loginAsGuest();
    }
  }, [authResolved, user]);

  return <CustomSplashScreen onComplete={onComplete} />;
}

function SplashOAuthModal({ provider, onDone, onCancel }: {
  provider: "google" | "facebook";
  onDone: () => void;
  onCancel: () => void;
}) {
  const T = useT();
  const { loginWithGoogle, loginWithFacebook } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"email" | "password" | "success">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isGoogle = provider === "google";
  const providerColor = isGoogle ? "#EA4335" : "#1877F2";
  const providerName = isGoogle ? "Google" : "Facebook";

  const EMAIL_REGEX_LOCAL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const handleNext = async () => {
    if (step === "email") {
      if (!EMAIL_REGEX_LOCAL.test(email)) { setError(T("splashEmailValid")); return; }
      setError(""); setStep("password");
    } else {
      if (password.length < 6) { setError(T("splashPasswordLength")); return; }
      setLoading(true);
      const fn = isGoogle ? loginWithGoogle : loginWithFacebook;
      const result = await fn(`${email}::${password}`);
      setLoading(false);
      if (result.ok) { setStep("success"); setTimeout(onDone, 1200); }
      else { setError(T("splashLoginError")); }
    }
  };

  return (
    <View style={[StyleSheet.absoluteFillObject, { zIndex: 10000, backgroundColor: "rgba(0,0,0,0.88)", justifyContent: "center", alignItems: "center", padding: 24 }]}>
      <View style={{ width: "100%", maxWidth: 360, backgroundColor: "#0a1a0c", borderRadius: 20, padding: 24, borderWidth: 1, borderColor: "#D4AF3744" }}>
        {step === "success" ? (
          <View style={{ alignItems: "center", gap: 12 }}>
            <Ionicons name="checkmark-circle" size={56} color="#27AE60" />
            <Text style={{ fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: "#fff" }}>{T("splashWelcome")}</Text>
            <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 14, color: "#aaa", textAlign: "center" }}>{T("splashLinked")}</Text>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 8 }}>
              <Ionicons name={isGoogle ? "logo-google" : "logo-facebook"} size={24} color={providerColor} />
              <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 16, color: "#fff" }}>{T("splashContinueWith")} {providerName}</Text>
            </View>

            {error ? <Text style={{ color: "#E74C3C", fontSize: 13, fontFamily: "Nunito_700Bold", marginBottom: 8 }}>{error}</Text> : null}

            {step === "email" ? (
              <View>
                <Text style={{ color: "#aaa", fontSize: 13, fontFamily: "Nunito_700Bold", marginBottom: 6 }}>{T("splashEmailField")}</Text>
                <View style={{ backgroundColor: "#0e2010", borderRadius: 10, borderWidth: 1, borderColor: "#1a3a1a", flexDirection: "row", alignItems: "center" }}>
                  <TextInput
                    style={{ flex: 1, color: "#fff", fontSize: 15, fontFamily: "Nunito_700Bold", padding: 12 }}
                    placeholder="usuario@correo.com"
                    placeholderTextColor="#555"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>
              </View>
            ) : (
              <View>
                <Text style={{ color: "#aaa", fontSize: 13, fontFamily: "Nunito_700Bold", marginBottom: 6 }}>{T("splashPasswordField")}</Text>
                <View style={{ backgroundColor: "#0e2010", borderRadius: 10, borderWidth: 1, borderColor: "#1a3a1a", flexDirection: "row", alignItems: "center" }}>
                  <TextInput
                    style={{ flex: 1, color: "#fff", fontSize: 15, fontFamily: "Nunito_700Bold", padding: 12 }}
                    placeholder="••••••"
                    placeholderTextColor="#555"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    editable={!loading}
                  />
                </View>
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <Pressable
                style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#333", alignItems: "center" }}
                onPress={() => { if (step === "password") { setStep("email"); setError(""); } else { onCancel(); } }}
              >
                <Text style={{ color: "#aaa", fontFamily: "Nunito_700Bold" }}>{T("splashBack")}</Text>
              </Pressable>
              <Pressable
                style={{ flex: 2, padding: 12, borderRadius: 10, backgroundColor: providerColor, alignItems: "center", justifyContent: "center" }}
                onPress={handleNext}
                disabled={loading}
              >
                {loading ? (
                  <Ionicons name="reload" size={18} color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontFamily: "Nunito_700Bold", fontSize: 15 }}>
                    {step === "email" ? T("splashNext") : T("splashSignIn")}
                  </Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function RootLayoutNav() {
  return (
    <>
      <AudioManager />
      <NotificationManager />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="game" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="game-multi" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="game-online" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="online-lobby" options={{ animation: "slide_from_bottom", headerShown: false }} />
        <Stack.Screen name="tutorial" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="rules" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="ranking" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="friends" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="ranked" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="login" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="settings" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

function RestoredBanner() {
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.delay(1800),
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -60, duration: 350, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 0, left: 0, right: 0,
        zIndex: 9999,
        alignItems: "center",
        paddingTop: 56,
        opacity: opacityAnim,
        transform: [{ translateY: slideAnim }],
        pointerEvents: "none",
      } as any}
    >
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: "#27ae60",
        paddingHorizontal: 20, paddingVertical: 10,
        borderRadius: 24,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
      }}>
        <Ionicons name="wifi" size={18} color="#fff" />
        <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 14, color: "#fff" }}>
          Conexión restaurada
        </Text>
      </View>
    </Animated.View>
  );
}

function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { isConnected, isChecking } = useNetwork();
  const [showRestored, setShowRestored] = useState(false);
  const wasOffline = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isChecking && !isConnected) {
      wasOffline.current = true;
    }
    if (!isChecking && isConnected && wasOffline.current) {
      wasOffline.current = false;
      setShowRestored(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowRestored(false), 2700);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isConnected, isChecking]);

  if (!isChecking && !isConnected) {
    return <OfflineScreen />;
  }

  return (
    <>
      {children}
      {showRestored && <RestoredBanner key={Date.now()} />}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_700Bold,
    Nunito_800ExtraBold: Nunito_800ExtraBold_Asset,
  });

  const [showSplash, setShowSplash] = useState(!splashShownThisSession);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  const handleSplashComplete = () => {
    splashShownThisSession = true;
    setShowSplash(false);
  };

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <NetworkProvider>
            <AuthProvider>
              <ProfileProvider>
                <NetworkGuard>
                  <GameProvider>
                    <StatusBar style="light" />
                    <RootLayoutNav />
                    {showSplash && (
                      <SplashWithAuth onComplete={handleSplashComplete} />
                    )}
                  </GameProvider>
                </NetworkGuard>
              </ProfileProvider>
            </AuthProvider>
          </NetworkProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  particle: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D4AF37",
    bottom: "20%",
  },
  logoContainer: {
    width: 240,
    height: 240,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  glow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#D4AF37",
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 50,
    elevation: 20,
  },
  splashBrand: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 22,
    color: "#D4AF37",
    letterSpacing: 6,
    textAlign: "center",
  },
  splashPresenta: {
    fontFamily: "Nunito_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 8,
    marginTop: 8,
    textAlign: "center",
  },
  goldLine: {
    width: 60,
    height: 1,
    backgroundColor: "#D4AF37",
    marginVertical: 12,
  },
  splashTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 32,
    color: "#FFFFFF",
    letterSpacing: 3,
    textAlign: "center",
  },
  versionText: {
    position: "absolute",
    bottom: 40,
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
  },
  dataInfoText: {
    position: "absolute",
    bottom: 60,
    alignSelf: "center",
    fontFamily: "Nunito_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  splashLoginArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 40,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderTopWidth: 1,
    borderTopColor: "rgba(212,175,55,0.2)",
    alignItems: "center",
    gap: 10,
  },
  splashLoginTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 16,
    color: "#D4AF37",
    letterSpacing: 1,
    marginBottom: 2,
  },
  splashLoginSub: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    marginBottom: 8,
    textAlign: "center",
  },
  splashBtnGoogle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 20,
    width: "100%",
    gap: 12,
  },
  splashBtnGoogleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  splashBtnFacebook: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1877F2",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 20,
    width: "100%",
    gap: 12,
  },
  splashBtnText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#333",
  },
  splashBtnGuest: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 20,
    width: "100%",
    gap: 10,
  },
  splashBtnGuestText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
  },
  splashGuestNote: {
    fontFamily: "Nunito_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    marginTop: 2,
  },
  loadingBarContainer: {
    width: "70%",
    alignSelf: "center",
    marginTop: 28,
  },
  loadingBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(212,175,55,0.18)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.28)",
    overflow: "hidden",
  },
  loadingBarFill: {
    height: "100%",
    borderRadius: 3,
    overflow: "hidden",
  },
  loadingBarShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 3,
  },
  loadingBarFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  loadingMsg: {
    fontFamily: "Nunito_400Regular",
    fontSize: 10,
    color: "rgba(212,175,55,0.65)",
    flex: 1,
  },
  loadingPct: {
    fontFamily: "Nunito_700Bold",
    fontSize: 11,
    color: "#D4AF37",
    marginLeft: 8,
  },
  studioCenterWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  coverRingOuter: {
    position: "absolute",
    width: SCREEN_WIDTH * 1.1,
    height: SCREEN_WIDTH * 1.1,
    borderRadius: SCREEN_WIDTH * 0.55,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.07)",
    top: "50%",
    left: "50%",
    marginLeft: -(SCREEN_WIDTH * 0.55),
    marginTop: -(SCREEN_WIDTH * 0.55),
  },
  coverRingInner: {
    position: "absolute",
    width: SCREEN_WIDTH * 0.78,
    height: SCREEN_WIDTH * 0.78,
    borderRadius: SCREEN_WIDTH * 0.39,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.05)",
    top: "50%",
    left: "50%",
    marginLeft: -(SCREEN_WIDTH * 0.39),
    marginTop: -(SCREEN_WIDTH * 0.39),
  },
  coverCenter: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    zIndex: 10,
    paddingHorizontal: 32,
  },
  coverCardsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  coverCardMini: {
    width: 36,
    height: 50,
    borderRadius: 6,
    borderWidth: 1.5,
    backgroundColor: "rgba(255,255,255,0.04)",
    justifyContent: "center",
    alignItems: "center",
  },
  coverCardSuit: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
  },
  coverTitleWrap: {
    alignItems: "center",
    marginBottom: 16,
  },
  coverTitleMain: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 46,
    color: "#D4AF37",
    letterSpacing: 5,
    textAlign: "center",
    textShadowColor: "rgba(212,175,55,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  coverTitleSub: {
    fontFamily: "Nunito_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 4,
    textAlign: "center",
    marginTop: 8,
  },
  coverDivider: {
    width: 80,
    height: 1.5,
    backgroundColor: "rgba(212,175,55,0.4)",
    marginBottom: 28,
    borderRadius: 1,
  },
});
