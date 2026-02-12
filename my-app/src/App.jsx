import './App.css';
import { Routes, Route, Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import LoginPage from "./LoginPage";
import MapPage from "./MapPage";
import { AppBar, Toolbar, Button, Typography, Container, Box, Paper } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import MapIcon from '@mui/icons-material/Map';
import LogoutIcon from '@mui/icons-material/Logout';

// --- Home: Displays the home page content ---
function Home() {
  return (
    <Container maxWidth="md">
      <Box
        sx={{
          minHeight: 'calc(100vh - 140px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Typography variant="h1" sx={{ fontSize: { xs: '3rem', md: '6rem' }, fontWeight: 700, mb: 2 }}>
          You're Home!
        </Typography>
        <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', md: '2.5rem' } }}>
          Welcome to the Lost & Hound
        </Typography>
      </Box>
    </Container>
  );
}

// --- App: Main application component with routing and navigation ---
export default function App() {
  const { user, logout } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  // Supabase sends verification emails automatically. Optionally, you can add a check for user.confirmed_at if you want to block unverified users.

  return (
    <>
      <AppBar position="fixed">
        <Toolbar>
          <Button
            color="inherit"
            component={Link}
            to="/"
            startIcon={<HomeIcon />}
            sx={{ mr: 2 }}
          >
            Home
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
            {user.email}
          </Typography>
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
      <Box sx={{ mt: 2 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/map" element={<MapPage />} />
        </Routes>
      </Box>
    </>
  );
}