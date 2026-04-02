import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Switch, Platform, ScrollView,
  Modal, Pressable, Vibration, Linking, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useProfile } from "../context/ProfileContext";
import { useAuth } from "../context/AuthContext";
import { stopMusic, startMenuMusic, syncSettings, getCurrentTrack } from "../lib/audioManager";
import { useT } from "../hooks/useT";
import { playSound } from "../lib/sounds";
import { Colors } from "../constants/colors";

const LANGUAGES = [
  { code: "es",  label: "Español",          subtitle: "Español (Latinoamérica)", flag: "🇲🇽" },
  { code: "es",  label: "Español (España)",  subtitle: "Español (España)",        flag: "🇪🇸" },
  { code: "en",  label: "English",           subtitle: "English (USA)",            flag: "🇺🇸" },
  { code: "en",  label: "English (UK)",      subtitle: "English (UK)",             flag: "🇬🇧" },
  { code: "pt",  label: "Português",         subtitle: "Português (Brasil)",       flag: "🇧🇷" },
  { code: "pt",  label: "Português (PT)",    subtitle: "Português (Portugal)",     flag: "🇵🇹" },
  { code: "fr",  label: "Français",          subtitle: "Français (France)",        flag: "🇫🇷" },
  { code: "de",  label: "Deutsch",           subtitle: "Deutsch (Deutschland)",    flag: "🇩🇪" },
  { code: "it",  label: "Italiano",          subtitle: "Italiano (Italia)",        flag: "🇮🇹" },
  { code: "tr",  label: "Türkçe",            subtitle: "Türkçe (Türkiye)",         flag: "🇹🇷" },
  { code: "ru",  label: "Русский",           subtitle: "Russian",                  flag: "🇷🇺" },
  { code: "pl",  label: "Polski",            subtitle: "Polish",                   flag: "🇵🇱" },
  { code: "nl",  label: "Nederlands",        subtitle: "Dutch",                    flag: "🇳🇱" },
  { code: "sv",  label: "Svenska",           subtitle: "Swedish",                  flag: "🇸🇪" },
  { code: "da",  label: "Dansk",             subtitle: "Danish",                   flag: "🇩🇰" },
  { code: "fi",  label: "Suomi",             subtitle: "Finnish",                  flag: "🇫🇮" },
  { code: "no",  label: "Norsk",             subtitle: "Norwegian",                flag: "🇳🇴" },
  { code: "zh",  label: "中文 (简体)",        subtitle: "Chinese (Simplified)",     flag: "🇨🇳" },
  { code: "zh",  label: "中文 (繁體)",        subtitle: "Chinese (Traditional)",    flag: "🇹🇼" },
  { code: "ja",  label: "日本語",             subtitle: "Japanese",                 flag: "🇯🇵" },
  { code: "ko",  label: "한국어",             subtitle: "Korean",                   flag: "🇰🇷" },
  { code: "hi",  label: "हिन्दी",             subtitle: "Hindi",                    flag: "🇮🇳" },
  { code: "th",  label: "ไทย",               subtitle: "Thai",                     flag: "🇹🇭" },
  { code: "vi",  label: "Tiếng Việt",        subtitle: "Vietnamese",               flag: "🇻🇳" },
  { code: "id",  label: "Bahasa Indonesia",  subtitle: "Indonesian",               flag: "🇮🇩" },
  { code: "ar",  label: "العربية",            subtitle: "Arabic",                   flag: "🇸🇦" },
];

const SECTION_ICONS: Record<string, { name: string; color: string; bg: string }> = {
  language:      { name: "globe",           color: "#4FC3F7", bg: "#1a2a3a" },
  sound:         { name: "musical-notes",   color: "#D4AF37", bg: "#1a3a1a" },
  notifications: { name: "notifications",   color: "#E74C3C", bg: "#3a1a1a" },
  gameplay:      { name: "game-controller", color: "#27AE60", bg: "#1a3a2a" },
  graphics:      { name: "color-palette",   color: "#9B59B6", bg: "#2a1a3a" },
  appearance:    { name: "moon",            color: "#F39C12", bg: "#2a2a1a" },
  account:       { name: "person-circle",   color: "#4A90E2", bg: "#1a2a3a" },
  privacy:       { name: "shield-checkmark",color: "#27AE60", bg: "#1a3a1a" },
  help:          { name: "help-circle",     color: "#E67E22", bg: "#3a2a1a" },
  info:          { name: "information-circle", color: "#95A5A6", bg: "#2a2a2a" },
};

function SectionHeader({ icon, label, isDark }: { icon: keyof typeof SECTION_ICONS; label: string; isDark: boolean }) {
  const ic = SECTION_ICONS[icon];
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={[styles.sectionHeaderIcon, { backgroundColor: ic.bg }]}>
        <Ionicons name={ic.name as any} size={16} color={ic.color} />
      </View>
      <Text style={[styles.sectionHeaderLabel, { color: isDark ? ic.color : "#2a4a2a" }]}>{label}</Text>
    </View>
  );
}

function SettingRow({ label, sub, icon, iconColor, iconBg, right, isDark, onPress, last }: {
  label: string; sub?: string; icon: string; iconColor: string; iconBg: string;
  right: React.ReactNode; isDark: boolean; onPress?: () => void; last?: boolean;
}) {
  const labelColor = isDark ? "#E8DCC8" : "#1a2e1a";
  const subColor   = isDark ? "#6B7A5C" : "#4a7a4a";
  const content = (
    <View style={[styles.row, !last && styles.rowBorder, { borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)" }]}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Ionicons name={icon as any} size={19} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
          {sub ? <Text style={[styles.rowSub, { color: subColor }]}>{sub}</Text> : null}
        </View>
      </View>
      <View style={styles.rowRight}>{right}</View>
    </View>
  );
  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
  }
  return content;
}

function QualitySelector({ value, onChange, isDark }: {
  value: "low" | "medium" | "high"; onChange: (v: "low" | "medium" | "high") => void; isDark: boolean;
}) {
  const T = useT();
  const opts: ("low" | "medium" | "high")[] = ["low", "medium", "high"];
  const labels = [T("qualityLow"), T("qualityMedium"), T("qualityHigh")];
  const icons: any[] = ["speedometer-outline", "speedometer", "flame"];
  return (
    <View style={styles.qualityRow}>
      {opts.map((opt, i) => {
        const active = value === opt;
        const activeBg = isDark ? (opt === "low" ? "#1a4020" : opt === "medium" ? "#1a3a18" : "#1a2a10") : (opt === "low" ? "#e8f5e9" : opt === "medium" ? "#c8e6c9" : "#a5d6a7");
        const activeColor = isDark ? Colors.gold : "#1b5e20";
        const inactiveColor = isDark ? "#6B7A5C" : "#4a7a4a";
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            style={[
              styles.qualityBtn,
              {
                borderColor: isDark ? (active ? Colors.gold : "rgba(255,255,255,0.12)") : (active ? "#2a6a2a" : "rgba(0,0,0,0.1)"),
                backgroundColor: active ? activeBg : "transparent",
              },
            ]}
          >
            <Ionicons name={icons[i]} size={14} color={active ? activeColor : inactiveColor} style={{ marginBottom: 2 }} />
            <Text style={[styles.qualityBtnText, { color: active ? activeColor : inactiveColor }]}>
              {labels[i]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { profile, updateSettings } = useProfile();
  const { user, logout } = useAuth();
  const T = useT();
  const [showLangModal, setShowLangModal] = useState(false);
  const [langSearch, setLangSearch] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const isDark = profile.darkMode !== false;

  const bg      = isDark ? ["#041008", "#061510", "#041008"] as const : ["#e8f5e2", "#d4edce", "#e8f5e2"] as const;
  const cardBg   = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const cardBorder = isDark ? "rgba(212,175,55,0.12)" : "rgba(0,100,0,0.12)";
  const titleColor = isDark ? "#D4AF37" : "#1a4a1a";
  const subColor   = isDark ? "#6B7A5C" : "#4a7a4a";

  const sw = (val: boolean, color: string) => ({
    trackColor: { false: isDark ? "#333" : "#ccc", true: color + "66" },
    thumbColor: val ? color : isDark ? "#666" : "#aaa",
  });

  const toggleMusic = async () => {
    const next = !profile.musicEnabled;
    updateSettings({ musicEnabled: next });
    syncSettings(next, profile.sfxEnabled);
    if (!next) { stopMusic().catch(() => {}); }
    else if (getCurrentTrack() === null) { startMenuMusic().catch(() => {}); }
  };

  const toggleSfx = () => {
    const next = !profile.sfxEnabled;
    updateSettings({ sfxEnabled: next });
    syncSettings(profile.musicEnabled, next);
  };

  const toggleVibration = () => {
    const next = !profile.vibrationEnabled;
    updateSettings({ vibrationEnabled: next });
    if (next) Vibration.vibrate(80);
  };

  const selectLanguage = (code: string) => {
    updateSettings({ language: code });
    setShowLangModal(false);
    playSound("button_press").catch(() => {});
    if (profile.vibrationEnabled) Vibration.vibrate(40);
  };

  const currentLang = LANGUAGES.find(l => l.code === (profile.language ?? "es")) ?? LANGUAGES[0];

  return (
    <LinearGradient colors={bg} style={StyleSheet.absoluteFill}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: topPad + 12, paddingBottom: 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: titleColor + "22", borderColor: titleColor + "40" }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={titleColor} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: titleColor }]}>{T("settings")}</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* ──── 🌐 IDIOMA ──── */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <SectionHeader icon="language" label={T("language").toUpperCase()} isDark={isDark} />
          <SettingRow
            label={T("selectLanguage")}
            sub={`${currentLang.flag} ${currentLang.label} — ${currentLang.subtitle}`}
            icon="globe" iconColor="#4FC3F7" iconBg="#1a2a3a"
            isDark={isDark} last
            onPress={() => setShowLangModal(true)}
            right={<Ionicons name="chevron-forward" size={16} color={titleColor} />}
          />
        </View>

        {/* ──── 🔊 SONIDO ──── */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <SectionHeader icon="sound" label={T("audio").toUpperCase()} isDark={isDark} />
          <SettingRow
            label={T("music")} sub={T("musicDesc")}
            icon="musical-notes" iconColor="#D4AF37" iconBg="#1a3a1a"
            isDark={isDark}
            right={<Switch value={profile.musicEnabled} onValueChange={toggleMusic} {...sw(profile.musicEnabled, "#D4AF37")} />}
          />
          <SettingRow
            label={T("soundEffects")} sub={T("sfxDesc")}
            icon="volume-high" iconColor="#4FC3F7" iconBg="#1a2a3a"
            isDark={isDark}
            right={<Switch value={profile.sfxEnabled} onValueChange={toggleSfx} {...sw(profile.sfxEnabled, "#4FC3F7")} />}
          />
          <SettingRow
            label={T("vibration")} sub={T("vibrationDesc")}
            icon="phone-portrait" iconColor="#9B59B6" iconBg="#2a1a3a"
            isDark={isDark} last
            right={<Switch value={profile.vibrationEnabled ?? true} onValueChange={toggleVibration} {...sw(profile.vibrationEnabled ?? true, "#9B59B6")} />}
          />
        </View>

        {/* ──── 🔔 NOTIFICACIONES ──── */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <SectionHeader icon="notifications" label={T("notificationsSection")} isDark={isDark} />
          <SettingRow
            label={T("enableNotifications")} sub={T("enableNotificationsDesc")}
            icon="notifications" iconColor="#E74C3C" iconBg="#3a1a1a"
            isDark={isDark}
            right={<Switch value={profile.notificationsEnabled ?? true} onValueChange={v => updateSettings({ notificationsEnabled: v })} {...sw(profile.notificationsEnabled ?? true, "#E74C3C")} />}
          />
          <SettingRow
            label={T("missionAvailable")} sub={T("missionAvailableDesc")}
            icon="list" iconColor="#F39C12" iconBg="#2a2a1a"
            isDark={isDark}
            right={<Switch value={(profile.notificationsEnabled ?? true) && (profile.missionNotifications ?? true)} onValueChange={v => updateSettings({ missionNotifications: v })} {...sw(profile.missionNotifications ?? true, "#F39C12")} />}
          />
          <SettingRow
            label={T("rewardsToClaim")} sub={T("rewardsToClaimDesc")}
            icon="gift" iconColor="#27AE60" iconBg="#1a3a1a"
            isDark={isDark}
            right={<Switch value={(profile.notificationsEnabled ?? true) && (profile.rewardNotifications ?? true)} onValueChange={v => updateSettings({ rewardNotifications: v })} {...sw(profile.rewardNotifications ?? true, "#27AE60")} />}
          />
          <SettingRow
            label={T("specialEvents")} sub={T("specialEventsDesc")}
            icon="star" iconColor="#D4AF37" iconBg="#2a2a1a"
            isDark={isDark}
            right={<Switch value={(profile.notificationsEnabled ?? true) && (profile.eventNotifications ?? true)} onValueChange={v => updateSettings({ eventNotifications: v })} {...sw(profile.eventNotifications ?? true, "#D4AF37")} />}
          />
          <SettingRow
            label={T("reminders")} sub={T("remindersDesc")}
            icon="time" iconColor="#9B59B6" iconBg="#2a1a3a"
            isDark={isDark} last
            right={<Switch value={(profile.notificationsEnabled ?? true) && (profile.reminderNotifications ?? true)} onValueChange={v => updateSettings({ reminderNotifications: v })} {...sw(profile.reminderNotifications ?? true, "#9B59B6")} />}
          />
        </View>

        {/* ──── 🎮 JUGABILIDAD ──── */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <SectionHeader icon="gameplay" label={T("gameplaySection")} isDark={isDark} />
          <SettingRow
            label={T("fastAnimations")} sub={T("fastAnimationsDesc")}
            icon="flash" iconColor="#F1C40F" iconBg="#2a2a1a"
            isDark={isDark}
            right={<Switch value={profile.fastAnimations ?? false} onValueChange={v => updateSettings({ fastAnimations: v })} {...sw(profile.fastAnimations ?? false, "#F1C40F")} />}
          />
          <SettingRow
            label={T("confirmSpecialCards")} sub={T("confirmSpecialDesc")}
            icon="checkmark-circle" iconColor="#27AE60" iconBg="#1a3a1a"
            isDark={isDark}
            right={<Switch value={profile.confirmSpecialCards ?? true} onValueChange={v => updateSettings({ confirmSpecialCards: v })} {...sw(profile.confirmSpecialCards ?? true, "#27AE60")} />}
          />
          <SettingRow
            label={T("showTutorials")} sub={T("showTutorialsDesc")}
            icon="help-buoy" iconColor="#4FC3F7" iconBg="#1a2a3a"
            isDark={isDark} last
            right={<Switch value={profile.showTutorials ?? true} onValueChange={v => updateSettings({ showTutorials: v })} {...sw(profile.showTutorials ?? true, "#4FC3F7")} />}
          />
        </View>

        {/* ──── 🎨 GRÁFICOS ──── */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <SectionHeader icon="graphics" label={T("graphicsSection")} isDark={isDark} />
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: "#2a1a3a" }]}>
                <Ionicons name="layers" size={19} color="#9B59B6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: isDark ? "#E8DCC8" : "#1a2e1a" }]}>{T("graphicsQuality")}</Text>
                <Text style={[styles.rowSub, { color: subColor }]}>{T("graphicsQualityDesc")}</Text>
              </View>
            </View>
          </View>
          <QualitySelector
            value={profile.graphicsQuality ?? "high"}
            onChange={v => updateSettings({ graphicsQuality: v })}
            isDark={isDark}
          />
          <View style={[styles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", marginVertical: 10 }]} />
          <SettingRow
            label={T("specialEffects")} sub={T("specialEffectsDesc")}
            icon="sparkles" iconColor="#D4AF37" iconBg="#2a2a1a"
            isDark={isDark}
            right={<Switch value={profile.specialEffectsEnabled ?? true} onValueChange={v => updateSettings({ specialEffectsEnabled: v })} {...sw(profile.specialEffectsEnabled ?? true, "#D4AF37")} />}
          />
          <SettingRow
            label={T("animationsEnabled")} sub={T("animationsDesc")}
            icon="film" iconColor="#4FC3F7" iconBg="#1a2a3a"
            isDark={isDark} last
            right={<Switch value={profile.animationsEnabled ?? true} onValueChange={v => updateSettings({ animationsEnabled: v })} {...sw(profile.animationsEnabled ?? true, "#4FC3F7")} />}
          />
        </View>

        {/* ──── 🌙 APARIENCIA ──── */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <SectionHeader icon="appearance" label={T("appearanceSection")} isDark={isDark} />
          <SettingRow
            label={isDark ? T("darkMode") : T("lightMode")}
            sub={isDark ? T("darkThemeActive") : T("lightThemeActive")}
            icon={isDark ? "moon" : "sunny"} iconColor={isDark ? "#9B59B6" : "#F39C12"} iconBg={isDark ? "#2a1a3a" : "#fff9e6"}
            isDark={isDark} last
            right={
              <Switch
                value={isDark}
                onValueChange={() => { updateSettings({ darkMode: !isDark }); if (profile.vibrationEnabled) Vibration.vibrate(40); }}
                {...sw(isDark, isDark ? "#9B59B6" : "#F39C12")}
              />
            }
          />
        </View>

        {/* ──── 👤 CUENTA ──── */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <SectionHeader icon="account" label={T("accountSection")} isDark={isDark} />
          {user && !user.isGuest ? (
            <>
              <SettingRow
                label={user.username} sub={T("accountLinked")}
                icon="checkmark-circle" iconColor="#27AE60" iconBg="#1a3a1a"
                isDark={isDark}
                right={
                  <TouchableOpacity
                    onPress={() => { Alert.alert(T("signOut"), T("confirmSignOut"), [{ text: T("cancel"), style: "cancel" }, { text: T("signOut"), style: "destructive", onPress: () => logout() }]); }}
                    style={[styles.dangerBtn]}
                  >
                    <Text style={styles.dangerBtnText}>{T("signOut")}</Text>
                  </TouchableOpacity>
                }
              />
              <SettingRow
                label={T("cloudSave")} sub={T("cloudSynced")}
                icon="cloud-done" iconColor="#27AE60" iconBg="#1a3a1a"
                isDark={isDark} last
                right={<Ionicons name="checkmark-circle" size={20} color="#27AE60" />}
              />
            </>
          ) : (
            <>
              <SettingRow
                label={T("loginGoogle")} sub={T("linkGoogleDesc")}
                icon="logo-google" iconColor="#E74C3C" iconBg="#3a1a1a"
                isDark={isDark} onPress={() => router.push("/login")}
                right={<Ionicons name="chevron-forward" size={16} color={titleColor} />}
              />
              <SettingRow
                label={T("loginFacebook")} sub={T("linkFacebookDesc")}
                icon="logo-facebook" iconColor="#4A90E2" iconBg="#1a2a3a"
                isDark={isDark} onPress={() => router.push("/login")}
                right={<Ionicons name="chevron-forward" size={16} color={titleColor} />}
              />
              <SettingRow
                label={T("playAsGuest")} sub={T("noAccountDesc")}
                icon="person-outline" iconColor="#95A5A6" iconBg="#2a2a2a"
                isDark={isDark}
                right={user?.isGuest ? <Ionicons name="checkmark-circle" size={20} color="#27AE60" /> : <View />}
              />
              <SettingRow
                label={T("cloudSave")} sub={T("requiresAccount")}
                icon="cloud-upload" iconColor="#9B59B6" iconBg="#2a1a3a"
                isDark={isDark} last onPress={() => router.push("/login")}
                right={<Ionicons name="chevron-forward" size={16} color={titleColor} />}
              />
            </>
          )}
        </View>

        {/* ──── 🛡️ PRIVACIDAD ──── */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <SectionHeader icon="privacy" label={T("privacy").toUpperCase()} isDark={isDark} />
          <SettingRow
            label={T("privacyPolicy")} sub={T("privacyPolicyDesc")}
            icon="document-text" iconColor="#27AE60" iconBg="#1a3a1a"
            isDark={isDark} onPress={() => Alert.alert(T("privacyPolicy"), T("privacyPolicyText" as any))}
            right={<Ionicons name="chevron-forward" size={16} color={titleColor} />}
          />
          <SettingRow
            label={T("gamePermissions")} sub={T("permissionsDesc")}
            icon="lock-closed" iconColor="#F39C12" iconBg="#2a2a1a"
            isDark={isDark} onPress={() => Alert.alert(T("gamePermissions"), T("gamePermissionsText" as any))}
            right={<Ionicons name="chevron-forward" size={16} color={titleColor} />}
          />
          <SettingRow
            label={T("dataManagement")} sub={T("dataManagementDesc")}
            icon="trash" iconColor="#E74C3C" iconBg="#3a1a1a"
            isDark={isDark} last onPress={() => Alert.alert(T("dataManagement"), T("dataManagementText" as any))}
            right={<Ionicons name="chevron-forward" size={16} color={titleColor} />}
          />
        </View>

        {/* ──── ❓ AYUDA ──── */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <SectionHeader icon="help" label={T("help")} isDark={isDark} />
          <SettingRow
            label={T("techSupport")} sub={T("contactTeam")}
            icon="headset" iconColor="#E67E22" iconBg="#3a2a1a"
            isDark={isDark} onPress={() => Linking.openURL("mailto:support@biyisprime.com")}
            right={<Ionicons name="chevron-forward" size={16} color={titleColor} />}
          />
          <SettingRow
            label={T("faq")} sub={T("faqDesc")}
            icon="help-circle" iconColor="#4FC3F7" iconBg="#1a2a3a"
            isDark={isDark} onPress={() => Alert.alert(T("faq"), T("faqText" as any))}
            right={<Ionicons name="chevron-forward" size={16} color={titleColor} />}
          />
          <SettingRow
            label={T("reportBug")} sub={T("helpImprove")}
            icon="bug" iconColor="#E74C3C" iconBg="#3a1a1a"
            isDark={isDark} onPress={() => Linking.openURL("mailto:bugs@biyisprime.com?subject=Bug%20Ocho%20Locos")}
            right={<Ionicons name="chevron-forward" size={16} color={titleColor} />}
          />
          <SettingRow
            label={T("reportPlayer")} sub={T("reportPlayerDesc")}
            icon="flag" iconColor="#E74C3C" iconBg="#3a1a1a"
            isDark={isDark} last onPress={() => Alert.alert(T("reportPlayer"), T("reportPlayerText" as any))}
            right={<Ionicons name="chevron-forward" size={16} color={titleColor} />}
          />
        </View>

        {/* ──── ℹ️ INFORMACIÓN ──── */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <SectionHeader icon="info" label={T("infoSection")} isDark={isDark} />
          <SettingRow
            label={T("gameVersion")} sub="Ocho Locos v3.0.0"
            icon="code-working" iconColor="#95A5A6" iconBg="#2a2a2a"
            isDark={isDark}
            right={<Text style={[styles.versionChip, { color: titleColor }]}>v3.0.0</Text>}
          />
          <SettingRow
            label={T("credits")} sub={T("creditsDesc")}
            icon="people" iconColor="#D4AF37" iconBg="#2a2a1a"
            isDark={isDark} onPress={() => Alert.alert(T("credits"), T("creditsText" as any))}
            right={<Ionicons name="chevron-forward" size={16} color={titleColor} />}
          />
          <SettingRow
            label={T("termsOfService")} sub={T("termsDesc")}
            icon="document" iconColor="#9B59B6" iconBg="#2a1a3a"
            isDark={isDark} last onPress={() => Alert.alert(T("termsOfService"), T("termsText" as any))}
            right={<Ionicons name="chevron-forward" size={16} color={titleColor} />}
          />
        </View>

        {/* Footer */}
        <View style={styles.footerCard}>
          <LinearGradient colors={["#D4AF3722", "#D4AF3705"]} style={styles.footerGrad}>
            <Text style={styles.footerGame}>OCHO LOCOS</Text>
            <Text style={[styles.footerStudio, { color: subColor }]}>Biyis Prime Studios · v3.0.0</Text>
          </LinearGradient>
        </View>
      </ScrollView>

      {/* Language Modal */}
      <Modal visible={showLangModal} transparent animationType="slide" onRequestClose={() => setShowLangModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.langModal}>
            <LinearGradient colors={["#0a1a0c", "#061209"]} style={StyleSheet.absoluteFill} />
            <View style={styles.langModalHeader}>
              <Text style={styles.langModalTitle}>{T("selectLanguage")}</Text>
              <Pressable onPress={() => setShowLangModal(false)} style={styles.langModalClose}>
                <Ionicons name="close" size={22} color="#6B7A5C" />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              {LANGUAGES.map((lang, i) => {
                const selected = (profile.language ?? "es") === lang.code && LANGUAGES.findIndex(l => l.code === profile.language) === (profile.language === lang.code ? i : -1);
                const isSelected = (profile.language ?? "es") === lang.code;
                return (
                  <Pressable
                    key={`${lang.code}-${i}`}
                    onPress={() => selectLanguage(lang.code)}
                    style={({ pressed }) => [
                      styles.langOption,
                      isSelected && i === LANGUAGES.findIndex(l => l.code === lang.code) && styles.langOptionSelected,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text style={styles.langFlag}>{lang.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.langOptionName, isSelected && { color: "#D4AF37" }]}>{lang.label}</Text>
                      <Text style={styles.langOptionSub}>{lang.subtitle}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#D4AF37" />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  title: { fontFamily: "Nunito_800ExtraBold", fontSize: 22, letterSpacing: 1 },
  section: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 14 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  sectionHeaderIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sectionHeaderLabel: { fontFamily: "Nunito_800ExtraBold", fontSize: 11, letterSpacing: 2.5 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },
  rowBorder: { borderBottomWidth: 1, marginBottom: 2 },
  rowLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 0 },
  rowRight: { marginLeft: 8 },
  iconCircle: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", marginRight: 12 },
  rowLabel: { fontFamily: "Nunito_700Bold", fontSize: 14 },
  rowSub: { fontFamily: "Nunito_400Regular", fontSize: 11, marginTop: 1 },
  divider: { height: 1 },
  qualityRow: { flexDirection: "row", gap: 8, marginTop: 6, marginBottom: 4, paddingLeft: 50 },
  qualityBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center",
  },
  qualityBtnActive: {},
  qualityBtnText: { fontFamily: "Nunito_700Bold", fontSize: 12 },
  dangerBtn: { backgroundColor: "#E74C3C22", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#E74C3C55" },
  dangerBtnText: { fontFamily: "Nunito_700Bold", fontSize: 12, color: "#E74C3C" },
  versionChip: { fontFamily: "Nunito_800ExtraBold", fontSize: 13 },
  footerCard: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  footerGrad: { alignItems: "center", paddingVertical: 20, paddingHorizontal: 16 },
  footerGame: { fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: "#D4AF37", letterSpacing: 5 },
  footerStudio: { fontFamily: "Nunito_400Regular", fontSize: 11, marginTop: 4 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  langModal: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 44,
    overflow: "hidden", borderTopWidth: 1, borderColor: "rgba(212,175,55,0.25)",
  },
  langModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  langModalTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 18, color: "#D4AF37" },
  langModalClose: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  langOption: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
    borderRadius: 14, marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  langOptionSelected: { backgroundColor: "rgba(212,175,55,0.12)", borderColor: "rgba(212,175,55,0.4)" },
  langFlag: { fontSize: 26 },
  langOptionName: { fontFamily: "Nunito_700Bold", fontSize: 15, color: "#E8DCC8" },
  langOptionSub: { fontFamily: "Nunito_400Regular", fontSize: 11, color: "#6B7A5C", marginTop: 1 },
});
