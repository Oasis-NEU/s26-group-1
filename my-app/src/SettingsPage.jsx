// --- SettingsPage: User account settings UI ---
import { useState } from "react";
import { supabase } from "./supabaseClient";
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Link as MuiLink,
  useTheme
} from "@mui/material";
import { useAuth } from "./AuthContext";
import Avatar from "@mui/material/Avatar";
import SettingsIcon from '@mui/icons-material/Settings';

export default function SettingsPage() {
  // --- Get user, profile, logout, and forgotPassword from AuthContext ---
  const { user, profile, logout, forgotPassword } = useAuth();
  // --- State for feedback message ---
  const [message, setMessage] = useState("");

  // --- State for editing name ---
  const [editMode, setEditMode] = useState(false);
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [nameMessage, setNameMessage] = useState("");

  // --- Handle password reset request ---
  const handleChangePassword = async () => {
    if (!user?.email) return;
    const { error } = await forgotPassword(user.email);
    if (error) {
      setMessage("Error sending password reset email.");
    } else {
      setMessage("Password reset email sent! Check your inbox.");
    }
  };

  // --- Update name in Supabase ---
  const handleSaveName = async () => {
    if (!user?.id) return;
    const { error } = await supabase
      .from('profiles')
      .update({ first_name: firstName, last_name: lastName })
      .eq('id', user.id);
    if (error) {
      setNameMessage("Error updating name.");
    } else {
      setNameMessage("Name updated!");
      setEditMode(false);
      // Optionally, refetch profile here
    }
  };

  // ...existing code...

  return (
    <>
      {/* --- Background gradient layer --- */}
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          background: "linear-gradient(135deg, #e06057 0%, #cf544b 40%, #7a2929 100%)",
        }}
      />

      {/* --- Centered content layer --- */}
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
        }}
      >
        <Container component="main" maxWidth="sm">
          {/* --- Main settings card --- */}
          <Paper
            elevation={6}
            sx={{
              p: 6,
              width: "100%",
              borderRadius: 3,
              backgroundColor: "rgba(255,255,255,0.97)",
              boxShadow: "0px 10px 30px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              lineHeight: 5,
            }}
          >
            {/* --- User avatar and section header --- */}
            <Avatar sx={{ m: 1, bgcolor: "primary.main", width: 56, height: 56 }}>
              <SettingsIcon fontSize="large" />
            </Avatar>
            <Typography variant="h4" align="center" sx={{ mb: 2, fontWeight: 700 }}>
              Account Settings
            </Typography>
            {/* --- User info section --- */}
            <Box sx={{ width: "100%", mb: 4, textAlign: "center" }}>
              <Typography variant="body1" sx={{ fontWeight: 600, color: "#A84D48", mb: 3 }}>
                Email: {user?.email}
              </Typography>
              {editMode ? (
                <Box sx={{ display: "flex", gap: 2, justifyContent: "center", mb: 2 }}>
                  <TextField
                    label="First Name"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    size="small"
                  />
                  <TextField
                    label="Last Name"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    size="small"
                  />
                  <Button variant="contained" color="primary" sx={{ bgcolor: '#7a2929', color: '#fff', boxShadow: 2 }} onClick={handleSaveName}>
                    SAVE
                  </Button>
                  <Button variant="outlined" color="secondary" onClick={() => setEditMode(false)}>
                    CANCEL
                  </Button>
                </Box>
              ) : (
                <Typography variant="body1" sx={{ fontWeight: 600, color: "#A84D48" }}>
                  Name: {profile?.first_name} {profile?.last_name}
                  <Button size="small" sx={{ ml: 2 }} onClick={() => {
                    setFirstName(profile?.first_name || "");
                    setLastName(profile?.last_name || "");
                    setEditMode(true);
                  }}>
                    Edit
                  </Button>
                </Typography>
              )}
              {nameMessage && (
                <Alert severity={nameMessage.includes("Error") ? "error" : "success"} sx={{ mt: 1 }}>
                  {nameMessage}
                </Alert>
              )}
            </Box>
            {/* --- Feedback message section --- */}
            {message && (
              <Alert severity={message.includes("Error") ? "error" : "success"} sx={{ mb: 2, width: "100%" }}>
                {message}
              </Alert>
            )}
            {/* --- Change password button --- */}
            <Button variant="contained" color="primary" sx={{ mt: 2, width: "100%" }} onClick={handleChangePassword}>
              Change Password
            </Button>
            {/* --- Log out button --- */}
            <Button variant="outlined" color="secondary" sx={{ mt: 2, width: "100%" }}
              onClick={logout}
            >
              Log Out
            </Button>
          </Paper>
        </Container>
      </Box>
    </>
  );
}
