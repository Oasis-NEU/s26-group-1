import { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import { Routes, Route, Link } from "react-router-dom";
import MapPage from "./MapPage";

function Home() {
  return (
    <div className = "home-page">
      <div className= "home-inner">
        <h1 style={{ fontSize: "6rem" }}>You're Home!</h1>
        <p style={{ fontSize: "2.5rem" }}>Welcome to the Lost & Hound</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <nav className="top-nav">
        <Link to="/">Home</Link>
        <Link to="/map">Map</Link>
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
