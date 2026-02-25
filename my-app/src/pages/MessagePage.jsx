import { useState, useEffect } from "react";
import { Box, Typography, Paper } from "@mui/material";
import ChatIcon from "@mui/icons-material/ChatBubbleOutline";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";

export default function MessagesPage() {
  const { user, profile } = useAuth();

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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box sx={{ textAlign: "center", color: "text.disabled" }}>
            <ChatIcon sx={{ fontSize: 48, color: "#d4b5b5", mb: 1 }} />
            <Typography fontWeight={700} color="text.disabled">
              No conversations yet
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}