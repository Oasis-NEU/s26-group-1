import './App.css';
import { Routes, Route, Link } from "react-router-dom";
import { sendEmailVerification } from "firebase/auth";
import { useAuth } from "./AuthContext";
import LoginPage from "./LoginPage";
import MapPage from "./MapPage";
import { AppBar, Toolbar, Button, Typography, Container, Box, Paper } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import MapIcon from '@mui/icons-material/Map';
import LogoutIcon from '@mui/icons-material/Logout';

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

export default function App() {
  const { user, logout } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  if (!user.emailVerified) {
    const handleResend = async () => { // this is a resend email button
      try {
        await sendEmailVerification(user);
        alert("Verification email resent! Check your inbox.");
      } catch (err) {
        alert("Please wait a moment before resending.");
      }
    };

    return ( // if the email is not verified we push the verification page; dont wan't kids faking neu emails
      <Container maxWidth="sm">
        <Box sx={{ mt: 12, textAlign: 'center' }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom>
              Verify Your Email
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              We sent a verification link to <strong>{user.email}</strong>. Please check your inbox and click the link.
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              After verifying, click the button below.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 2 }}>
              <Button variant="contained" onClick={() => window.location.reload()}>
                I've Verified
              </Button>
              <Button variant="outlined" onClick={logout}>
                Log Out
              </Button>
            </Box>
            <Button onClick={handleResend} sx={{ textTransform: 'none' }}>
              Resend verification email
            </Button>
          </Paper>
        </Box>
      </Container>
    );
  }

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