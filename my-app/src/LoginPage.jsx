import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "./firebase";
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
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Avatar from "@mui/material/Avatar";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const theme = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.endsWith("@northeastern.edu")) {
      setError("You must use a @northeastern.edu email address.");
      return;
    }

    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(result.user);
        setMessage("Account created! Check your Northeastern email for a verification link.");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(cleanErrorMessage(err.code));
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setMessage("");
    if (!email) {
      setError("Enter your email above first.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent! Check your inbox.");
    } catch (err) {
      setError(cleanErrorMessage(err.code));
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        //background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 45%, ${theme.palette.primary.dark} 100%)`,
        //background: `radial-gradient(circle at center, ${theme.palette.primary.light} 20%, ${theme.palette.primary.main} 80%, ${theme.palette.primary.dark} 100%)`,
        //background: `radial-gradient(circle at center, #f44336 20%, #1b1b22 80%, #2a1f24 100%)`,
        //background: "linear-gradient(135deg, #0f0f14 0%, #1b1b22 40%, #2a1f24 100%)",
        background: "linear-gradient(135deg, #f44336 0%, #913c36 40%, #2a1f24 100%)",
        //background: `radial-gradient(circle at center, #a03d35 20%, #622e2b 80%, #2a1f24 100%)`,
        px: 2,
      }}
    >
      <Container component="main" maxWidth="xs">
        <Paper
          elevation={6}
          sx={{
            p: 4,
            width: "100%",
            borderRadius: 3,
            backgroundColor: "rgba(255,255,255,0.95)",
            boxShadow: "0px 10px 30px rgba(0,0,0,0.15)",
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 2 }}>
            <Avatar sx={{ m: 1, bgcolor: "primary.main" }}>
              <LockOutlinedIcon />
            </Avatar>
            <Typography component="h1" variant="h4" gutterBottom>
              Lost & Hound
            </Typography>
            <Typography component="h2" variant="h5">
              {isSignUp ? "Sign Up" : "Log In"}
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              placeholder="you@northeastern.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              inputProps={{ minLength: 6 }}
            />
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
              {isSignUp ? "Sign Up" : "Log In"}
            </Button>
          </Box>

          {!isSignUp && (
            <Box sx={{ textAlign: "center" }}>
              <MuiLink
                component="button"
                variant="body2"
                onClick={handleForgotPassword}
                sx={{ cursor: "pointer" }}
              >
                Forgot password?
              </MuiLink>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          {message && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {message}
            </Alert>
          )}

          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Typography variant="body2" component="span">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            </Typography>
            <MuiLink
              component="button"
              variant="body2"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
                setMessage("");
              }}
              sx={{ cursor: "pointer" }}
            >
              {isSignUp ? "Log In" : "Sign Up"}
            </MuiLink>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

function cleanErrorMessage(errorCode) {
  switch (errorCode) {
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    default:
      return "Something went wrong. Please try again.";
  }
}
