import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
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
      setError(err.message);
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
      {error && <p style={{ color: "red", marginTop: 10 }}>{error}</p>}
      {message && <p style={{ color: "green", marginTop: 10 }}>{message}</p>}
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