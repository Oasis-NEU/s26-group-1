import { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import { Routes, Route, Link } from "react-router-dom";
import MapPage from "./MapPage";

function Home() {
  return (
    <div style={{ padding: "150px" }}>
      <h1>Home</h1>
      <p>Welcome to Lost & Hound!</p>
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
