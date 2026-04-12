import { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../utils/supabaseClient";
import apiFetch from "../../utils/apiFetch";
import { tapHaptic } from "../../utils/haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { useTimezone } from "../../contexts/TimezoneContext";
import { useConversations } from "../../contexts/ConversationsContext";
import ScreenHeader from "../../components/ScreenHeader";
import ReportModal from "../../components/ReportModal";
import { formatTime } from "../../utils/timezone";

const MESSAGE_MAX_LENGTH = 500;

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { timezone } = useTimezone();
  const params = useLocalSearchParams<{ conversationId?: string }>();

  // Conversations come from ConversationsContext — prefetched at login, shared app-wide.
  const {
    conversations,
    profiles,
    listings,
    unreadCounts,
    loaded: conversationsLoaded,
    hasMore: convoHasMore,
    loadMore: loadMoreConvos,
    removeConversation,
    markConversationRead,
    getCachedThread,
    setCachedThread,
  } = useConversations();
  const loadingConversations = !conversationsLoaded;

  const [selectedConvo, setSelectedConvo] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [msgPage, setMsgPage] = useState(1);
  const [msgHasMore, setMsgHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const hideConversation = (convo: any) => {
    Alert.alert("Close Conversation", "Are you sure you want to close this conversation?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Close", style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/api/conversations/${convo.id}`, { method: "DELETE" });
            removeConversation(convo.id);
            if (selectedConvo?.id === convo.id) setSelectedConvo(null);
          } catch (err) { console.error("Close conversation error:", err); }
        },
      },
    ]);
  };
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string } | null>(null);

  // Auto-select conversation from params (e.g. from "Message Poster" button)
  useEffect(() => {
    if (!params.conversationId || !conversations.length) return;
    const match = conversations.find((c) => c.id === params.conversationId);
    if (match && selectedConvo?.id !== match.id) setSelectedConvo(match);
  }, [params.conversationId, conversations]);

  useEffect(() => {
    if (!selectedConvo) { setMessages([]); setIsClosed(false); setMsgPage(1); setMsgHasMore(false); return; }
    let active = true;

    // Cache-first: if the thread is prefetched, paint instantly and skip spinner.
    // Then do a background fetch to catch any messages since the cache was warmed.
    const cached = getCachedThread(selectedConvo.id);
    if (cached) {
      setMessages(cached.messages);
      setIsClosed(cached.isClosed);
      setMsgHasMore(cached.hasMore);
      setMsgPage(1);
      setLoadingMessages(false);
    } else {
      setLoadingMessages(true);
    }

    (async () => {
      try {
        const result = await apiFetch(`/api/conversations/${selectedConvo.id}/messages`);
        if (active) {
          setMessages(result?.messages || []);
          setIsClosed(result?.isClosed || false);
          setMsgHasMore(result?.hasMore ?? false);
          setMsgPage(1);
          setLoadingMessages(false);
          // Warm the cache so a later re-open of the same thread is instant.
          setCachedThread(selectedConvo.id, {
            messages: result?.messages || [],
            isClosed: result?.isClosed || false,
            hasMore: result?.hasMore ?? false,
          });
        }
        apiFetch(`/api/conversations/${selectedConvo.id}/read`, { method: "PATCH" }).catch(() => {});
      } catch (err) { console.error("Fetch messages error:", err); if (active) setLoadingMessages(false); }
    })();

    const channel = supabase
      .channel(`messages-${selectedConvo.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConvo.id}` }, (payload) => {
        setMessages((prev) => {
          const cleaned = prev.filter((m) => !(typeof m.id === "string" && m.id.startsWith("temp-") && m.sender_id === payload.new.sender_id));
          if (cleaned.some((m) => m.id === payload.new.id)) return cleaned;
          return [...cleaned, payload.new];
        });
      })
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [selectedConvo]);

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
  }, [messages.length]);

  const sendMessage = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed || !selectedConvo || isClosed || sending || trimmed.length > MESSAGE_MAX_LENGTH) return;

    const tempId = `temp-${Date.now()}`;
    tapHaptic();
    setMessages((prev) => [...prev, { id: tempId, conversation_id: selectedConvo.id, sender_id: user.id, content: trimmed, created_at: new Date().toISOString(), is_system: false }]);
    setNewMessage("");
    setSending(true);

    try {
      await apiFetch(`/api/conversations/${selectedConvo.id}/messages`, { method: "POST", body: JSON.stringify({ content: trimmed }) });
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNewMessage(trimmed);
    }
    setSending(false);
  };

  const otherId = selectedConvo ? (selectedConvo.participant_1 === user.id ? selectedConvo.participant_2 : selectedConvo.participant_1) : "";
  const otherName = selectedConvo && profiles[otherId] ? `${profiles[otherId].first_name} ${profiles[otherId].last_name}` : "User";
  const selectedListing = selectedConvo ? listings[selectedConvo.listing_id] : null;

  // ── Thread view ──
  if (selectedConvo) {
    return (
      <>
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, paddingBottom: insets.bottom + 80 }} edges={["top"]}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.separator }}>
          <TouchableOpacity onPress={() => setSelectedConvo(null)} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={t.accent} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: t.text }} numberOfLines={1}>{selectedListing?.title || "Conversation"}</Text>
            <Text style={{ fontSize: 12, color: t.subtext }}>{otherName}</Text>
          </View>
          <TouchableOpacity onPress={() => setReportTarget({ id: otherId, name: otherName })} hitSlop={12}>
            <Ionicons name="flag-outline" size={20} color={t.muted} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderBottomWidth: 1, backgroundColor: t.isDark ? "#3a2f22" : "#fff8e1", borderBottomColor: t.isDark ? "rgba(255,193,7,0.35)" : "#ffe082" }}>
          <Ionicons name="warning-outline" size={14} color="#f59e0b" />
          <Text style={{ fontSize: 11, fontWeight: "600", flex: 1, color: t.isDark ? "#f6c66a" : "#92400e" }}>Never share personal info. Always meet in a public place.</Text>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {loadingMessages ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><ActivityIndicator size="large" color={t.accent} /></View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ padding: 12, gap: 4 }}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              ListHeaderComponent={msgHasMore ? (
                <TouchableOpacity
                  style={{ alignSelf: "center", paddingVertical: 8 }}
                  disabled={loadingOlder}
                  onPress={async () => {
                    setLoadingOlder(true);
                    try {
                      const nextPage = msgPage + 1;
                      const result = await apiFetch(`/api/conversations/${selectedConvo.id}/messages?page=${nextPage}&limit=10`);
                      const olderMsgs = result?.messages || [];
                      setMessages((prev) => [...olderMsgs, ...prev]);
                      setMsgHasMore(result?.hasMore ?? false);
                      setMsgPage(nextPage);
                    } catch (err) { console.error("Load older error:", err); }
                    setLoadingOlder(false);
                  }}
                >
                  {loadingOlder ? <ActivityIndicator size="small" color={t.accent} /> : <Text style={{ color: t.accent, fontWeight: "700", fontSize: 13 }}>Load older messages</Text>}
                </TouchableOpacity>
              ) : null}
              renderItem={({ item: msg }) => {
                if (msg.is_system) return (
                  <View style={{ alignSelf: "center", borderRadius: 99, paddingHorizontal: 14, paddingVertical: 4, marginVertical: 4, backgroundColor: t.inputBg }}>
                    <Text style={{ fontSize: 12, color: t.muted }}>{msg.content}</Text>
                  </View>
                );
                const isOwn = msg.sender_id === user.id;
                return (
                  <View style={{ maxWidth: "80%", marginVertical: 2, alignSelf: isOwn ? "flex-end" : "flex-start" }}>
                    <View style={{ borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, ...(isOwn ? { backgroundColor: t.accent } : { backgroundColor: t.cardSolid, borderWidth: 1, borderColor: t.cardBorder }) }}>
                      <Text style={{ fontSize: 14, lineHeight: 20, color: isOwn ? "#fff" : t.text }}>{msg.content}</Text>
                    </View>
                    <Text style={{ fontSize: 10, marginTop: 3, color: t.muted, textAlign: isOwn ? "right" : "left" }}>{formatTime(msg.created_at, timezone)}</Text>
                  </View>
                );
              }}
            />
          )}

          {isClosed ? (
            <View style={{ padding: 14, borderTopWidth: 1, borderTopColor: t.separator, alignItems: "center" }}>
              <Text style={{ fontWeight: "700", fontSize: 13, color: t.muted }}>This conversation has been closed.</Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.separator, backgroundColor: t.bg, gap: 8 }}>
              <TextInput
                style={{ flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100, borderWidth: 1, backgroundColor: t.inputBg, color: t.text, borderColor: t.inputBorder }}
                placeholder="Type a message..."
                placeholderTextColor={t.muted}
                value={newMessage}
                onChangeText={(txt) => setNewMessage(txt.slice(0, MESSAGE_MAX_LENGTH))}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
                multiline
                maxLength={MESSAGE_MAX_LENGTH}
              />
              <TouchableOpacity onPress={sendMessage} disabled={sending || !newMessage.trim()} style={[{ width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" }, (!newMessage.trim() || sending) && { opacity: 0.4 }]}>
                {sending ? <ActivityIndicator size="small" color={t.accent} /> : <Ionicons name="send" size={20} color={t.accent} />}
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
      <ReportModal
        visible={!!reportTarget}
        onClose={() => setReportTarget(null)}
        type="user"
        targetId={reportTarget?.id || ""}
        targetLabel={reportTarget?.name || ""}
      />
      </>
    );
  }

  // ── Conversation list ──
  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dk" edges={["top"]}>
      <ScreenHeader title="Messages" showLogo />

      {loadingConversations ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color={t.accent} /></View>
      ) : conversations.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3 pb-20">
          <Ionicons name="chatbubbles-outline" size={48} color={t.muted} />
          <Text className="text-base font-bold text-muted dark:text-muted-dk">No conversations yet</Text>
          <Text className="text-sm text-subtext dark:text-subtext-dk text-center px-8">
            Start a conversation by tapping on a listing
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 80 }}
          renderItem={({ item: convo }) => {
            const otherId = convo.participant_1 === user.id ? convo.participant_2 : convo.participant_1;
            const other = profiles[otherId];
            const listing = listings[convo.listing_id];
            const initials = other
              ? `${other.first_name?.[0] ?? ""}${other.last_name?.[0] ?? ""}`.toUpperCase()
              : "?";
            const unreadCount = unreadCounts[convo.id] ?? 0;
            return (
              <TouchableOpacity
                className="mx-4 mb-2 p-3 rounded-2xl bg-card dark:bg-card-dk border border-border dark:border-border-dk flex-row items-center gap-3"
                onPress={() => { setSelectedConvo(convo); markConversationRead(convo.id); }}
                onLongPress={() => hideConversation(convo)}
                activeOpacity={0.8}
              >
                {/* Avatar circle with initials */}
                <View className="w-12 h-12 rounded-full bg-separator dark:bg-separator-dk items-center justify-center">
                  <Text className="text-base font-bold text-ink dark:text-ink-dk">{initials}</Text>
                </View>

                {/* Content */}
                <View className="flex-1">
                  <Text className="text-sm font-bold text-ink dark:text-ink-dk" numberOfLines={1}>
                    {listing?.title || "Unknown Listing"}
                  </Text>
                  <Text className="text-xs text-subtext dark:text-subtext-dk mt-0.5" numberOfLines={1}>
                    {other ? `${other.first_name} ${other.last_name}` : "Loading..."}
                  </Text>
                </View>

                {/* Right: unread badge */}
                <View className="items-end gap-1">
                  {unreadCount > 0 && (
                    <View className="w-5 h-5 rounded-full bg-red-500 items-center justify-center">
                      <Text className="text-white text-xs font-bold">{unreadCount}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <ReportModal
        visible={!!reportTarget}
        onClose={() => setReportTarget(null)}
        type="user"
        targetId={reportTarget?.id || ""}
        targetLabel={reportTarget?.name || ""}
      />
    </SafeAreaView>
  );
}

