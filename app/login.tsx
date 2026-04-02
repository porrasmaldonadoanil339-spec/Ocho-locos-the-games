import React, { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, TextInput, Modal,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../constants/colors";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import { playSound } from "../lib/sounds";
import { t as gT } from "../lib/i18n";

type Mode = "menu" | "login" | "register";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, register, loginAsGuest } = useAuth();
  const { profile, linkAccount } = useProfile();
  const lang = (profile.language ?? "es") as string;

  const [mode, setMode] = useState<Mode>("menu");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [showForgotPass, setShowForgotPass] = useState(false);
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const [oauthProvider, setOauthProvider] = useState<"google" | "facebook" | null>(null);
  const [oauthStep, setOauthStep] = useState<"email" | "password" | "success">("email");
  const [oauthEmail, setOauthEmail] = useState("");
  const [oauthPassword, setOauthPassword] = useState("");
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState("");

  const t = (key: string): string => {
    const strings: Record<string, Record<string, string>> = {
      title: { es: "OCHO LOCOS", en: "OCHO LOCOS", pt: "OCHO LOCOS" },
      sub: { es: "CRAZY EIGHTS · CASINO EDITION", en: "CRAZY EIGHTS · CASINO EDITION", pt: "CRAZY EIGHTS · CASINO EDITION" },
      headline: { es: "Vincula tu cuenta para guardar tu progreso", en: "Link your account to save your progress", pt: "Vincule sua conta para salvar seu progresso" },
      createAccount: { es: "Crear Cuenta", en: "Create Account", pt: "Criar Conta" },
      signIn: { es: "Iniciar Sesión", en: "Sign In", pt: "Entrar" },
      playGuest: { es: "Jugar sin cuenta", en: "Play without account", pt: "Jogar sem conta" },
      guestNote: { es: "Tu progreso se guardará en este dispositivo", en: "Your progress will be saved on this device", pt: "Seu progresso será salvo neste dispositivo" },
      username: { es: "Nombre de usuario", en: "Username", pt: "Nome de usuário" },
      password: { es: "Contraseña", en: "Password", pt: "Senha" },
      confirmPassword: { es: "Confirmar contraseña", en: "Confirm password", pt: "Confirmar senha" },
      required: { es: "Por favor completa todos los campos", en: "Please fill in all fields", pt: "Por favor preencha todos os campos" },
      passwordMismatch: { es: "Las contraseñas no coinciden", en: "Passwords do not match", pt: "As senhas não coincidem" },
      or: { es: "O", en: "OR", pt: "OU" },
      continueGoogle: { es: "Continuar con Google", en: "Continue with Google", pt: "Continuar com Google" },
      continueFacebook: { es: "Continuar con Facebook", en: "Continue with Facebook", pt: "Continuar com Facebook" },
      registerBtn: { es: "CREAR CUENTA", en: "CREATE ACCOUNT", pt: "CRIAR CONTA" },
      loginBtn: { es: "INICIAR SESIÓN", en: "SIGN IN", pt: "ENTRAR" },
      haveAccount: { es: "¿Ya tienes cuenta? Inicia sesión", en: "Already have account? Sign in", pt: "Já tem conta? Entre" },
      noAccount: { es: "¿Sin cuenta? Regístrate", en: "No account? Register", pt: "Sem conta? Registre-se" },
      usernameTip: { es: "3-20 caracteres, letras y números", en: "3-20 chars, letters and numbers only", pt: "3-20 caracteres, letras e números" },
      invalidEmail: { es: "Ingresa un correo válido (ej: usuario@gmail.com)", en: "Enter a valid email (e.g. user@gmail.com)", pt: "Digite um email válido (ex: usuario@gmail.com)" },
      passwordMin: { es: "La contraseña debe tener al menos 6 caracteres", en: "Password must be at least 6 characters", pt: "A senha deve ter pelo menos 6 caracteres" },
      accountLinked: { es: "¡Cuenta vinculada!", en: "Account linked!", pt: "Conta vinculada!" },
      progressSaved: { es: "Tu progreso ya está guardado en la nube.", en: "Your progress is now saved to the cloud.", pt: "Seu progresso foi salvo na nuvem." },
      loginErrorInvalid: { es: "Correo o contraseña incorrectos. Intenta registrarte si es la primera vez.", en: "Wrong email or password. Try registering if this is your first time.", pt: "Email ou senha incorretos. Tente se registrar se for a primeira vez." },
      networkError: { es: "Error de conexión. Verifica tu internet.", en: "Connection error. Check your internet.", pt: "Erro de conexão. Verifique sua internet." },
      enterEmail: { es: "Ingresa tu dirección de correo", en: "Enter your email address", pt: "Digite seu endereço de e-mail" },
      enterPassword: { es: "Ingresa tu contraseña", en: "Enter your password", pt: "Digite sua senha" },
      next: { es: "Siguiente", en: "Next", pt: "Próximo" },
      back: { es: "← Atrás", en: "← Back", pt: "← Voltar" },
      signInProvider: { es: "Iniciar sesión", en: "Sign in", pt: "Entrar" },
      saveProgress: { es: "Vincula tu cuenta con {p} para guardar tu progreso en la nube y jugar desde cualquier dispositivo.", en: "Link your account with {p} to save your progress to the cloud and play from any device.", pt: "Vincule sua conta com {p} para salvar seu progresso na nuvem e jogar de qualquer dispositivo." },
      forgotPass: { es: "¿Olvidaste tu contraseña?", en: "Forgot your password?", pt: "Esqueceu sua senha?" },
      forgotTitle: { es: "Recuperar contraseña", en: "Password Recovery", pt: "Recuperar senha" },
      forgotSub: { es: "Ingresa tu nombre de usuario y te enviaremos instrucciones para restablecer tu contraseña.", en: "Enter your username and we'll send you instructions to reset your password.", pt: "Digite seu nome de usuário e enviaremos instruções para redefinir sua senha." },
      forgotSent: { es: "¡Listo! Si el usuario existe, recibirás instrucciones de recuperación.", en: "Done! If the user exists, you'll receive recovery instructions.", pt: "Pronto! Se o usuário existir, você receberá instruções de recuperação." },
      sendRecovery: { es: "Enviar instrucciones", en: "Send instructions", pt: "Enviar instruções" },
      close: { es: "Cerrar", en: "Close", pt: "Fechar" },
    };
    return strings[key]?.[lang] ?? strings[key]?.["es"] ?? key;
  };

  const handleOAuth = (provider: "google" | "facebook") => {
    playSound("button_press").catch(() => {});
    setOauthProvider(provider);
    setOauthStep("email");
    setOauthEmail("");
    setOauthPassword("");
    setOauthError("");
  };

  const handleOAuthNext = () => {
    const email = oauthEmail.trim();
    if (!EMAIL_REGEX.test(email)) {
      setOauthError(t("invalidEmail"));
      return;
    }
    setOauthError("");
    setOauthStep("password");
  };

  const handleOAuthSubmit = async () => {
    const email = oauthEmail.trim().toLowerCase();
    if (!email || oauthPassword.length < 6) return;
    setOauthLoading(true);
    setOauthError("");

    const emailUsername = email.replace(/[^a-z0-9]/g, "").slice(0, 18) || "player";

    let result = await login(emailUsername, oauthPassword);
    if (!result.ok) {
      result = await register(emailUsername, oauthPassword);
    }

    setOauthLoading(false);
    if (result.ok) {
      linkAccount(oauthProvider!, email);
      setOauthStep("success");
      playSound("win").catch(() => {});
      setTimeout(() => {
        setOauthProvider(null);
        router.replace("/(tabs)");
      }, 1800);
    } else {
      setOauthError(t("loginErrorInvalid"));
    }
  };

  const oauthClose = () => {
    setOauthProvider(null);
    setOauthStep("email");
    setOauthEmail("");
    setOauthPassword("");
    setOauthError("");
  };

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError(t("required"));
      return;
    }
    setLoading(true);
    setError("");
    const result = await login(username.trim(), password);
    setLoading(false);
    if (result.ok) {
      playSound("win").catch(() => {});
      router.replace("/(tabs)");
    } else {
      setError(result.error || "Error");
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotUsername.trim()) return;
    setForgotLoading(true);
    setForgotError("");
    try {
      const { apiRequest } = await import("../lib/query-client");
      await apiRequest("POST", "/api/auth/forgot-password", { username: forgotUsername.trim() });
      setForgotSent(true);
    } catch {
      setForgotError(t("networkError"));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username.trim() || !password || !confirmPassword) {
      setError(t("required"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    if (password.length < 6) {
      setError(t("passwordMin"));
      return;
    }
    setLoading(true);
    setError("");
    const result = await register(username.trim(), password);
    setLoading(false);
    if (result.ok) {
      playSound("win").catch(() => {});
      router.replace("/(tabs)");
    } else {
      setError(result.error || "Error");
    }
  };

  const handleGuest = () => {
    loginAsGuest();
    playSound("button_press").catch(() => {});
    router.replace("/(tabs)");
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top + 12;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom + 16;

  const providerName = oauthProvider === "google" ? "Google" : "Facebook";

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient colors={["#010804", "#030e08", "#041008"]} style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <Pressable
            onPress={() => { if (mode !== "menu") { setMode("menu"); setError(""); } else { router.back(); } }}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.textMuted} />
          </Pressable>

          <View style={styles.logoSection}>
            <View style={styles.suitRow}>
              <Text style={styles.suitRed}>♥</Text>
              <Text style={styles.suitBlack}>♠</Text>
              <Text style={styles.suitRed}>♦</Text>
              <Text style={styles.suitBlack}>♣</Text>
            </View>
            <Text style={styles.logoText}>OCHO LOCOS</Text>
            <Text style={styles.logoSub}>CRAZY EIGHTS · CASINO EDITION</Text>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerDiamond}>◆</Text>
              <View style={styles.dividerLine} />
            </View>
            {mode === "menu" && <Text style={styles.subtitle}>{t("headline")}</Text>}
          </View>

          {/* ─── MENU ─── */}
          {mode === "menu" && (
            <View style={styles.buttonsSection}>
              <Pressable onPress={() => handleOAuth("google")} style={({ pressed }) => [styles.authBtn, styles.authBtnGoogle, pressed && styles.pressed]}>
                <View style={styles.googleIconContainer}>
                  <View style={[styles.googleDot, { backgroundColor: "#EA4335", top: 0, left: 0 }]} />
                  <View style={[styles.googleDot, { backgroundColor: "#4285F4", top: 0, right: 0 }]} />
                  <View style={[styles.googleDot, { backgroundColor: "#FBBC04", bottom: 0, left: 0 }]} />
                  <View style={[styles.googleDot, { backgroundColor: "#34A853", bottom: 0, right: 0 }]} />
                  <Text style={styles.googleGText}>G</Text>
                </View>
                <Text style={styles.authBtnText}>{t("continueGoogle")}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </Pressable>

              <Pressable onPress={() => handleOAuth("facebook")} style={({ pressed }) => [styles.authBtn, styles.authBtnFacebook, pressed && styles.pressed]}>
                <View style={styles.fbIconContainer}>
                  <Ionicons name="logo-facebook" size={24} color="#fff" />
                </View>
                <Text style={[styles.authBtnText, { color: "#fff" }]}>{t("continueFacebook")}</Text>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
              </Pressable>

              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>{t("or")}</Text>
                <View style={styles.orLine} />
              </View>

              <Pressable onPress={() => { playSound("button_press").catch(() => {}); setMode("register"); setError(""); }} style={({ pressed }) => [styles.mainBtn, pressed && styles.pressed]}>
                <Ionicons name="person-add" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.mainBtnText}>{t("createAccount")}</Text>
              </Pressable>

              <Pressable onPress={() => { playSound("button_press").catch(() => {}); setMode("login"); setError(""); }} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
                <Ionicons name="log-in-outline" size={18} color={Colors.gold} style={{ marginRight: 8 }} />
                <Text style={styles.secondaryBtnText}>{t("signIn")}</Text>
              </Pressable>

              <Pressable onPress={handleGuest} style={({ pressed }) => [styles.guestBtn, pressed && styles.pressed]}>
                <Ionicons name="eye-outline" size={16} color={Colors.textMuted} style={{ marginRight: 6 }} />
                <Text style={styles.guestBtnText}>{t("playGuest")}</Text>
              </Pressable>
              <Text style={styles.guestNote}>{t("guestNote")}</Text>

              {loading && <ActivityIndicator color={Colors.gold} style={{ marginTop: 16 }} />}
            </View>
          )}

          {/* ─── REGISTER ─── */}
          {mode === "register" && (
            <View style={styles.formSection}>
              <Text style={styles.formTitle}>{t("createAccount")}</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("username")}</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} maxLength={20} placeholder="MiNombre" placeholderTextColor={Colors.textDim} />
                </View>
                <Text style={styles.inputHint}>{t("usernameTip")}</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("password")}</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput style={[styles.input, { flex: 1 }]} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} placeholder="••••••" placeholderTextColor={Colors.textDim} />
                  <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={8}><Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={Colors.textMuted} /></Pressable>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("confirmPassword")}</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput style={[styles.input, { flex: 1 }]} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} placeholder="••••••" placeholderTextColor={Colors.textDim} />
                </View>
              </View>

              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <Pressable onPress={handleRegister} style={({ pressed }) => [styles.mainBtn, pressed && styles.pressed, loading && { opacity: 0.7 }]} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainBtnText}>{t("registerBtn")}</Text>}
              </Pressable>

              <Pressable onPress={() => { setMode("login"); setError(""); }} style={styles.switchModeBtn}>
                <Text style={styles.switchModeText}>{t("haveAccount")}</Text>
              </Pressable>
            </View>
          )}

          {/* ─── LOGIN ─── */}
          {mode === "login" && (
            <View style={styles.formSection}>
              <Text style={styles.formTitle}>{t("signIn")}</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("username")}</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} placeholder="MiNombre" placeholderTextColor={Colors.textDim} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("password")}</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput style={[styles.input, { flex: 1 }]} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} placeholder="••••••" placeholderTextColor={Colors.textDim} />
                  <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={8}><Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={Colors.textMuted} /></Pressable>
                </View>
              </View>

              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <Pressable onPress={handleLogin} style={({ pressed }) => [styles.mainBtn, pressed && styles.pressed, loading && { opacity: 0.7 }]} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainBtnText}>{t("loginBtn")}</Text>}
              </Pressable>

              <Pressable onPress={() => { setShowForgotPass(true); setForgotSent(false); setForgotUsername(""); setForgotError(""); }} style={styles.forgotBtn}>
                <Text style={styles.forgotBtnText}>{t("forgotPass")}</Text>
              </Pressable>

              <Pressable onPress={() => { setMode("register"); setError(""); }} style={styles.switchModeBtn}>
                <Text style={styles.switchModeText}>{t("noAccount")}</Text>
              </Pressable>
            </View>
          )}

        </ScrollView>
      </LinearGradient>

      {/* ─── Forgot Password Modal ─── */}
      <Modal visible={showForgotPass} transparent animationType="slide" onRequestClose={() => setShowForgotPass(false)}>
        <View style={oauthStyles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowForgotPass(false)} />
          <View style={oauthStyles.sheet}>
            <View style={oauthStyles.providerHeader}>
              <View style={[oauthStyles.googleIcon, { backgroundColor: "rgba(212,175,55,0.15)" }]}>
                <Ionicons name="lock-open-outline" size={22} color={Colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={oauthStyles.providerTitle}>{t("forgotTitle")}</Text>
              </View>
              <Pressable onPress={() => setShowForgotPass(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </Pressable>
            </View>

            {forgotSent ? (
              <View style={{ alignItems: "center", padding: 16, gap: 12 }}>
                <Ionicons name="checkmark-circle" size={52} color="#27AE60" />
                <Text style={[oauthStyles.infoText, { textAlign: "center" }]}>{t("forgotSent")}</Text>
                <Pressable onPress={() => setShowForgotPass(false)} style={oauthStyles.btn}>
                  <Text style={oauthStyles.btnText}>{t("close")}</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={oauthStyles.infoText}>{t("forgotSub")}</Text>
                <Text style={oauthStyles.heading}>{t("username")}</Text>
                <View style={oauthStyles.inputWrap}>
                  <Ionicons name="person-outline" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={oauthStyles.input}
                    value={forgotUsername}
                    onChangeText={setForgotUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="MiNombre"
                    placeholderTextColor={Colors.textDim}
                  />
                </View>
                {!!forgotError && (
                  <View style={oauthStyles.errorRow}>
                    <Ionicons name="alert-circle-outline" size={16} color="#E74C3C" />
                    <Text style={oauthStyles.errorText}>{forgotError}</Text>
                  </View>
                )}
                <Pressable
                  onPress={handleForgotPassword}
                  style={[oauthStyles.btn, forgotLoading && { opacity: 0.7 }]}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? <ActivityIndicator color="#000" /> : <Text style={oauthStyles.btnText}>{t("sendRecovery")}</Text>}
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── OAuth Modal ─── */}
      <Modal visible={!!oauthProvider} transparent animationType="slide" onRequestClose={oauthClose}>
        <View style={oauthStyles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={oauthClose} />
          <View style={oauthStyles.sheet}>

            {oauthProvider === "google" ? (
              <View style={oauthStyles.providerHeader}>
                <View style={oauthStyles.googleIcon}>
                  <Ionicons name="logo-google" size={22} color="#EA4335" />
                </View>
                <View>
                  <Text style={oauthStyles.providerTitle}>Google</Text>
                  <Text style={oauthStyles.providerSub}>
                    {gT("secureSignIn", lang as any)}
                  </Text>
                </View>
                <Pressable onPress={oauthClose} style={{ marginLeft: "auto" }}>
                  <Ionicons name="close" size={22} color={Colors.textMuted} />
                </Pressable>
              </View>
            ) : (
              <View style={oauthStyles.providerHeader}>
                <View style={oauthStyles.fbIcon}><Ionicons name="logo-facebook" size={22} color="#fff" /></View>
                <View>
                  <Text style={oauthStyles.providerTitle}>Facebook</Text>
                  <Text style={oauthStyles.providerSub}>
                    {gT("secureSignIn", lang as any)}
                  </Text>
                </View>
                <Pressable onPress={oauthClose} style={{ marginLeft: "auto" }}>
                  <Ionicons name="close" size={22} color={Colors.textMuted} />
                </Pressable>
              </View>
            )}

            <Text style={oauthStyles.infoText}>
              {t("saveProgress").replace("{p}", providerName)}
            </Text>

            {oauthStep === "email" && (
              <>
                <Text style={oauthStyles.heading}>{t("enterEmail")}</Text>
                <View style={oauthStyles.inputWrap}>
                  <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[oauthStyles.input, { flex: 1 }]}
                    value={oauthEmail}
                    onChangeText={v => { setOauthEmail(v); setOauthError(""); }}
                    placeholder={lang === "pt" ? "email@exemplo.com" : lang === "en" ? "email@example.com" : "correo@ejemplo.com"}
                    placeholderTextColor="#666"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {!!oauthError && (
                  <View style={oauthStyles.errorRow}>
                    <Ionicons name="alert-circle-outline" size={14} color="#FF6B6B" />
                    <Text style={oauthStyles.errorText}>{oauthError}</Text>
                  </View>
                )}
                <Pressable
                  onPress={handleOAuthNext}
                  style={[oauthStyles.btn, { opacity: EMAIL_REGEX.test(oauthEmail.trim()) ? 1 : 0.45 }]}
                  disabled={!EMAIL_REGEX.test(oauthEmail.trim())}
                >
                  <Text style={oauthStyles.btnText}>{t("next")}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#010804" style={{ marginLeft: 4 }} />
                </Pressable>
              </>
            )}

            {oauthStep === "password" && (
              <>
                <View style={oauthStyles.emailPill}>
                  <Ionicons name="checkmark-circle" size={14} color="#27AE60" />
                  <Text style={oauthStyles.emailPillText}>{oauthEmail}</Text>
                </View>
                <Text style={oauthStyles.heading}>{t("enterPassword")}</Text>
                <View style={oauthStyles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[oauthStyles.input, { flex: 1 }]}
                    value={oauthPassword}
                    onChangeText={v => { setOauthPassword(v); setOauthError(""); }}
                    placeholder="••••••••"
                    placeholderTextColor="#666"
                    secureTextEntry
                  />
                </View>
                {!!oauthError && (
                  <View style={oauthStyles.errorRow}>
                    <Ionicons name="alert-circle-outline" size={14} color="#FF6B6B" />
                    <Text style={oauthStyles.errorText}>{oauthError}</Text>
                  </View>
                )}
                <Pressable
                  onPress={handleOAuthSubmit}
                  style={[oauthStyles.btn, { opacity: oauthPassword.length >= 6 && !oauthLoading ? 1 : 0.45 }]}
                  disabled={oauthPassword.length < 6 || oauthLoading}
                >
                  {oauthLoading
                    ? <ActivityIndicator color="#010804" />
                    : <>
                        <Text style={oauthStyles.btnText}>{t("signInProvider")}</Text>
                        <Ionicons name={oauthProvider === "google" ? "logo-google" : "logo-facebook"} size={16} color="#010804" style={{ marginLeft: 6 }} />
                      </>
                  }
                </Pressable>
                <Pressable onPress={() => { setOauthStep("email"); setOauthError(""); }} style={oauthStyles.backLink}>
                  <Text style={oauthStyles.backLinkText}>{t("back")}</Text>
                </Pressable>
              </>
            )}

            {oauthStep === "success" && (
              <View style={oauthStyles.successWrap}>
                <View style={oauthStyles.successIcon}>
                  <Ionicons name="checkmark" size={36} color="#fff" />
                </View>
                <Text style={oauthStyles.successTitle}>{t("accountLinked")}</Text>
                <Text style={oauthStyles.successSub}>{t("progressSaved")}</Text>
              </View>
            )}

          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const oauthStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.7)" },
  sheet: { backgroundColor: "#0a1a0f", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44, gap: 14 },
  providerHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  googleIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  fbIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#1877F2", alignItems: "center", justifyContent: "center" },
  providerTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 18, color: "#fff" },
  providerSub: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  infoText: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted, lineHeight: 18, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 12 },
  heading: { fontFamily: "Nunito_700Bold", fontSize: 15, color: "#fff" },
  inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", paddingHorizontal: 14, paddingVertical: 2 },
  input: { fontFamily: "Nunito_400Regular", fontSize: 15, color: "#fff", paddingVertical: 12 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  errorText: { fontFamily: "Nunito_400Regular", fontSize: 12, color: "#FF6B6B", flex: 1 },
  emailPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(39,174,96,0.12)", borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, alignSelf: "flex-start" },
  emailPillText: { fontFamily: "Nunito_700Bold", fontSize: 13, color: "#27AE60" },
  btn: { backgroundColor: Colors.gold, borderRadius: 14, paddingVertical: 15, alignItems: "center", flexDirection: "row", justifyContent: "center" },
  btnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 15, color: "#010804" },
  backLink: { alignItems: "center", paddingVertical: 4 },
  backLinkText: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted, textDecorationLine: "underline" },
  successWrap: { alignItems: "center", gap: 14, paddingVertical: 20 },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#27AE60", alignItems: "center", justifyContent: "center" },
  successTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 24, color: "#27AE60" },
  successSub: { fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center", lineHeight: 20 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: "center", paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 0 },
  backBtn: { alignSelf: "flex-start", width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)", marginBottom: 8 },
  logoSection: { alignItems: "center", width: "100%", marginBottom: 24 },
  suitRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  suitRed: { fontSize: 22, color: "#C0392B", opacity: 0.7 },
  suitBlack: { fontSize: 22, color: "#ffffff", opacity: 0.45 },
  logoText: { fontFamily: "Nunito_800ExtraBold", fontSize: 34, color: Colors.gold, letterSpacing: 5, textAlign: "center" },
  logoSub: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textDim, letterSpacing: 3, marginTop: 4 },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, width: "100%", marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(212,175,55,0.2)" },
  dividerDiamond: { fontSize: 12, color: Colors.gold + "80" },
  subtitle: { fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center", lineHeight: 20, paddingHorizontal: 8 },
  buttonsSection: { width: "100%", gap: 10 },
  authBtn: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 15, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1.5 },
  authBtnGoogle: { backgroundColor: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.18)" },
  authBtnFacebook: { backgroundColor: "#1877F2", borderColor: "#1877F2" },
  authBtnIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)" },
  googleIconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" },
  googleDot: { position: "absolute", width: 16, height: 16 },
  googleGText: { fontFamily: "Nunito_800ExtraBold", fontSize: 17, color: "#4285F4", zIndex: 1 },
  fbIconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  authBtnText: { fontFamily: "Nunito_700Bold", fontSize: 15, color: "#ffffff", flex: 1 },
  orRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4 },
  orLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  orText: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textDim },
  mainBtn: { backgroundColor: Colors.gold, borderRadius: 14, paddingVertical: 15, alignItems: "center", flexDirection: "row", justifyContent: "center" },
  mainBtnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: "#010804" },
  secondaryBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", borderWidth: 1.5, borderColor: Colors.gold + "66" },
  secondaryBtnText: { fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.gold },
  guestBtn: { borderRadius: 14, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center" },
  guestBtnText: { fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.textMuted },
  guestNote: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textDim, textAlign: "center" },
  formSection: { width: "100%", gap: 14 },
  formTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: Colors.gold, marginBottom: 4 },
  inputGroup: { gap: 6 },
  inputLabel: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.textMuted },
  inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingHorizontal: 14, paddingVertical: 2 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontFamily: "Nunito_400Regular", fontSize: 15, color: "#fff", paddingVertical: 13 },
  inputHint: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textDim },
  errorText: { fontFamily: "Nunito_700Bold", fontSize: 13, color: "#FF6B6B", textAlign: "center" },
  switchModeBtn: { alignItems: "center", paddingVertical: 8 },
  switchModeText: { fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.textMuted, textDecorationLine: "underline" },
  forgotBtn: { alignItems: "center", paddingVertical: 4 },
  forgotBtnText: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.gold, textDecorationLine: "underline" },
  pressed: { opacity: 0.75 },
});
