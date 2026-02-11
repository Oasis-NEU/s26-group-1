import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "./firebase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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
    <div style={{ maxWidth: 400, margin: "100px auto", padding: 20 }}>
      <h1>Lost & Hound</h1>
      <h2>{isSignUp ? "Sign Up" : "Log In"}</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <input
            type="email"
            placeholder="you@northeastern.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        <button type="submit" style={{ width: "100%", padding: 10 }}>
          {isSignUp ? "Sign Up" : "Log In"}
        </button>
      </form>

      {!isSignUp && (
        <button
          onClick={handleForgotPassword}
          style={{ background: "none", border: "none", color: "rgba(255, 255, 255, 0.87)", cursor: "pointer", textDecoration: "underline", marginTop: 10 }}
        >
          Forgot password?
        </button>
      )}

      {error && (
        <div style={{
          marginTop: 15,
          padding: "12px 16px",
          backgroundColor: "#fde8e8",
          border: "1px solid #f5c6c6",
          borderRadius: 8,
          color: "#991b1b",
          fontSize: "14px",
          fontWeight: 600,
        }}>
          {error}
        </div>
      )}
      {message && (
        <div style={{
          marginTop: 15,
          padding: "12px 16px",
          backgroundColor: "#e8f5e9",
          border: "1px solid #c8e6c9",
          borderRadius: 8,
          color: "#1b5e20",
          fontSize: "14px",
          fontWeight: 600,
        }}>
          {message}
        </div>
      )}

      <p style={{ marginTop: 20 }}>
        {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
        <button
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError("");
            setMessage("");
          }}
          style={{ background: "none", border: "none", color: "rgba(255, 255, 255, 0.87)", cursor: "pointer", textDecoration: "underline" }}
        >
          {isSignUp ? "Log In" : "Sign Up"}
        </button>
      </p>
    </div>
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