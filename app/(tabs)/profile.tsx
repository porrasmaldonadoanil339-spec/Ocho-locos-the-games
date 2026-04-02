import React, { useState } from "react";
import { router } from "expo-router";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Modal, Platform, Alert, Image,
} from "react-native";
import { useSwipeTabs } from "../hooks/useSwipeTabs";
import { useT } from "../hooks/useT";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Colors, LightColors } from "../constants/colors";
import { useProfile, GameRecord } from "../context/ProfileContext";
import { useAuth } from "../context/AuthContext";
import { STORE_ITEMS, AVATARS, AVATAR_FRAMES } from "../lib/storeItems";
import { getXpProgress, getPlayerLevel, BATTLE_PASS_TIERS } from "../lib/battlePass";
import { getLocalizedRankInfo, RANK_COLORS, RANK_ICONS, RANKS, DIVISIONS } from "../lib/ranked";
import { playSound } from "../lib/sounds";
import { GAME_MODES } from "../lib/gameModes";
import { AvatarDisplay } from "../components/AvatarDisplay";
import { Lang, t } from "../lib/i18n";

const TITLE_ITEMS = STORE_ITEMS.filter((i) => i.category === "title");

const COUNTRIES = [
  // América del Sur
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴" },
  { code: "BR", name: "Brasil", flag: "🇧🇷" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨" },
  { code: "GY", name: "Guyana", flag: "🇬🇾" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾" },
  { code: "PE", name: "Perú", flag: "🇵🇪" },
  { code: "SR", name: "Surinam", flag: "🇸🇷" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪" },
  // América Central & Caribe
  { code: "CR", name: "Costa Rica", flag: "🇨🇷" },
  { code: "CU", name: "Cuba", flag: "🇨🇺" },
  { code: "DO", name: "Rep. Dominicana", flag: "🇩🇴" },
  { code: "SV", name: "El Salvador", flag: "🇸🇻" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹" },
  { code: "HN", name: "Honduras", flag: "🇭🇳" },
  { code: "JM", name: "Jamaica", flag: "🇯🇲" },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮" },
  { code: "PA", name: "Panamá", flag: "🇵🇦" },
  { code: "PR", name: "Puerto Rico", flag: "🇵🇷" },
  { code: "TT", name: "Trinidad y Tobago", flag: "🇹🇹" },
  { code: "MX", name: "México", flag: "🇲🇽" },
  // América del Norte
  { code: "CA", name: "Canadá", flag: "🇨🇦" },
  { code: "US", name: "USA", flag: "🇺🇸" },
  // Europa
  { code: "BE", name: "Bélgica", flag: "🇧🇪" },
  { code: "CH", name: "Suiza", flag: "🇨🇭" },
  { code: "DE", name: "Alemania", flag: "🇩🇪" },
  { code: "DK", name: "Dinamarca", flag: "🇩🇰" },
  { code: "ES", name: "España", flag: "🇪🇸" },
  { code: "FR", name: "Francia", flag: "🇫🇷" },
  { code: "GB", name: "Reino Unido", flag: "🇬🇧" },
  { code: "IT", name: "Italia", flag: "🇮🇹" },
  { code: "NL", name: "Países Bajos", flag: "🇳🇱" },
  { code: "NO", name: "Noruega", flag: "🇳🇴" },
  { code: "PL", name: "Polonia", flag: "🇵🇱" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "RU", name: "Rusia", flag: "🇷🇺" },
  { code: "SE", name: "Suecia", flag: "🇸🇪" },
  { code: "TR", name: "Turquía", flag: "🇹🇷" },
  // Asia
  { code: "AE", name: "EAU", flag: "🇦🇪" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "IL", name: "Israel", flag: "🇮🇱" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "JP", name: "Japón", flag: "🇯🇵" },
  { code: "KR", name: "Corea del Sur", flag: "🇰🇷" },
  { code: "PH", name: "Filipinas", flag: "🇵🇭" },
  { code: "PK", name: "Pakistán", flag: "🇵🇰" },
  { code: "TH", name: "Tailandia", flag: "🇹🇭" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "SA", name: "Arabia Saudita", flag: "🇸🇦" },
  // África
  { code: "EG", name: "Egipto", flag: "🇪🇬" },
  { code: "ET", name: "Etiopía", flag: "🇪🇹" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "KE", name: "Kenia", flag: "🇰🇪" },
  { code: "MA", name: "Marruecos", flag: "🇲🇦" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "SN", name: "Senegal", flag: "🇸🇳" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿" },
  { code: "ZA", name: "Sudáfrica", flag: "🇿🇦" },
  // Oceanía
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "FJ", name: "Fiyi", flag: "🇫🇯" },
  { code: "NZ", name: "Nueva Zelanda", flag: "🇳🇿" },
];

const COUNTRY_SECTIONS = [
  {
    continent: { es: "América del Sur", en: "South America", pt: "América do Sul" },
    countries: ["AR", "BO", "BR", "CL", "CO", "EC", "GY", "PY", "PE", "SR", "UY", "VE"]
  },
  {
    continent: { es: "América Central & Caribe", en: "Central America & Caribbean", pt: "América Central & Caribe" },
    countries: ["CR", "CU", "DO", "SV", "GT", "HN", "JM", "NI", "PA", "PR", "TT", "MX"]
  },
  {
    continent: { es: "América del Norte", en: "North America", pt: "América do Norte" },
    countries: ["CA", "US"]
  },
  {
    continent: { es: "Europa", en: "Europe", pt: "Europa" },
    countries: ["BE", "CH", "DE", "DK", "ES", "FR", "GB", "IT", "NL", "NO", "PL", "PT", "RU", "SE", "TR"]
  },
  {
    continent: { es: "Asia", en: "Asia", pt: "Ásia" },
    countries: ["AE", "CN", "IL", "IN", "ID", "JP", "KR", "PH", "PK", "TH", "VN", "SA"]
  },
  {
    continent: { es: "África", en: "Africa", pt: "África" },
    countries: ["EG", "ET", "GH", "KE", "MA", "NG", "SN", "TZ", "ZA"]
  },
  {
    continent: { es: "Oceanía", en: "Oceania", pt: "Oceania" },
    countries: ["AU", "FJ", "NZ"]
  },
];

function EditNameModal({
  visible, currentName, onSave, onClose,
}: { visible: boolean; currentName: string; onSave: (n: string) => void; onClose: () => void }) {
  const [name, setName] = useState(currentName);
  const T = useT();
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.editModal}>
          <Text style={styles.editTitle}>{T("editName")}</Text>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            maxLength={16}
            autoFocus
            placeholderTextColor={Colors.textDim}
            placeholder={T("yourName")}
          />
          <View style={styles.editBtns}>
            <Pressable onPress={onClose} style={styles.editBtnCancel}>
              <Text style={styles.editBtnCancelText}>{T("cancel")}</Text>
            </Pressable>
            <Pressable onPress={() => { onSave(name); onClose(); }} style={styles.editBtnSave}>
              <Text style={styles.editBtnSaveText}>{T("save")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AvatarPickerModal({
  visible, ownedItems, currentId, photoUri, onSelect, onTakePhoto, onPickPhoto, onClearPhoto, onClose,
}: {
  visible: boolean; ownedItems: string[]; currentId: string; photoUri: string;
  onSelect: (id: string) => void;
  onTakePhoto: () => void;
  onPickPhoto: () => void;
  onClearPhoto: () => void;
  onClose: () => void;
}) {
  const T = useT();
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.modalBg} onPress={onClose}>
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{T("changeAvatar") || "Elegir Avatar"}</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={22} color={Colors.textMuted} /></Pressable>
          </View>

          {/* Photo options */}
          <View style={styles.photoRow}>
            <Pressable style={styles.photoBtn} onPress={onTakePhoto}>
              <Ionicons name="camera" size={20} color={Colors.gold} />
              <Text style={styles.photoBtnText}>{T("takePhoto") || "Cámara"}</Text>
            </Pressable>
            <Pressable style={styles.photoBtn} onPress={onPickPhoto}>
              <Ionicons name="images" size={20} color={Colors.gold} />
              <Text style={styles.photoBtnText}>{T("gallery") || "Galería"}</Text>
            </Pressable>
            {photoUri ? (
              <Pressable style={[styles.photoBtn, styles.photoBtnDanger]} onPress={onClearPhoto}>
                <Ionicons name="trash" size={20} color="#E74C3C" />
                <Text style={[styles.photoBtnText, { color: "#E74C3C" }]}>{T("removePhoto") || "Quitar foto"}</Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.orDivider}>— {T("orChooseAvatar") || "o elige un avatar"} —</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarRow}>
            {AVATARS.map((item) => {
              const owned = ownedItems.includes(item.id);
              const selected = item.id === currentId && !photoUri;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => { if (owned) { onSelect(item.id); onClose(); } }}
                  style={[styles.avatarOption, selected && styles.avatarOptionSelected, !owned && styles.avatarOptionLocked]}
                >
                  <View style={[styles.avatarIconWrap, { backgroundColor: item.previewColor + "44" }]}>
                    <Ionicons name={item.preview as any} size={24} color={owned ? item.previewColor : Colors.textDim} />
                  </View>
                  <Text style={[styles.avatarOptionName, !owned && { color: Colors.textDim }]}>{item.name}</Text>
                  {!owned && <Ionicons name="lock-closed" size={12} color={Colors.textDim} style={{ marginTop: 2 }} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

function FramePickerModal({
  visible, ownedItems, currentId, onSelect, onClose,
}: {
  visible: boolean; ownedItems: string[]; currentId: string;
  onSelect: (id: string) => void; onClose: () => void;
}) {
  const T = useT();
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.modalBg} onPress={onClose}>
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{T("changeFrame") || "Marco de Avatar"}</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={22} color={Colors.textMuted} /></Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarRow}>
            {AVATAR_FRAMES.map((item) => {
              const owned = ownedItems.includes(item.id);
              const selected = item.id === currentId;
              const frameColors = (item.backColors ?? ["#D4AF37", "#B8860B"]) as [string, string];
              return (
                <Pressable
                  key={item.id}
                  onPress={() => { if (owned) { onSelect(item.id); onClose(); } }}
                  style={[styles.avatarOption, selected && styles.avatarOptionSelected, !owned && styles.avatarOptionLocked]}
                >
                  <LinearGradient
                    colors={frameColors}
                    style={styles.framePreview}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.frameInner} />
                  </LinearGradient>
                  <Text style={[styles.avatarOptionName, !owned && { color: Colors.textDim }]}>{item.name}</Text>
                  {!owned && (
                    <View style={styles.priceBadge}>
                      <Ionicons name="cash" size={9} color={Colors.gold} />
                      <Text style={styles.priceText}>{item.price}</Text>
                    </View>
                  )}
                  <View style={[styles.rarityDot, {
                    backgroundColor: item.rarity === "legendary" ? "#D4AF37" :
                      item.rarity === "epic" ? "#9B59B6" :
                      item.rarity === "rare" ? "#2196F3" : "#95A5A6",
                  }]} />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

function CountryPickerModal({
  visible, currentCode, onSelect, onClose,
}: {
  visible: boolean; currentCode: string;
  onSelect: (code: string) => void; onClose: () => void;
}) {
  const { profile } = useProfile();
  const lang = (profile.language ?? "es") as Lang;
  const T = useT();
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose} hardwareAccelerated statusBarTranslucent>
      <View style={{ flex: 1 }}>
        <Pressable style={[styles.modalBg, { justifyContent: "flex-end" }]} onPress={onClose}>
          <View style={{ flex: 1 }} />
          <View style={[styles.pickerModal, { maxHeight: 420 }]}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{T("selectCountry") || "Seleccionar País"}</Text>
              <Pressable onPress={onClose}><Ionicons name="close" size={22} color={Colors.textMuted} /></Pressable>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.countryList}>
              {COUNTRY_SECTIONS.map((section, sIdx) => (
                <View key={`section-${sIdx}`}>
                  <Text style={styles.sectionHeader}>
                    {(section.continent as any)[lang] || section.continent["en"] || section.continent["es"]}
                  </Text>
                  {section.countries.map((code) => {
                    const c = COUNTRIES.find(cnt => cnt.code === code);
                    if (!c) return null;
                    return (
                      <Pressable
                        key={c.code}
                        onPress={() => { onSelect(c.code); onClose(); }}
                        style={[styles.countryItem, c.code === currentCode && styles.countryItemSelected]}
                      >
                        <View style={styles.flagContainer}>
                          {Platform.OS === "web" ? (
                            <View style={[styles.webFlag, { backgroundColor: Colors.gold + "44" }]}>
                              <Text style={styles.webFlagText}>{c.code}</Text>
                            </View>
                          ) : (
                            <Text style={styles.flagEmoji}>{c.flag}</Text>
                          )}
                        </View>
                        <Text style={[styles.countryName, c.code === currentCode && { color: Colors.gold }]}>{c.name}</Text>
                        {c.code === currentCode && <Ionicons name="checkmark" size={20} color={Colors.gold} />}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}

function StatRow({ label, value, textColor, textMuted }: { label: string; value: string | number; textColor?: string; textMuted?: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={[styles.statRowLabel, textMuted ? { color: textMuted } : {}]}>{label}</Text>
      <Text style={[styles.statRowValue, textColor ? { color: textColor } : {}]}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, level, xpProgress, updateName, updateAvatar, updateTitle, updateFrame, updatePhotoUri, updateCountry, updateSettings } = useProfile();
  const { user, logout } = useAuth();
  const [showEditName, setShowEditName] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showTitlePicker, setShowTitlePicker] = useState(false);
  const [showFramePicker, setShowFramePicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const T = useT();
  const lang = (profile.language ?? "es") as Lang;
  const swipeHandlers = useSwipeTabs(3);
  const topPad = Platform.OS === "web" ? 67 : insets.top + 8;
  const xpPct = xpProgress.needed > 0 ? xpProgress.current / xpProgress.needed : 0;

  const titleItem = STORE_ITEMS.find((i) => i.id === profile.titleId);
  const cardBackItem = STORE_ITEMS.find((i) => i.id === profile.cardBackId);
  const frameItem = AVATAR_FRAMES.find((f) => f.id === profile.selectedFrameId);
  const rankInfo = getLocalizedRankInfo(profile.rankedProfile, lang);
  const country = COUNTRIES.find(c => c.code === profile.country) ?? COUNTRIES[0];

  const handleSaveName = async (name: string) => {
    await playSound("button_press");
    updateName(name);
  };

  const winRate = profile.stats.totalGames > 0
    ? Math.round((profile.stats.totalWins / profile.stats.totalGames) * 100) : 0;

  const handleTakePhoto = async () => {
    if (Platform.OS === "web") {
      Alert.alert("No disponible", "La cámara no está disponible en la versión web.");
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permiso denegado", "Necesitamos acceso a la cámara para tomar tu foto.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      updatePhotoUri(result.assets[0].uri);
      setShowAvatarPicker(false);
    }
  };

  const handlePickPhoto = async () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
          const url = URL.createObjectURL(file);
          updatePhotoUri(url);
          setShowAvatarPicker(false);
        }
      };
      input.click();
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permiso denegado", "Necesitamos acceso a tu galería para elegir una foto.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      updatePhotoUri(result.assets[0].uri);
      setShowAvatarPicker(false);
    }
  };

  const handleClearPhoto = () => {
    updatePhotoUri("");
    setShowAvatarPicker(false);
  };

  const isDark = profile.darkMode !== false;
  const themeColors = isDark ? Colors : LightColors;
  const bgColors: [string, string, string] = isDark
    ? ["#061209", "#0a1a0f", "#0d2418"]
    : ["#d8eecc", "#e8f5e2", "#d0e6c6"];
  const textColor = isDark ? themeColors.text : themeColors.text;
  const textMuted = isDark ? themeColors.textMuted : themeColors.textMuted;
  const surfaceColor = isDark ? themeColors.surface : themeColors.surface;
  const themeGold = isDark ? themeColors.gold : themeColors.gold;

  return (
    <View style={[styles.container, { paddingTop: topPad }]} {...swipeHandlers}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={[styles.screenTitle, { color: themeGold }]}>{T("profile")}</Text>

        {/* Connect Account banner — only for guest users */}
        {user?.isGuest && (
          <Pressable
            onPress={() => { playSound("button_press").catch(() => {}); router.push("/login"); }}
            style={({ pressed }) => [styles.connectBanner, pressed && { opacity: 0.85 }]}
          >
            <LinearGradient
              colors={["#1A3A1A", "#0D2E0D"]}
              style={styles.connectBannerGrad}
            >
              <View style={styles.connectBannerLeft}>
                <View style={styles.connectBannerIcon}>
                  <Ionicons name="shield-checkmark" size={22} color={Colors.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.connectBannerTitle}>Conectar cuenta</Text>
                  <Text style={styles.connectBannerSub}>Guarda tu progreso y juega en todos tus dispositivos</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.gold} />
            </LinearGradient>
          </Pressable>
        )}

        {/* Avatar + name card */}
        <LinearGradient
          colors={[themeGold + "22", surfaceColor]}
          style={styles.profileCard}
        >
          <View style={styles.avatarCol}>
            <Pressable onPress={() => setShowAvatarPicker(true)} style={styles.avatarBig}>
              <AvatarDisplay
                avatarId={profile.avatarId}
                frameId={profile.selectedFrameId}
                photoUri={profile.photoUri}
                size={76}
              />
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={10} color={Colors.background} />
              </View>
            </Pressable>
            <Pressable onPress={() => setShowFramePicker(true)} style={styles.frameBadge}>
              <Ionicons name="ellipse" size={10} color={frameItem?.previewColor ?? Colors.gold} />
              <Text style={[styles.frameBadgeText, { color: frameItem?.previewColor ?? Colors.gold }]}>
                {frameItem?.name ?? T("noFrame")}
              </Text>
            </Pressable>
          </View>

          <View style={styles.profileDetails}>
            <Pressable onPress={() => setShowEditName(true)} style={styles.nameRow}>
              <Text style={[styles.profileName, { color: textColor }]}>{profile.name}</Text>
              <Ionicons name="pencil" size={14} color={themeGold} />
            </Pressable>

            <View style={styles.rankSubHeader}>
              <Text style={[styles.rankDisplayText, { color: rankInfo.color }]}>
                {rankInfo.displayName}{" "}
                {Array.from({ length: 5 }).map((_, i) => (
                  <Ionicons
                    key={i}
                    name={i < profile.rankedProfile.stars ? "star" : "star-outline"}
                    size={16}
                    color={i < profile.rankedProfile.stars ? rankInfo.color : Colors.gold + "66"}
                  />
                ))}
              </Text>
            </View>

            <View style={styles.badgeRow}>
              <Pressable onPress={() => setShowTitlePicker(true)} style={[styles.titleBadge, { backgroundColor: themeGold + "22", borderColor: themeGold + "44" }]}>
                <Text style={[styles.titleText, { color: themeGold }]}>{titleItem?.name ?? T("noTitle")}</Text>
                <Ionicons name="chevron-down" size={12} color={themeGold} />
              </Pressable>

              <Pressable onPress={() => setShowCountryPicker(true)} style={[styles.countryBadge, { backgroundColor: surfaceColor, borderColor: isDark ? Colors.border : "#aacfa0" }]}>
                {Platform.OS === "web" ? (
                  <Text style={[styles.countryBadgeText, { color: textColor }]}>{country.code}</Text>
                ) : (
                  <Text style={styles.countryBadgeFlag}>{country.flag}</Text>
                )}
                <Ionicons name="chevron-down" size={10} color={textMuted} style={{ marginLeft: 4 }} />
              </Pressable>
            </View>

            <View style={styles.levelSection}>
              <Text style={[styles.levelNum, { color: textMuted }]}>{T("level")} {level}</Text>
              <View style={[styles.xpBarBig, { backgroundColor: isDark ? Colors.border : "#aacfa0" }]}>
                <View style={[styles.xpFill, { width: `${xpPct * 100}%`, backgroundColor: themeGold }]} />
              </View>
              <Text style={[styles.xpNums, { color: textMuted }]}>{xpProgress.current} / {xpProgress.needed} XP</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Coins + card back */}
        <View style={styles.resourceRow}>
          <View style={[styles.resourceCard, { backgroundColor: surfaceColor, borderColor: isDark ? Colors.border : "#aacfa0" }]}>
            <Ionicons name="cash" size={20} color={themeGold} />
            <Text style={[styles.resourceVal, { color: themeGold }]}>{profile.coins}</Text>
            <Text style={[styles.resourceLbl, { color: textMuted }]}>{T("coins")}</Text>
          </View>
          <View style={[styles.resourceCard, { backgroundColor: surfaceColor, borderColor: isDark ? Colors.border : "#aacfa0" }]}>
            <Ionicons name="star" size={20} color={themeGold} />
            <Text style={[styles.resourceVal, { color: themeGold }]}>{profile.totalXp}</Text>
            <Text style={[styles.resourceLbl, { color: textMuted }]}>XP {T("total") || "Total"}</Text>
          </View>
          <View style={[styles.resourceCard, { backgroundColor: surfaceColor, borderColor: isDark ? Colors.border : "#aacfa0" }]}>
            <View style={[styles.miniCard, { backgroundColor: cardBackItem?.previewColor ?? "#1A3A6A" }]}>
              <Text style={{ color: Colors.gold, fontSize: 10 }}>◆</Text>
            </View>
            <Text style={[styles.resourceVal, { color: themeGold, fontSize: 12 }]} numberOfLines={1}>{cardBackItem?.name ?? T("default")}</Text>
            <Text style={[styles.resourceLbl, { color: textMuted }]}>{T("cardBackLabel")}</Text>
          </View>
        </View>

        {/* Friends button */}
        <Pressable
          style={({ pressed }) => [
            styles.friendsBtn,
            { backgroundColor: isDark ? Colors.surface : "#c8e0c0", borderColor: isDark ? Colors.border : "#9ec89a" },
            pressed && { opacity: 0.82 },
          ]}
          onPress={() => router.push("/friends")}
        >
          <View style={[styles.friendsBtnIcon, { backgroundColor: Colors.gold + "22" }]}>
            <Ionicons name="people" size={18} color={themeGold} />
          </View>
          <Text style={[styles.friendsBtnLabel, { color: textColor }]}>{T("friends")}</Text>
          <Ionicons name="chevron-forward" size={16} color={textMuted} />
        </Pressable>

        {/* Recent Match History */}
        {(profile.stats.recentGames ?? []).length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: themeGold }]}>HISTORIAL RECIENTE</Text>
            <View style={[styles.statsBlock, { backgroundColor: surfaceColor + "cc", borderColor: isDark ? Colors.border : "#aacfa0", paddingVertical: 4, paddingHorizontal: 0 }]}>
              {(profile.stats.recentGames ?? []).slice(0, 8).map((game: GameRecord, idx: number) => {
                const modeInfo = GAME_MODES.find(m => m.id === game.mode);
                const isLast = idx === Math.min(7, (profile.stats.recentGames ?? []).length - 1);
                const date = new Date(game.timestamp);
                const dateStr = date.toLocaleDateString("es", { day: "2-digit", month: "2-digit" });
                const timeStr = date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
                return (
                  <View key={game.id} style={{
                    flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 14,
                    borderBottomWidth: isLast ? 0 : 1, borderBottomColor: isDark ? Colors.border : "#aacfa0",
                    gap: 10,
                  }}>
                    <View style={{
                      width: 8, height: 8, borderRadius: 4,
                      backgroundColor: game.won ? "#27AE60" : "#E74C3C",
                    }} />
                    <View style={[{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: (modeInfo?.color ?? "#888") + "22" }]}>
                      <Ionicons name={(modeInfo?.icon ?? "card") as any} size={15} color={modeInfo?.color ?? "#888"} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 13, color: textColor }}>
                        {game.won ? "Victoria" : "Derrota"}
                        {game.opponentName ? ` · ${game.opponentName}` : ""}
                      </Text>
                      <Text style={{ fontFamily: "Nunito_400Regular", fontSize: 11, color: textMuted }}>{modeInfo?.name ?? game.mode}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 2 }}>
                      {game.coinsEarned > 0 && (
                        <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 11, color: Colors.gold }}>+{game.coinsEarned} <Ionicons name="cash" size={10} color={Colors.gold} /></Text>
                      )}
                      <Text style={{ fontFamily: "Nunito_400Regular", fontSize: 10, color: textMuted }}>{dateStr} {timeStr}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <Text style={[styles.sectionLabel, { color: themeGold }]}>{T("statistics") || "ESTADÍSTICAS"}</Text>
        <View style={[styles.statsBlock, { backgroundColor: surfaceColor + "cc", borderColor: isDark ? Colors.border : "#aacfa0" }]}>
          <StatRow label={T("gamesPlayed")} value={profile.stats.totalGames} textColor={textColor} textMuted={textMuted} />
          <StatRow label={T("wins")} value={profile.stats.totalWins} textColor={textColor} textMuted={textMuted} />
          <StatRow label={T("losses")} value={profile.stats.totalLosses} textColor={textColor} textMuted={textMuted} />
          <StatRow label={T("winRate")} value={`${winRate}%`} textColor={textColor} textMuted={textMuted} />
          <StatRow label={T("streak")} value={`${profile.stats.dailyStreak} ${T("days")}`} textColor={textColor} textMuted={textMuted} />
          <StatRow label={T("eightsPlayed")} value={profile.stats.totalEightsPlayed} textColor={textColor} textMuted={textMuted} />
          <StatRow label={T("cardsDrawn")} value={profile.stats.totalCardsDrawn} textColor={textColor} textMuted={textMuted} />
          <StatRow label={T("perfectWins")} value={profile.stats.perfectWins} textColor={textColor} textMuted={textMuted} />
          <StatRow label={T("comebacks")} value={profile.stats.comebackWins} textColor={textColor} textMuted={textMuted} />
          <StatRow label={T("tournamentsWon")} value={profile.stats.tournamentsWon} textColor={textColor} textMuted={textMuted} />
          <StatRow label={T("challengesCompleted")} value={profile.stats.challengesCompleted} textColor={textColor} textMuted={textMuted} />
          <StatRow label={T("localMultiWins")} value={profile.stats.localMultiWins ?? 0} textColor={textColor} textMuted={textMuted} />
          <StatRow label={T("localMultiGames")} value={profile.stats.localMultiGames ?? 0} textColor={textColor} textMuted={textMuted} />
          <StatRow label={T("onlineMultiWins")} value={profile.stats.onlineMultiWins ?? 0} textColor={textColor} textMuted={textMuted} />
          <StatRow label={T("onlineMultiGames")} value={profile.stats.onlineMultiGames ?? 0} textColor={textColor} textMuted={textMuted} />
        </View>

        <Text style={[styles.sectionLabel, { color: themeGold }]}>{T("byMode")}</Text>
        <View style={[styles.statsBlock, { backgroundColor: surfaceColor + "cc", borderColor: isDark ? Colors.border : "#aacfa0", paddingVertical: 4 }]}>
          {GAME_MODES.map((mode, idx) => {
            const wins = profile.stats.winsByMode[mode.id] ?? 0;
            const games = profile.stats.gamesByMode[mode.id] ?? 0;
            const winRate = games > 0 ? Math.round((wins / games) * 100) : 0;
            const isLast = idx === GAME_MODES.length - 1;
            return (
              <View key={mode.id} style={{ paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: isDark ? Colors.border : "#aacfa0" }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                  <View style={[styles.modeIconSm, { backgroundColor: mode.color + "33" }]}>
                    <Ionicons name={mode.icon as any} size={14} color={mode.color} />
                  </View>
                  <Text style={{ fontFamily: "Nunito_800ExtraBold", fontSize: 13, color: mode.color, marginLeft: 8 }}>
                    {T(`mode${mode.id.charAt(0).toUpperCase() + mode.id.slice(1)}` as any) || mode.name}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <View style={{ flex: 1, backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", borderRadius: 8, paddingVertical: 6, alignItems: "center" }}>
                    <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 16, color: textColor }}>{games}</Text>
                    <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 9, color: textMuted, marginTop: 2 }}>{T("statsGames").toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", borderRadius: 8, paddingVertical: 6, alignItems: "center" }}>
                    <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 16, color: "#27AE60" }}>{wins}</Text>
                    <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 9, color: textMuted, marginTop: 2 }}>{T("statsWins").toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", borderRadius: 8, paddingVertical: 6, alignItems: "center" }}>
                    <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 16, color: winRate >= 50 ? "#D4AF37" : textMuted }}>{winRate}%</Text>
                    <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 9, color: textMuted, marginTop: 2 }}>{T("statsWinRate").toUpperCase()}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Rank Progression */}
        <Text style={[styles.sectionLabel, { color: themeGold }]}>{t("rankProgress", lang).toUpperCase()}</Text>
        <View style={[styles.statsBlock, { backgroundColor: surfaceColor + "cc", borderColor: isDark ? Colors.border : "#aacfa0", paddingVertical: 12, paddingHorizontal: 12 }]}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
            {RANKS.map((_, rankIdx) => {
              const color = RANK_COLORS[rankIdx];
              const icon = RANK_ICONS[rankIdx] ?? "trophy";
              const localNames = getLocalizedRankInfo({ rank: rankIdx, division: 0, stars: 0, maxStars: 5, totalWins: 0, totalLosses: 0 }, lang);
              const isCurrent = profile.rankedProfile.rank === rankIdx;
              const isUnlocked = profile.rankedProfile.rank > rankIdx || isCurrent;
              return (
                <View
                  key={rankIdx}
                  style={{
                    width: "22%",
                    alignItems: "center",
                    paddingVertical: 10,
                    paddingHorizontal: 4,
                    borderRadius: 12,
                    borderWidth: isCurrent ? 2 : 1,
                    borderColor: isCurrent ? color : (isUnlocked ? color + "55" : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)")),
                    backgroundColor: isCurrent ? color + "22" : (isUnlocked ? color + "10" : "transparent"),
                    opacity: isUnlocked ? 1 : 0.4,
                  }}
                >
                  <Ionicons name={icon as any} size={22} color={isUnlocked ? color : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)")} />
                  <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 9, color: isUnlocked ? color : textMuted, textAlign: "center", marginTop: 4 }} numberOfLines={1}>
                    {localNames.rankName}
                  </Text>
                  {isCurrent && (
                    <View style={{ backgroundColor: color, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, marginTop: 3 }}>
                      <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 7, color: "#000" }}>
                        {DIVISIONS[profile.rankedProfile.division]}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <EditNameModal
        visible={showEditName}
        currentName={profile.name}
        onSave={handleSaveName}
        onClose={() => setShowEditName(false)}
      />
      <AvatarPickerModal
        visible={showAvatarPicker}
        ownedItems={profile.ownedItems}
        currentId={profile.avatarId}
        photoUri={profile.photoUri}
        onSelect={updateAvatar}
        onTakePhoto={handleTakePhoto}
        onPickPhoto={handlePickPhoto}
        onClearPhoto={handleClearPhoto}
        onClose={() => setShowAvatarPicker(false)}
      />
      <FramePickerModal
        visible={showFramePicker}
        ownedItems={profile.ownedItems}
        currentId={profile.selectedFrameId}
        onSelect={updateFrame}
        onClose={() => setShowFramePicker(false)}
      />
      <CountryPickerModal
        visible={showCountryPicker}
        currentCode={profile.country}
        onSelect={updateCountry}
        onClose={() => setShowCountryPicker(false)}
      />
      <Modal transparent animationType="slide" visible={showTitlePicker} onRequestClose={() => setShowTitlePicker(false)}>
        <Pressable style={styles.modalBg} onPress={() => setShowTitlePicker(false)}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Elegir Título</Text>
              <Pressable onPress={() => setShowTitlePicker(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarRow}>
              {TITLE_ITEMS.map((item) => {
                const owned = profile.ownedItems.includes(item.id);
                const selected = item.id === profile.titleId;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => { if (owned) { updateTitle(item.id); setShowTitlePicker(false); } }}
                    style={[styles.avatarOption, selected && styles.avatarOptionSelected, !owned && styles.avatarOptionLocked]}
                  >
                    <View style={[styles.avatarIconWrap, { backgroundColor: item.previewColor + "33" }]}>
                      <Ionicons name={item.preview as any} size={20} color={owned ? item.previewColor : Colors.textDim} />
                    </View>
                    <Text style={[styles.avatarOptionName, !owned && { color: Colors.textDim }]}>{item.name}</Text>
                    {!owned && <View style={styles.priceBadge}><Ionicons name="cash" size={9} color={Colors.gold} /><Text style={styles.priceText}>{item.price}</Text></View>}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  screenTitle: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: Colors.gold,
    letterSpacing: 4, marginBottom: 12,
  },
  connectBanner: { marginBottom: 12, borderRadius: 14, overflow: "hidden" },
  connectBannerGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.gold + "44", borderRadius: 14,
  },
  connectBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  connectBannerIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.gold + "22",
    alignItems: "center", justifyContent: "center",
  },
  connectBannerTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 14, color: Colors.gold, marginBottom: 2 },
  connectBannerSub: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted },
  profileCard: {
    borderRadius: 18, padding: 16, flexDirection: "row", gap: 16,
    alignItems: "center", borderWidth: 1, borderColor: Colors.border, marginBottom: 12,
  },
  avatarCol: { alignItems: "center", gap: 6 },
  avatarBig: { position: "relative" },
  avatarEditBadge: {
    position: "absolute", bottom: 0, right: 0,
    backgroundColor: Colors.gold, width: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: Colors.background,
  },
  frameBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: Colors.card, paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
  },
  frameBadgeText: { fontFamily: "Nunito_700Bold", fontSize: 9 },
  profileDetails: { flex: 1, gap: 6 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  profileName: { fontFamily: "Nunito_800ExtraBold", fontSize: 18, color: Colors.text },
  titleBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start",
    backgroundColor: Colors.gold + "22", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.gold + "44",
  },
  titleText: { fontFamily: "Nunito_700Bold", fontSize: 11, color: Colors.gold },
  levelSection: { gap: 3 },
  levelNum: { fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.textMuted },
  xpBarBig: { height: 6, backgroundColor: Colors.border, borderRadius: 3 },
  xpFill: { height: "100%", backgroundColor: Colors.gold, borderRadius: 3 },
  xpNums: { fontFamily: "Nunito_400Regular", fontSize: 10, color: Colors.textDim },
  resourceRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  resourceCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 14,
    padding: 12, alignItems: "center", gap: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  resourceVal: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.gold, textAlign: "center" },
  resourceLbl: { fontFamily: "Nunito_400Regular", fontSize: 10, color: Colors.textMuted },
  miniCard: {
    width: 24, height: 34, borderRadius: 4,
    alignItems: "center", justifyContent: "center",
  },
  sectionLabel: {
    fontFamily: "Nunito_700Bold", fontSize: 11, color: Colors.textMuted,
    letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, marginTop: 4,
  },
  statsBlock: {
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border, overflow: "hidden", marginBottom: 16,
  },
  statRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  statRowLabel: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted },
  statRowValue: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.text },
  modeStatRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modeIconSm: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  modeStatName: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted, flex: 1 },
  modeStatVal: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.gold },
  modalBg: { flex: 1, backgroundColor: Colors.overlay, justifyContent: "center", alignItems: "center" },
  editModal: {
    backgroundColor: Colors.surface, borderRadius: 18, padding: 20,
    width: 300, borderWidth: 1, borderColor: Colors.border,
  },
  editTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.gold, marginBottom: 12 },
  nameInput: {
    backgroundColor: Colors.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 12,
  },
  editBtns: { flexDirection: "row", gap: 10 },
  editBtnCancel: {
    flex: 1, padding: 12, borderRadius: 10, alignItems: "center",
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  editBtnCancelText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.textMuted },
  editBtnSave: {
    flex: 1, padding: 12, borderRadius: 10, alignItems: "center", backgroundColor: Colors.gold,
  },
  editBtnSaveText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "#1a0a00" },
  pickerModal: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, borderWidth: 1, borderColor: Colors.border, alignSelf: "stretch",
  },
  pickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  pickerTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.gold },
  photoRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  photoBtn: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 12, padding: 12,
    alignItems: "center", gap: 6, borderWidth: 1, borderColor: Colors.gold + "44",
  },
  photoBtnDanger: { borderColor: "#E74C3C44" },
  photoBtnText: { fontFamily: "Nunito_700Bold", fontSize: 11, color: Colors.gold },
  orDivider: {
    fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textDim,
    textAlign: "center", marginBottom: 12,
  },
  avatarRow: { paddingVertical: 4, gap: 10, paddingBottom: 20 },
  avatarOption: {
    width: 90, backgroundColor: Colors.card, borderRadius: 12, padding: 10,
    alignItems: "center", gap: 6, borderWidth: 1, borderColor: Colors.border,
  },
  avatarOptionSelected: { borderColor: Colors.gold, backgroundColor: Colors.gold + "22" },
  avatarOptionLocked: { opacity: 0.6 },
  avatarIconWrap: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  avatarOptionName: { fontFamily: "Nunito_700Bold", fontSize: 11, color: Colors.text, textAlign: "center" },
  priceBadge: { flexDirection: "row", alignItems: "center", gap: 2 },
  priceText: { fontFamily: "Nunito_700Bold", fontSize: 9, color: Colors.gold },
  framePreview: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  frameInner: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.background,
  },
  rarityDot: {
    width: 6, height: 6, borderRadius: 3,
  },
  friendsBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 14,
  },
  friendsBtnIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  friendsBtnLabel: {
    fontFamily: "Nunito_700Bold", fontSize: 15, flex: 1,
  },
  rankSubHeader: {
    marginBottom: 4,
  },
  rankDisplayText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  countryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  countryBadgeFlag: {
    fontSize: 14,
  },
  countryBadgeText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 10,
  },
  countryList: {
    paddingBottom: 20,
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "44",
  },
  countryItemSelected: {
    backgroundColor: Colors.gold + "11",
  },
  flagContainer: {
    width: 40,
    alignItems: "center",
  },
  flagEmoji: {
    fontSize: 24,
  },
  webFlag: {
    width: 30,
    height: 20,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  webFlagText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 10,
    color: Colors.gold,
  },
  countryName: {
    flex: 1,
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
  },
  sectionHeader: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 13,
    color: Colors.gold,
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
});
