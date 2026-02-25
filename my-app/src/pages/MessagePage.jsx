import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Typography, Paper, TextField, IconButton } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import ChatIcon from "@mui/icons-material/ChatBubbleOutline";
import DeleteIcon from "@mui/icons-material/Delete";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";

export default function MessagesPage() {
  // Current logged-in user from auth context
  const { user, profile } = useAuth();

  // List of all conversations the current user is a participant in
  const [conversations, setConversations] = useState([]);

  // Messages for the currently selected conversation
  const [messages, setMessages] = useState([]);

  // Whether the selected conversation has been closed by either participant
  const [isClosed, setIsClosed] = useState(false);

  // The conversation the user has clicked on in the sidebar
  const [selectedConversation, setSelectedConversation] = useState(null);

  // Lookup map of { [userId]: { first_name, last_name } } for the other participants
  const [profiles, setProfiles] = useState({});

  // Lookup map of { [item_id]: { title } } for the listing each conversation is about
  const [listings, setListings] = useState({});

  // Controlled input value for the message composer
  const [newMessage, setNewMessage] = useState("");

  // Read ?conversation=<id> from the URL to auto-select on load
  const [searchParams] = useSearchParams();

  // Ref attached to a dummy div at the bottom of the message list for auto-scrolling
  const bottomRef = useRef(null);

  // Tracks which URL ?conversation= ID we've already selected to prevent the effect
  // re-fetching a just-deleted convo when conversations state changes.
  const handledConvoIdRef = useRef(null);

  // Closes a conversation: inserts a system message, records who closed it (so the other
  // participant's input locks in real-time), then hard-deletes everything from the DB.
  const hideConversation = async (convo, e) => {
    e.stopPropagation();

    const name = profile?.first_name ? `${profile.first_name} ${profile.last_name}` : "Someone";
    await supabase.from("messages").insert({
      conversation_id: convo.id,
      sender_id: user.id,
      content: `${name} has closed this conversation.`,
      is_system: true,
    });

    // Insert so the other participant's real-time subscription fires and locks their input
    await supabase.from("hidden_conversations").insert({
      user_id: user.id,
      conversation_id: convo.id,
    });

    // Hard-delete immediately — conversations can't be reopened
    await supabase.from("messages").delete().eq("conversation_id", convo.id);
    await supabase.from("conversations").delete().eq("id", convo.id);

    setConversations((prev) => prev.filter((c) => c.id !== convo.id));
    if (selectedConversation?.id === convo.id) setSelectedConversation(null);
  };

  // Inserts a new message row into Supabase and clears the input field.
  // Guards against empty input, no selected conversation, or a closed conversation.
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isClosed)
        return;
    await supabase.from("messages").insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        content: newMessage
    });
    setNewMessage("");
  };

  // Fetch all conversations where the current user is participant_1 or participant_2.
  // Then fetch the profiles of the other participants and store them in a lookup map.
  // Runs once on mount (when user becomes available).
  useEffect(() => {
    if (!user) return;
    const fetchConversations = async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`);
      if (data) {
        // Fetch conversations this user has hidden and exclude them from the list
        const { data: hiddenData } = await supabase
          .from("hidden_conversations")
          .select("conversation_id")
          .eq("user_id", user.id);
        const hiddenIds = new Set((hiddenData || []).map((h) => h.conversation_id));
        const visible = data.filter((c) => !hiddenIds.has(c.id));
        setConversations(visible);

        // Collect the other participant's ID from each conversation
        const otherIds = visible.map((c) =>
          c.participant_1 === user.id ? c.participant_2 : c.participant_1
        );

        // Fetch all other participant profiles in one query
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", otherIds);

        // Convert array to a keyed object { [id]: profile } for O(1) lookups in the sidebar
        if (profileData) {
          const map = {};
          profileData.forEach((p) => { map[p.id] = p; });
          setProfiles(map);
        }

        // Collect listing IDs and fetch their titles in one query
        const listingIds = visible.map((c) => c.listing_id).filter(Boolean);
        if (listingIds.length > 0) {
          const { data: listingData } = await supabase
            .from("listings")
            .select("item_id, title")
            .in("item_id", listingIds);
          if (listingData) {
            const map = {};
            listingData.forEach((l) => { map[l.item_id] = l; });
            setListings(map);
          }
        }
      }
    };
    fetchConversations();

  }, [user]);

  // Fetch messages for the selected conversation ordered oldest to newest.
  // Also sets up a real-time subscription for live incoming messages.
  // Clears messages when no conversation is selected.
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      setIsClosed(false);
      return;
    }
    setIsClosed(false); // reset while new convo loads

    let channel;
    let closedChannel;
    let active = true; // guard against cleanup firing before subscribe completes

    const setup = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedConversation.id)
        .order("created_at", { ascending: true });

      if (!active) return; // effect was cleaned up while fetch was in-flight
      if (data) setMessages(data);

      // Check if either participant has already closed this conversation
      const { count } = await supabase
        .from("hidden_conversations")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", selectedConversation.id);
      if (!active) return;
      setIsClosed((count ?? 0) > 0);

      // Subscribe to real-time INSERT events only after the initial fetch completes.
      channel = supabase
        .channel(`messages-${selectedConversation.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConversation.id}` }, (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        })
        .subscribe();

      // Lock input in real-time when the other user closes the conversation.
      // Watch for DELETE on conversations — more reliable than hidden_conversations INSERT
      // because the cascade delete can remove that row before the WS event fires.
      closedChannel = supabase
        .channel(`closed-${selectedConversation.id}`)
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "conversations", filter: `id=eq.${selectedConversation.id}` }, () => {
          setIsClosed(true);
          setConversations((prev) => prev.filter((c) => c.id !== selectedConversation.id));
        })
        .subscribe();
    };

    setup();

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
      if (closedChannel) supabase.removeChannel(closedChannel);
    };
  }, [selectedConversation]);

  // Scroll to the bottom of the message list whenever messages change
  // (e.g. new message received or conversation switched).
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // If the URL has ?conversation=<id> (set by the Message button on a listing),
  // auto-select that conversation once available. If it's not in the local list yet
  // (e.g. just created, or user has no other convos), fetch it directly from the DB.
  // handledConvoIdRef prevents re-fetching when conversations state changes after a delete.
  useEffect(() => {
    const convoId = searchParams.get("conversation");
    if (!convoId) return;
    // Already handled this ID — don't re-run (prevents deleted convo from being re-added)
    if (handledConvoIdRef.current === convoId) return;

    const match = conversations.find((c) => c.id === convoId);
    if (match) {
      handledConvoIdRef.current = convoId;
      setSelectedConversation(match);
      return;
    }

    // Not in list yet — fetch it directly (handles brand-new convos and empty sidebar)
    const fetchAndSelect = async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", convoId)
        .single();
      if (!data) return; // doesn't exist or was deleted

      handledConvoIdRef.current = convoId;

      // Fetch the other participant's profile
      const otherId = data.participant_1 === user?.id ? data.participant_2 : data.participant_1;
      const { data: p } = await supabase.from("profiles").select("id, first_name, last_name").eq("id", otherId).single();
      if (p) setProfiles((prev) => ({ ...prev, [p.id]: p }));

      // Fetch the listing title
      if (data.listing_id) {
        const { data: l } = await supabase.from("listings").select("item_id, title").eq("item_id", data.listing_id).single();
        if (l) setListings((prev) => ({ ...prev, [l.item_id]: l }));
      }

      setConversations((prev) => prev.some((c) => c.id === convoId) ? prev : [data, ...prev]);
      setSelectedConversation(data);
    };

    fetchAndSelect();
  }, [conversations, searchParams]);

  return (
    <Box sx={{ display: "flex", justifyContent: "center", width: "100%", p: 3 }}>
      <Box sx={{ width: "100%", maxWidth: 900 }}>
        {/* Header */}
        <Typography variant="h4" fontWeight={900} sx={{ mb: 2.5 }}>
          Messages
        </Typography>

        {/* Main content area */}
        <Paper
          elevation={2}
          sx={{
            height: "calc(100vh - 200px)",
            minHeight: 400,
            borderRadius: 3,
            border: "1.5px solid #ecdcdc",
            overflow: "hidden",
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "row", height: "100%" }}>

            {/* Left sidebar — conversations list */}
            <Box sx={{ width: "30%", borderRight: "1.5px solid #ecdcdc", overflowY: "auto" }}>
              {/* Empty state — no conversations exist yet */}
              {conversations.length === 0 ? (
                <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ p: 2, display: "block" }}>
                  No conversations yet
                </Typography>
              ) : (
                // One clickable row per conversation, highlighted if currently active
                conversations.map((convo) => (
                  <Box
                    key={convo.id}
                    onClick={() => setSelectedConversation(convo)}
                    sx={{
                      p: 2, cursor: "pointer",
                      background: selectedConversation?.id === convo.id ? "#fdf0f0" : "transparent",
                      borderBottom: "1px solid #f5eded",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      "&:hover": { background: "#fdf7f7", "& .delete-btn": { opacity: 1 } },
                    }}
                  >
                    {(() => {
                      // Look up the other participant's profile and listing title from the maps
                      const otherId = convo.participant_1 === user.id ? convo.participant_2 : convo.participant_1;
                      const other = profiles[otherId];
                      const listing = listings[convo.listing_id];
                      return (
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          {/* Listing title — primary bold line */}
                          <Typography fontWeight={700} fontSize={13} noWrap>
                            {listing ? listing.title : "Unknown Listing"}
                          </Typography>
                          {/* Other participant's name — secondary line */}
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {other ? `${other.first_name} ${other.last_name}` : "Loading..."}
                          </Typography>
                        </Box>
                      );
                    })()}
                    {/* Delete button — only visible on row hover */}
                    <IconButton
                      className="delete-btn"
                      size="small"
                      onClick={(e) => hideConversation(convo, e)}
                      sx={{ opacity: 0, transition: "opacity 0.15s", color: "#bbb", "&:hover": { color: "#A84D48" }, ml: 1, flexShrink: 0 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))
              )}
            </Box>

            {/* Right panel — messages */}
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {/* Empty state — prompt user to pick a conversation */}
              {!selectedConversation ? (
                <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Typography fontWeight={700} color="text.disabled">Select a conversation</Typography>
                </Box>
              ) : (
                <>
                {/* Scrollable message bubbles area */}
                <Box sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                  {messages.map((msg) => {
                    // System messages render as a centered grey pill
                    if (msg.is_system) {
                      return (
                        <Box key={msg.id} sx={{ alignSelf: "center", my: 0.5 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              px: 2, py: 0.5, borderRadius: 99,
                              background: "#f0e8e8", color: "#999",
                              display: "block", textAlign: "center",
                            }}
                          >
                            {msg.content}
                          </Typography>
                        </Box>
                      );
                    }

                    // Determine if this message was sent by the current user
                    const isOwn = msg.sender_id === user.id;
                    return (
                      // Align own messages right, others left
                      <Box key={msg.id} sx={{ alignSelf: isOwn ? "flex-end" : "flex-start", maxWidth: "70%" }}>
                        {/* Colored bubble — red for own, grey for theirs */}
                        <Box sx={{
                          p: "10px 14px", borderRadius: 3,
                          background: isOwn ? "#A84D48" : "#f5eded",
                          color: isOwn ? "#fff" : "#333",
                        }}>
                          <Typography fontSize={14}>{msg.content}</Typography>
                        </Box>
                        {/* Timestamp — shown below the bubble, aligned to match the bubble side */}
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          sx={{ display: "block", mt: 0.5, textAlign: isOwn ? "right" : "left" }}
                        >
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </Typography>
                      </Box>
                    );
                  })}
                  {/* Invisible anchor — scrolled into view when new messages arrive */}
                  <div ref={bottomRef} />
                </Box>
                {/* Input row — locked if conversation is closed, otherwise active */}
                {isClosed ? (
                  <Box sx={{ p: 2, borderTop: "1.5px solid #ecdcdc", textAlign: "center" }}>
                    <Typography variant="caption" fontWeight={700} color="text.disabled">
                      This conversation has been closed.
                    </Typography>
                  </Box>
                ) : (
                <Box sx={{ display: "flex", alignItems: "center", p: 1.5, borderTop: "1.5px solid #ecdcdc", gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  />
                  {/* Send button — disabled when input is empty */}
                  <IconButton
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    sx={{ color: "#A84D48" }}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
                )}
                </>  
              )}
            </Box>

          </Box>
        </Paper>
      </Box>
    </Box>
  );
}