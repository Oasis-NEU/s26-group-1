import './App.css';
import { Routes, Route, Link } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { useAuth } from "./AuthContext";
import LoginPage from "./pages/LoginPage";
import FeedPage from './pages/FeedPage';
import MapPage from "./pages/MapPage";
import SettingsPage from "./pages/SettingsPage";
import { AppBar, Toolbar, Button, Typography, Container, Box, Paper } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import FeedIcon from "@mui/icons-material/DynamicFeed";
import MapIcon from '@mui/icons-material/Map';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { useState } from 'react';

// --- App: Main application component with routing and navigation ---
export default function App() {
  const { user, profile, logout } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  // Supabase sends verification emails automatically. Optionally, you can add a check for user.confirmed_at if you want to block unverified users.

  return (
    <>
      {/* Main app content overlayed above background */}
      <AppBar position="fixed">
        <Toolbar>
          {/* TODO: Add logo on far left of navbar */}
          <Button
            color="inherit"
            component={Link}
            to="/"
            startIcon={<FeedIcon />}
            sx={{ mr: 2 }}
          >
            Feed
          </Button>
          <Button
            color="inherit"
            component={Link}
            to="/map"
            startIcon={<MapIcon />}
          >
            Map
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="body1" sx={{ mr: 2 }}>
            {profile?.first_name && profile?.last_name
              ? profile.first_name + " " + profile.last_name
              : user.email}
          </Typography>
          <Button
            color = "inherit"
            component={Link}
            to="/settings"
            endIcon = {<SettingsIcon />}
            sx={{ mr: 2 }}
          >
            Settings
          </Button>
          <Button
            color="inherit"
            onClick={logout}
            endIcon={<LogoutIcon />}
          >
            Log Out
          </Button>
        </Toolbar>
      </AppBar>
      <Toolbar /> {/* Spacer for fixed AppBar */}
      <Box sx={{ mt: 0 }}>
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Box>
    </>
  );
}
