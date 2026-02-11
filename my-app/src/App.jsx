import './App.css';
import { Routes, Route, Link } from "react-router-dom";
import { sendEmailVerification } from "firebase/auth";
import { useAuth } from "./AuthContext";
import LoginPage from "./LoginPage";
import MapPage from "./MapPage";

function Home() {
  return (
    <div className="home-page">
      <div className="home-inner">
        <h1 style={{ fontSize: "6rem" }}>You're Home!</h1>
        <p style={{ fontSize: "2.5rem" }}>Welcome to the Lost & Hound</p>
      </div>
    </div>
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
      <div style={{ maxWidth: 400, margin: "100px auto", padding: 20, textAlign: "center" }}>
        <h1>Verify Your Email</h1>
        <p>We sent a verification link to <strong>{user.email}</strong>. Please check your inbox and click the link.</p>
        <p>After verifying, click the button below.</p>
        <button onClick={() => window.location.reload()} style={{ padding: "10px 20px", marginTop: 10 }}>
          I've Verified
        </button>
        <button onClick={logout} style={{ padding: "10px 20px", marginTop: 10, marginLeft: 10 }}>
          Log Out
        </button>
        <br />
        <button
          onClick={handleResend}
          style={{ background: "none", border: "none", color: "rgba(255, 255, 255, 0.87)", cursor: "pointer", textDecoration: "underline", marginTop: 15 }}
        >
          Resend verification email
        </button>
      </div>
    );
  }

  return (
    <>
      <nav className="top-nav">
        <Link to="/">Home</Link>
        <Link to="/map">Map</Link>
        <span style={{ marginLeft: "auto" }}>
          {user.email}{" "}
          <button onClick={logout}>Log Out</button>
        </span>
      </nav>
      <div className="page-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/map" element={<MapPage />} />
        </Routes>
      </div>
    </>
  );
}