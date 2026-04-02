import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput,
  Modal, Image, Platform, Animated, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "../constants/colors";
import { useProfile } from "../context/ProfileContext";
import { useT } from "../hooks/useT";
import { CPU_PROFILES } from "../lib/cpuProfiles";
import { PlayerProfileModal, type PlayerProfileData } from "../components/PlayerProfileModal";

const STORAGE_KEY = "ocho_friends_v1";
const CHAT_STORAGE_KEY = "ocho_chats_v1";

function seededRand(seed: number) {
  const x = Math.sin(seed + 91) * 10000;
  return x - Math.floor(x);
}

interface Friend {
  id: string;
  name: string;
  level: number;
  avatarIcon: string;
  avatarColor: string;
  photoUrl?: string;
  online: boolean;
  wins: number;
  lastSeen: string;
  titleName: string;
}

interface FriendRequest {
  id: string;
  name: string;
  level: number;
  avatarIcon: string;
  avatarColor: string;
  photoUrl?: string;
  status: "pending" | "accepted" | "rejected";
  direction: "incoming" | "outgoing";
  resolvedAt?: number;
}

interface ChatMessage {
  id: string;
  text: string;
  fromMe: boolean;
  ts: number;
}

const GENERIC_REPLIES = [
  "Jaja qué bueno!", "Vamos a jugar pronto!", "Estoy listo para la revancha!",
  "Buen juego la última vez", "Cuándo jugamos?", "Hoy estoy disponible",
  "Eso estuvo bien jugado", "Me avisas cuando quieras jugar", "Ok!",
  "Claro, cuando quieras!", "Jeje, prepárate para perder!", "Suerte en el próximo!",
  "Ya voy a entrar", "Dame 5 minutos", "Está buenísimo este juego!",
  "Ocho Locos es lo mejor!", "Hoy estoy con suerte", "Qué mano tan mala!",
  "No me lo creo!", "Increíble!", "Qué buena partida!", "Mañana jugamos?",
  "Estoy practicando mis jugadas", "Esa carta me salvó", "Casi te gano!",
  "Me encanta este mazo", "Tienes mucha habilidad", "Fue pura suerte!",
  "La próxima no será tan fácil", "Qué buena estrategia", "Me divertí mucho",
  "Vale, acepto el reto", "Déjame ver mi mazo", "Un saludo!",
  "Estaba viendo unas jugadas pro en YouTube, ¡ya casi te alcanzo!",
  "Increíble cómo cambiaste el color justo cuando tenía puros rojos...",
  "¿Viste esa jugada? Ni yo me la creí, ¡pura adrenalina!",
  "Estoy ahorrando para un nuevo dorso, el de dragón se ve épico.",
  "La verdad es que me pusiste a sudar con ese último Ocho Loco.",
  "¿Alguna vez has llegado a Rango Maestro? Es mi meta de esta temporada.",
  "¡Qué buena racha llevas! Alguien anda encendido hoy.",
  "Oye, ¿viste el nuevo pase de batalla? Las recompensas están geniales.",
  "A veces el azar no ayuda, pero la estrategia lo es todo aquí.",
  "¡Esa carta de +4 me dolió en el alma! Buena esa.",
];

function getContextualReply(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes("hola") || msg.includes("hi") || msg.includes("hello")) {
    const greetings = ["Hola!", "Qué tal?", "Hey! Cómo vas?", "Hola amigo!", "Buenas!", "¡Hola! ¿Listo para un duelo legendario?", "¡Qué onda! ¿Echamos una partida?"];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
  if (msg.includes("jugar") || msg.includes("game") || msg.includes("play") || msg.includes("partida")) {
    const playReplies = ["Claro, ¡invítame!", "Dale, una partida rápida", "En un momento estoy libre para jugar", "Me encantaría, vamos!", "Ahora mismo no puedo, ¡pero luego sí!", "¡Dame un segundo que termino esta y le damos!", "¡De una! Prepárate para perder (es broma... o no)."];
    return playReplies[Math.floor(Math.random() * playReplies.length)];
  }
  if (msg.includes("como") || msg.includes("cómo") || msg.includes("how")) {
    const statusReplies = ["Todo bien por aquí, ¿y tú?", "Excelente, ganando algunas partidas", "Muy bien, disfrutando de Ocho Locos", "Genial!", "Todo tranquilo, gracias por preguntar", "¡Súper bien! Subiendo en el ranking poco a poco.", "¡A tope! Acabo de ganar una partida épica."];
    return statusReplies[Math.floor(Math.random() * statusReplies.length)];
  }
  if (msg.includes("suerte") || msg.includes("luck") || msg.includes("buena")) {
    const thanksReplies = ["Muchas gracias!", "Igualmente para ti!", "Gracias, la necesité", "Tú también tuviste suerte!", "Suerte en la próxima!", "¡Gracias crack! La suerte es para los que no tienen estrategia (mentira, me salvó el azar)."];
    return thanksReplies[Math.floor(Math.random() * thanksReplies.length)];
  }
  if (msg.includes("cartas") || msg.includes("cards")) {
    const cardReplies = ["Me salieron unas cartas buenísimas", "Ese ocho me salvó la vida", "Menudas cartas me tocaron...", "Este mazo es mi favorito", "Las cartas no me acompañaron esta vez", "¡Ojalá me saliera un mazo así más seguido!", "A veces las cartas te aman, a veces te odian."];
    return cardReplies[Math.floor(Math.random() * cardReplies.length)];
  }
  return GENERIC_REPLIES[Math.floor(Math.random() * GENERIC_REPLIES.length)];
}

const TITLE_NAMES: Record<string, string> = {
  title_rookie: "Novato", title_regular: "Regular", title_pro: "Profesional",
  title_ace: "El As", title_legend: "Leyenda", title_god: "El Dios",
  title_grandmaster: "Gran Maestro", title_immortal: "Inmortal", title_shark: "Tiburón",
  title_hustler: "Buscavidas", title_phantom: "El Fantasma", title_queen: "La Reina",
  title_veteran: "Veterano", title_strategist: "Estratega",
};

const LAST_SEEN = ["2 min", "15 min", "1h", "3h", "24h", "2d"];

function buildInitialFriends(): Friend[] {
  return [];
}

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const { profile, removeOutgoingFriendRequest } = useProfile();
  const T = useT();
  const isDark = profile.darkMode !== false;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [tab, setTab] = useState<"friends" | "requests" | "search">("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [profileModal, setProfileModal] = useState<PlayerProfileData | null>(null);
  const [inviteToast, setInviteToast] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const [chatFriend, setChatFriend] = useState<Friend | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatListRef = useRef<FlatList<ChatMessage>>(null);
  const [deleteMsgId, setDeleteMsgId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<string>>(new Set());
  const [showDeleteConvConfirm, setShowDeleteConvConfirm] = useState(false);
  const friendsRef = useRef<Friend[]>([]);
  const requestsRef = useRef<FriendRequest[]>([]);
  const chatHistoryRef = useRef<Record<string, ChatMessage[]>>({});
  const chatFriendRef = useRef<Friend | null>(null);

  // Persistence: Load from AsyncStorage
  useEffect(() => {
    async function loadData() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const { friends: storedFriends, requests: storedRequests } = JSON.parse(stored);
          setFriends(storedFriends);
          setRequests(storedRequests);
        } else {
          setFriends(buildInitialFriends());
        }
        const chatStored = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
        if (chatStored) {
          chatHistoryRef.current = JSON.parse(chatStored);
        }
      } catch (e) {
        setFriends(buildInitialFriends());
      } finally {
        setIsLoaded(true);
      }
    }
    loadData();
  }, []);

  // Keep refs in sync with state (for setTimeout callbacks that may fire after unmount)
  useEffect(() => { friendsRef.current = friends; }, [friends]);
  useEffect(() => { requestsRef.current = requests; }, [requests]);
  useEffect(() => { chatFriendRef.current = chatFriend; }, [chatFriend]);

  // Persist chat messages when they change
  useEffect(() => {
    if (!chatFriend || chatMessages.length === 0) return;
    chatHistoryRef.current[chatFriend.id] = chatMessages;
    AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistoryRef.current)).catch(() => {});
  }, [chatMessages, chatFriend]);

  // Persistence: Save to AsyncStorage
  useEffect(() => {
    if (!isLoaded) return;
    async function saveData() {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ friends, requests }));
      } catch (e) {}
    }
    saveData();
  }, [friends, requests, isLoaded]);

  const saveDirectly = async (updatedFriends: Friend[], updatedRequests: FriendRequest[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ friends: updatedFriends, requests: updatedRequests }));
    } catch (e) {}
  };

  // Periodic incoming requests from CPU profiles
  useEffect(() => {
    const interval = setInterval(() => {
      // Every 45-120s (simulated by checking every 45s with chance, or better, random timeout)
      const pool = CPU_PROFILES.filter(p => 
        !friends.some(f => f.name === p.name) && 
        !requests.some(r => r.name === p.name)
      );
      if (pool.length > 0) {
        const p = pool[Math.floor(Math.random() * pool.length)];
        const newReq: FriendRequest = {
          id: `in_${p.name}`,
          name: p.name,
          level: p.level,
          avatarIcon: p.avatarIcon,
          avatarColor: p.avatarColor,
          photoUrl: p.photoUrl,
          status: "pending",
          direction: "incoming",
        };
        setRequests(prev => [newReq, ...prev]);
        showToast(`${p.name} ${T("sentYouRequest" as any)}`);
      }
    }, 45000 + Math.random() * 75000); // 45s to 120s
    
    return () => clearInterval(interval);
  }, [friends, requests]);

  // Merge outgoing requests from ProfileContext (e.g. sent from ranking screen)
  const processedGlobalRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const pending = profile.pendingOutgoingRequests ?? [];
    pending.forEach((req) => {
      if (processedGlobalRef.current.has(req.id)) return;
      processedGlobalRef.current.add(req.id);

      const outReq: FriendRequest = {
        id: req.id,
        name: req.name,
        level: req.level,
        avatarIcon: req.avatarIcon,
        avatarColor: req.avatarColor,
        photoUrl: req.photoUrl,
        status: "pending",
        direction: "outgoing",
      };
      setRequests(prev => [outReq, ...prev.filter(r => r.id !== req.id)]);

      // Delay for outgoing request response: 15-60s
      const accept = Math.random() < 0.6;
      const delay = 15000 + Math.random() * 45000;
      setTimeout(async () => {
        removeOutgoingFriendRequest(req.id);
        const currentRequests = requestsRef.current.filter(r => r.id !== req.id);
        if (accept) {
          const newFriend: Friend = {
            id: req.id,
            name: req.name,
            level: req.level,
            avatarIcon: req.avatarIcon,
            avatarColor: req.avatarColor,
            photoUrl: req.photoUrl,
            online: Math.random() > 0.4,
            wins: Math.floor(req.level * 12),
            lastSeen: T("statusNow"),
            titleName: T("player"),
          };
          const currentFriends = [newFriend, ...friendsRef.current.filter(f => f.id !== req.id)];
          await saveDirectly(currentFriends, currentRequests);
          setFriends(currentFriends);
          setRequests(currentRequests);
          showToast(`¡${req.name} ${T("acceptedYourRequest" as any)}`);
        } else {
          await saveDirectly(friendsRef.current, currentRequests);
          setRequests(currentRequests);
          showToast(`${req.name} ${T("rejectedYourRequest" as any)}`);
        }
      }, delay);
    });
  }, [profile.pendingOutgoingRequests]);

  const showToast = (msg: string) => {
    setInviteToast(msg);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setInviteToast(null));
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const lower = q.toLowerCase();
    const results = CPU_PROFILES
      .filter(p => p.name.toLowerCase().includes(lower))
      .slice(0, 12)
      .map((p, i) => ({
        id: p.name,
        name: p.name,
        level: p.level,
        avatarIcon: p.avatarIcon,
        avatarColor: p.avatarColor,
        photoUrl: p.photoUrl,
        online: seededRand(i + 22) > 0.5,
        wins: Math.floor(p.level * 12),
        lastSeen: LAST_SEEN[Math.floor(seededRand(i + 6) * LAST_SEEN.length)],
        titleName: TITLE_NAMES[p.titleId] ?? T("player"),
      }));
    setSearchResults(results);
  };

  const handleAddFriend = (name: string) => {
    setSentRequests(prev => new Set([...prev, name]));
    setProfileModal(null);

    const cpuP = CPU_PROFILES.find(p => p.name === name);
    if (cpuP) {
      const outReq: FriendRequest = {
        id: `out_${name}`,
        name: cpuP.name,
        level: cpuP.level,
        avatarIcon: cpuP.avatarIcon,
        avatarColor: cpuP.avatarColor,
        photoUrl: cpuP.photoUrl,
        status: "pending",
        direction: "outgoing",
      };
      setRequests(prev => [outReq, ...prev.filter(r => r.id !== `out_${name}`)]);
    }

    // Delay for outgoing request response: 15-60s
    const accept = Math.random() < 0.6;
    const delay = 15000 + Math.random() * 45000;
    setTimeout(async () => {
      const currentRequests = requestsRef.current.filter(r => r.id !== `out_${name}`);
      if (accept) {
        const cpuProfile = CPU_PROFILES.find(p => p.name === name);
        if (cpuProfile) {
          const newFriend: Friend = {
            id: cpuProfile.name,
            name: cpuProfile.name,
            level: cpuProfile.level,
            avatarIcon: cpuProfile.avatarIcon,
            avatarColor: cpuProfile.avatarColor,
            photoUrl: cpuProfile.photoUrl,
            online: Math.random() > 0.4,
            wins: Math.floor(cpuProfile.level * 12),
            lastSeen: T("statusNow"),
            titleName: TITLE_NAMES[cpuProfile.titleId] ?? T("player"),
          };
          const currentFriends = [newFriend, ...friendsRef.current.filter(f => f.id !== name)];
          await saveDirectly(currentFriends, currentRequests);
          setFriends(currentFriends);
          setRequests(currentRequests);
          setSentRequests(prev => { const s = new Set(prev); s.delete(name); return s; });
          showToast(`¡${name} aceptó tu solicitud!`);
        }
      } else {
        await saveDirectly(friendsRef.current, currentRequests);
        setRequests(currentRequests);
        setSentRequests(prev => { const s = new Set(prev); s.delete(name); return s; });
        showToast(`${name} rechazó tu solicitud`);
      }
    }, delay);

    showToast(T("requestSent" as any));
  };

  const handleAcceptRequest = (req: FriendRequest) => {
    const newFriend: Friend = {
      id: req.name,
      name: req.name,
      level: req.level,
      avatarIcon: req.avatarIcon,
      avatarColor: req.avatarColor,
      photoUrl: req.photoUrl,
      online: true,
      wins: Math.floor(req.level * 12),
      lastSeen: T("statusNow"),
      titleName: T("player"),
    };
    setFriends(prev => [newFriend, ...prev]);
    setRequests(prev => prev.filter(r => r.id !== req.id));
    showToast(`${T("nowFriendsWith" as any)} ${req.name}`);
  };

  const handleRejectRequest = (req: FriendRequest) => {
    setRequests(prev => prev.filter(r => r.id !== req.id));
  };

  const handleRemoveFriend = (id: string) => {
    setFriends(prev => prev.filter(f => f.id !== id));
  };

  const openProfile = (f: Friend) => {
    setProfileModal({
      name: f.name,
      level: f.level,
      wins: f.wins,
      score: f.wins * 10,
      avatarIcon: f.avatarIcon,
      avatarColor: f.avatarColor,
      photoUrl: f.photoUrl,
      titleName: f.titleName,
      isFriend: true,
    });
  };

  const onlineFriends = friends.filter(f => f.online);
  const offlineFriends = friends.filter(f => !f.online);

  const bg = isDark ? ["#010804", "#041008"] as const : ["#e8f5e2", "#d0e8c8"] as const;
  const surfaceColor = isDark ? Colors.surface : "#c4ddb8";
  const textColor = isDark ? Colors.text : "#1a3a1a";
  const textMuted = isDark ? Colors.textMuted : "#4a7a4a";
  const borderColor = isDark ? Colors.border : "#aacfa0";

  const handleInvite = (friend: Friend) => {
    showToast(`${T("invitationSentTo" as any)} ${friend.name}`);
    
    // 75% for online, 20% for offline
    const acceptProb = friend.online ? 0.75 : 0.20;
    const accepts = Math.random() < acceptProb;
    const delay = 1500 + Math.random() * 1500;

    setTimeout(() => {
      if (accepts) {
        showToast(`¡${friend.name} ${T("friendAcceptedMatch" as any)}`);
        setTimeout(() => {
          router.push(`/game-online?count=2&rivalName=${encodeURIComponent(friend.name)}`);
        }, 1000);
      } else {
        showToast(`${friend.name} ${T("notAvailableNow" as any)}`);
      }
    }, delay);
  };

  const openChat = (friend: Friend) => {
    setSelectMode(false);
    setSelectedMsgIds(new Set());
    setChatFriend(friend);
    const existing = chatHistoryRef.current[friend.id];
    if (existing && existing.length > 0) {
      setChatMessages(existing);
    } else {
      setChatMessages([{
        id: "1",
        text: friend.online ? "Hola! Estoy en línea, listo para jugar." : `Hola! Ahora no estoy disponible pero te responderé pronto.`,
        fromMe: false,
        ts: Date.now() - 60000,
      }]);
    }
    setChatInput("");
  };

  const sendChatMessage = () => {
    if (!chatInput.trim() || !chatFriend) return;
    const input = chatInput.trim();
    const myMsg: ChatMessage = {
      id: Date.now().toString(),
      text: input,
      fromMe: true,
      ts: Date.now(),
    };
    setChatMessages(prev => [...prev, myMsg]);
    setChatInput("");
    setTimeout(() => chatListRef.current?.scrollToEnd?.({ animated: true }), 100);

    const rand = Math.random();
    let replyDelay: number;
    if (rand < 0.25) {
      // 25%: quick response 6-12s
      replyDelay = 6000 + Math.random() * 6000;
    } else if (rand < 0.65) {
      // 40%: medium response 15-45s
      replyDelay = 15000 + Math.random() * 30000;
    } else {
      // 35%: slow response 1-5 minutes
      replyDelay = 60000 + Math.random() * 240000;
    }

    // Typing indicator logic
    const showTyping = () => {
      setIsTyping(true);
      setTimeout(() => chatListRef.current?.scrollToEnd?.({ animated: true }), 50);
    };

    // Sometimes they "see" it but don't type immediately
    const initialWait = 1000 + Math.random() * 2000;
    setTimeout(() => {
      // 80% chance to show typing indicator before replying
      if (Math.random() < 0.8) {
        showTyping();
        // Sometimes typing indicator disappears and reappears
        if (replyDelay > 15000 && Math.random() < 0.5) {
          setTimeout(() => {
            setIsTyping(false);
            setTimeout(() => {
              if (chatFriend) showTyping();
            }, 5000 + Math.random() * 10000);
          }, 5000 + Math.random() * 5000);
        }
      }
    }, initialWait);
    
    setTimeout(() => {
      setIsTyping(false);
      const reply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: getContextualReply(input),
        fromMe: false,
        ts: Date.now(),
      };
      setChatMessages(prev => [...prev, reply]);
      setTimeout(() => chatListRef.current?.scrollToEnd?.({ animated: true }), 100);
    }, replyDelay);
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <Pressable
      style={({ pressed }) => [styles.friendRow, { backgroundColor: surfaceColor, borderColor }, pressed && { opacity: 0.85 }]}
      onPress={() => openProfile(item)}
    >
      <View style={styles.friendLeft}>
        <View style={styles.avatarWrap}>
          {item.photoUrl ? (
            <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarIcon, { backgroundColor: item.avatarColor + "33" }]}>
              <Ionicons name={item.avatarIcon as any} size={22} color={item.avatarColor} />
            </View>
          )}
          <View style={[styles.statusDot, { backgroundColor: item.online ? "#27AE60" : "#555" }]} />
        </View>
        <View style={styles.friendInfo}>
          <Text style={[styles.friendName, { color: textColor }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.friendSub, { color: textMuted }]}>
            Nv.{item.level} · {item.online ? T("statusOnline") : item.lastSeen}
          </Text>
        </View>
      </View>
      <View style={styles.friendRight}>
        <Pressable
          style={[styles.chatBtn]}
          onPress={(e) => { e.stopPropagation(); openChat(item); }}
        >
          <View style={[styles.chatBtnInner, { backgroundColor: "#3498DB22", borderColor: "#3498DB44" }]}>
            <Ionicons name="chatbubble-ellipses" size={13} color="#3498DB" />
          </View>
        </Pressable>
        <Pressable
          style={[styles.inviteBtn]}
          onPress={() => handleInvite(item)}
        >
          <LinearGradient colors={[Colors.gold, "#A07800"]} style={styles.inviteBtnGrad}>
            <Ionicons name="game-controller" size={13} color="#1a0a00" />
          </LinearGradient>
        </Pressable>
        <Pressable onPress={() => handleRemoveFriend(item.id)} style={styles.removeBtn}>
          <Ionicons name="close-circle-outline" size={18} color={textMuted} />
        </Pressable>
      </View>
    </Pressable>
  );

  const renderRequest = ({ item }: { item: FriendRequest }) => (
    <View style={[styles.requestRow, { backgroundColor: surfaceColor, borderColor }]}>
      <View style={styles.friendLeft}>
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarIcon, { backgroundColor: item.avatarColor + "33" }]}>
            <Ionicons name={item.avatarIcon as any} size={22} color={item.avatarColor} />
          </View>
        )}
        <View style={styles.friendInfo}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[styles.friendName, { color: textColor }]} numberOfLines={1}>{item.name}</Text>
            <View style={[{
              paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1,
              backgroundColor: item.direction === "incoming" ? "#27AE6022" : "#4A90E222",
              borderColor: item.direction === "incoming" ? "#27AE6044" : "#4A90E244",
            }]}>
              <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 9, color: item.direction === "incoming" ? "#27AE60" : "#4A90E2" }}>
                {item.direction === "incoming" ? "→ TÚ" : "ENVIADA"}
              </Text>
            </View>
          </View>
          <Text style={[styles.friendSub, { color: textMuted }]}>
            Nv.{item.level} · {item.direction === "incoming" ? "Quiere ser tu amigo" : "Esperando respuesta..."}
          </Text>
        </View>
      </View>
      {item.direction === "incoming" ? (
        <View style={styles.requestBtns}>
          <Pressable style={styles.acceptBtn} onPress={() => handleAcceptRequest(item)}>
            <LinearGradient colors={["#27AE60", "#1a7a43"]} style={styles.reqBtnGrad}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </LinearGradient>
          </Pressable>
          <Pressable style={styles.rejectBtn} onPress={() => handleRejectRequest(item)}>
            <View style={[styles.reqBtnGrad, { backgroundColor: "#E74C3C22", borderWidth: 1, borderColor: "#E74C3C44" }]}>
              <Ionicons name="close" size={14} color="#E74C3C" />
            </View>
          </Pressable>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 8, alignItems: "center", gap: 2, flexDirection: "row" }}>
          <View style={{ marginRight: 4 }}>
            <Ionicons name="time-outline" size={16} color={textMuted} />
          </View>
          <Text style={{ fontFamily: "Nunito_400Regular", fontSize: 9, color: textMuted }}>Pendiente...</Text>
        </View>
      )}
    </View>
  );

  const renderSearchResult = ({ item }: { item: Friend }) => {
    const alreadyFriend = friends.some(f => f.id === item.id);
    const sent = sentRequests.has(item.name);
    return (
      <Pressable
        style={({ pressed }) => [styles.friendRow, { backgroundColor: surfaceColor, borderColor }, pressed && { opacity: 0.85 }]}
        onPress={() => setProfileModal({
          name: item.name, level: item.level, wins: item.wins, score: item.wins * 10,
          avatarIcon: item.avatarIcon, avatarColor: item.avatarColor, photoUrl: item.photoUrl,
          isFriend: alreadyFriend, requestSent: sent,
        })}
      >
        <View style={styles.friendLeft}>
          <View style={styles.avatarWrap}>
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarIcon, { backgroundColor: item.avatarColor + "33" }]}>
                <Ionicons name={item.avatarIcon as any} size={22} color={item.avatarColor} />
              </View>
            )}
          </View>
          <View style={styles.friendInfo}>
            <Text style={[styles.friendName, { color: textColor }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.friendSub, { color: textMuted }]}>Nv.{item.level}</Text>
          </View>
        </View>
        {!alreadyFriend && !sent && (
          <Pressable style={styles.addBtn} onPress={() => handleAddFriend(item.name)}>
            <LinearGradient colors={["#27AE60", "#1a7a43"]} style={styles.addBtnGrad}>
              <Ionicons name="person-add" size={14} color="#fff" />
            </LinearGradient>
          </Pressable>
        )}
        {sent && <Ionicons name="checkmark-circle" size={20} color={Colors.textMuted} />}
        {alreadyFriend && <Ionicons name="people" size={18} color={Colors.gold} />}
      </Pressable>
    );
  };

  return (
    <LinearGradient colors={bg} style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={textColor} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: textColor }]}>Amigos</Text>
        <View style={[styles.countBadge, { backgroundColor: Colors.gold + "22" }]}>
          <Text style={styles.countBadgeTxt}>{friends.length}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: borderColor }]}>
        {(["friends", "requests", "search"] as const).map(t => {
          const labels = { friends: "Amigos", requests: `Solicitudes${requests.length ? ` (${requests.length})` : ""}`, search: "Buscar" };
          const icons = { friends: "people", requests: "person-add", search: "search" };
          return (
            <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Ionicons name={icons[t] as any} size={14} color={tab === t ? Colors.gold : textMuted} />
              <Text style={[styles.tabLabel, { color: tab === t ? Colors.gold : textMuted }]}>{labels[t]}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Friends tab */}
      {tab === "friends" && (
        <FlatList
          data={[...onlineFriends, ...offlineFriends]}
          keyExtractor={i => i.id}
          renderItem={renderFriend}
          contentContainerStyle={{ padding: 14, gap: 8, paddingBottom: botPad + 20 }}
          ListHeaderComponent={
            friends.length > 0 ? (
              <View style={styles.onlineHeader}>
                <View style={[styles.onlineDot, { backgroundColor: "#27AE60" }]} />
                <Text style={[styles.onlineHeaderTxt, { color: textMuted }]}>
                  {onlineFriends.length} en línea · {offlineFriends.length} desconectados
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={textMuted} />
              <Text style={[styles.emptyTxt, { color: textMuted }]}>Aún no tienes amigos</Text>
              <Text style={[styles.emptySubTxt, { color: textMuted }]}>Búscalos en la pestaña "Buscar"</Text>
            </View>
          }
        />
      )}

      {/* Requests tab */}
      {tab === "requests" && (
        <FlatList
          data={requests}
          keyExtractor={i => i.id}
          renderItem={renderRequest}
          contentContainerStyle={{ padding: 14, gap: 8, paddingBottom: botPad + 20 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="person-add-outline" size={48} color={textMuted} />
              <Text style={[styles.emptyTxt, { color: textMuted }]}>No hay solicitudes pendientes</Text>
            </View>
          }
        />
      )}

      {/* Search tab */}
      {tab === "search" && (
        <View style={{ flex: 1 }}>
          <View style={[styles.searchBox, { backgroundColor: surfaceColor, borderColor }]}>
            <Ionicons name="search" size={16} color={textMuted} />
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              placeholder="Buscar jugadores..."
              placeholderTextColor={textMuted}
              value={searchQuery}
              onChangeText={handleSearch}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => { setSearchQuery(""); setSearchResults([]); }}>
                <Ionicons name="close-circle" size={16} color={textMuted} />
              </Pressable>
            )}
          </View>
          <FlatList
            data={searchResults}
            keyExtractor={i => i.id}
            renderItem={renderSearchResult}
            contentContainerStyle={{ padding: 14, gap: 8, paddingBottom: botPad + 20 }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={44} color={textMuted} />
                <Text style={[styles.emptyTxt, { color: textMuted }]}>
                  {searchQuery.length < 2 ? "Escribe al menos 2 caracteres" : "No se encontraron jugadores"}
                </Text>
              </View>
            }
          />
        </View>
      )}

      {/* Chat Modal */}
      <Modal
        visible={!!chatFriend}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setChatFriend(null)}
      >
        {chatFriend && (
          <View style={[styles.chatModal, { backgroundColor: isDark ? "#010804" : "#eaf6e4", paddingTop: topPad }]}>
            {/* Chat Header — normal mode */}
            {!selectMode ? (
              <View style={[styles.chatHeader, { borderBottomColor: borderColor }]}>
                <Pressable onPress={() => setChatFriend(null)} style={styles.backBtn}>
                  <Ionicons name="chevron-back" size={22} color={textColor} />
                </Pressable>
                <View style={[styles.avatarIcon, { backgroundColor: chatFriend.avatarColor + "33", width: 32, height: 32, borderRadius: 16 }]}>
                  <Ionicons name={chatFriend.avatarIcon as any} size={16} color={chatFriend.avatarColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.friendName, { color: textColor }]}>{chatFriend.name}</Text>
                  <Text style={[styles.friendSub, { color: textMuted }]}>{chatFriend.online ? T("statusOnline") : chatFriend.lastSeen}</Text>
                </View>
                <Pressable
                  onPress={() => {
                    Alert.alert(
                      T("deleteConvTitle"),
                      T("deleteConvMsg"),
                      [
                        { text: T("cancel"), style: "cancel" },
                        { text: T("deleteAction"), style: "destructive", onPress: () => {
                            setChatMessages([]);
                            if (chatFriend) {
                              delete chatHistoryRef.current[chatFriend.id];
                              AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistoryRef.current)).catch(() => {});
                            }
                          } },
                      ]
                    );
                  }}
                  style={[styles.inviteBtn, { backgroundColor: "#E74C3C22", borderRadius: 18, width: 36, height: 36, alignItems: "center", justifyContent: "center", marginRight: 4 }]}
                >
                  <Ionicons name="trash-outline" size={15} color="#E74C3C" />
                </Pressable>
                <Pressable
                  onPress={() => { setChatFriend(null); handleInvite(chatFriend); }}
                  style={[styles.inviteBtn, { marginRight: 4 }]}
                >
                  <LinearGradient colors={[Colors.gold, "#A07800"]} style={styles.inviteBtnGrad}>
                    <Ionicons name="game-controller" size={13} color="#1a0a00" />
                  </LinearGradient>
                </Pressable>
              </View>
            ) : (
              /* Chat Header — select mode */
              <View style={[styles.chatHeader, { borderBottomColor: borderColor, backgroundColor: isDark ? "#1a0808" : "#fde8e8" }]}>
                <Pressable onPress={() => { setSelectMode(false); setSelectedMsgIds(new Set()); }} style={styles.backBtn}>
                  <Ionicons name="close" size={22} color={textColor} />
                </Pressable>
                <Text style={[styles.friendName, { flex: 1, color: textColor }]}>
                  {selectedMsgIds.size} seleccionado{selectedMsgIds.size !== 1 ? "s" : ""}
                </Text>
                {selectedMsgIds.size > 0 && (
                  <Pressable
                    onPress={() => {
                      setChatMessages(prev => {
                        const next = prev.filter(m => !selectedMsgIds.has(m.id));
                        if (chatFriend) {
                          chatHistoryRef.current[chatFriend.id] = next;
                          AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistoryRef.current)).catch(() => {});
                        }
                        return next;
                      });
                      setSelectMode(false);
                      setSelectedMsgIds(new Set());
                    }}
                    style={{ backgroundColor: "#E74C3C", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 5, marginRight: 8 }}
                  >
                    <Ionicons name="trash" size={14} color="#fff" />
                    <Text style={{ color: "#fff", fontFamily: "Nunito_700Bold", fontSize: 13 }}>Eliminar</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Messages */}
            <FlatList
              ref={chatListRef}
              data={chatMessages}
              keyExtractor={m => m.id}
              contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 8 }}
              renderItem={({ item: msg }) => {
                const isSelected = selectedMsgIds.has(msg.id);
                return (
                  <Pressable
                    onLongPress={() => {
                      if (!selectMode) {
                        setSelectMode(true);
                        setSelectedMsgIds(new Set([msg.id]));
                      } else {
                        setSelectedMsgIds(prev => {
                          const next = new Set(prev);
                          next.has(msg.id) ? next.delete(msg.id) : next.add(msg.id);
                          return next;
                        });
                      }
                    }}
                    onPress={() => {
                      if (selectMode) {
                        setSelectedMsgIds(prev => {
                          const next = new Set(prev);
                          next.has(msg.id) ? next.delete(msg.id) : next.add(msg.id);
                          return next;
                        });
                      }
                    }}
                    delayLongPress={400}
                  >
                    <View style={[
                      styles.chatBubble,
                      msg.fromMe
                        ? { alignSelf: "flex-end", backgroundColor: isSelected ? Colors.gold + "55" : Colors.gold + "22", borderColor: isSelected ? Colors.gold : Colors.gold + "44" }
                        : { alignSelf: "flex-start", backgroundColor: isSelected ? (isDark ? "#2a5a2a" : "#aad6a0") : (isDark ? "#1a3a1a" : "#c8e6c0"), borderColor: isSelected ? Colors.gold : borderColor },
                      deleteMsgId === msg.id && { opacity: 0.5 },
                    ]}>
                      {selectMode && (
                        <View style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: 9, backgroundColor: isSelected ? Colors.gold : borderColor, alignItems: "center", justifyContent: "center", zIndex: 1, borderWidth: 2, borderColor: isDark ? "#010804" : "#fff" }}>
                          {isSelected && <Ionicons name="checkmark" size={10} color="#1a0a00" />}
                        </View>
                      )}
                      <Text style={[styles.chatBubbleTxt, { color: textColor }]}>{msg.text}</Text>
                      <Text style={[styles.chatBubbleTime, { color: textMuted }]}>
                        {new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
              ListFooterComponent={isTyping ? (
                <View style={[styles.chatBubble, { alignSelf: "flex-start", backgroundColor: isDark ? "#1a3a1a" : "#c8e6c0", borderColor, marginTop: 10 }]}>
                  <View style={{ flexDirection: "row", gap: 5, alignItems: "center", paddingHorizontal: 2, paddingVertical: 4 }}>
                    {[0, 1, 2].map(i => (
                      <View key={i} style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: textMuted, opacity: 0.7 }} />
                    ))}
                  </View>
                </View>
              ) : null}
              ListEmptyComponent={<Text style={[styles.friendSub, { color: textMuted, textAlign: "center", marginTop: 40 }]}>Empieza una conversación!</Text>}
              onLayout={() => chatListRef.current?.scrollToEnd?.({ animated: false })}
            />

            {/* Input */}
            <View style={[styles.chatInputRow, { backgroundColor: isDark ? "#0a1a0a" : "#dcefd6", borderTopColor: borderColor, paddingBottom: botPad + 8 }]}>
              <TextInput
                style={[styles.chatInput, { color: textColor, backgroundColor: isDark ? "#1a2e1a" : "#c8e6c0", borderColor }]}
                placeholder="Escribe un mensaje..."
                placeholderTextColor={textMuted}
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={sendChatMessage}
                returnKeyType="send"
                multiline={false}
              />
              <Pressable
                onPress={sendChatMessage}
                style={[styles.chatSendBtn, { opacity: chatInput.trim() ? 1 : 0.4 }]}
              >
                <LinearGradient colors={[Colors.gold, "#A07800"]} style={styles.chatSendBtnGrad}>
                  <Ionicons name="send" size={16} color="#1a0a00" />
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        )}
      </Modal>

      {/* Player profile modal */}
      <PlayerProfileModal
        visible={!!profileModal}
        player={profileModal}
        onClose={() => setProfileModal(null)}
        onAddFriend={handleAddFriend}
        onInvite={(name) => {
          setProfileModal(null);
          const friend = friends.find(f => f.name === name);
          if (friend) {
            handleInvite(friend);
          } else {
            showToast(`${T("invitationSentTo" as any)} ${name}`);
          }
        }}
      />

      {/* Toast */}
      {inviteToast && (
        <Animated.View style={[styles.toast, { opacity: toastAnim, bottom: botPad + 20 }]}>
          <Ionicons name="checkmark-circle" size={16} color="#27AE60" />
          <Text style={styles.toastTxt}>{inviteToast}</Text>
        </Animated.View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 20,
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gold + "44",
  },
  countBadgeTxt: {
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    color: Colors.gold,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginHorizontal: 14,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: Colors.gold,
  },
  tabLabel: {
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
  },
  onlineHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  onlineHeaderTxt: {
    fontFamily: "Nunito_700Bold",
    fontSize: 11,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  friendLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatarIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#041008",
  },
  friendInfo: { flex: 1, gap: 2 },
  friendName: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
  },
  friendSub: {
    fontFamily: "Nunito_400Regular",
    fontSize: 11,
  },
  friendRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inviteBtn: {
    borderRadius: 8,
    overflow: "hidden",
  },
  inviteBtnGrad: {
    padding: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: { padding: 4 },
  requestBtns: {
    flexDirection: "row",
    gap: 6,
  },
  acceptBtn: { borderRadius: 8, overflow: "hidden" },
  rejectBtn: { borderRadius: 8, overflow: "hidden" },
  reqBtnGrad: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: { borderRadius: 8, overflow: "hidden" },
  addBtnGrad: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 14,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    padding: 0,
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    gap: 8,
  },
  emptyTxt: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
  },
  emptySubTxt: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
  },
  toast: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  toastTxt: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    color: Colors.text,
  },
  chatBtn: { borderRadius: 8, overflow: "hidden" },
  chatBtnInner: { padding: 7, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  chatModal: { flex: 1 },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  chatBubble: {
    maxWidth: "80%",
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
  },
  chatBubbleTxt: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  chatBubbleTime: {
    fontFamily: "Nunito_400Regular",
    fontSize: 10,
    alignSelf: "flex-end",
  },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  chatInput: {
    flex: 1,
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
  },
  chatSendBtn: { borderRadius: 22, overflow: "hidden" },
  chatSendBtnGrad: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
