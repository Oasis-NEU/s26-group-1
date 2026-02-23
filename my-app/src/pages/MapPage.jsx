import { useEffect, useRef, useState, useCallback } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import {
  Box, Typography, Paper, Slider, Chip, IconButton, CircularProgress,
  Collapse, Button, Modal,
} from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import CloseIcon from "@mui/icons-material/Close";
import ListIcon from "@mui/icons-material/ViewList";
import { supabase } from "../supabaseClient";

setOptions({
  key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  v: "weekly",
});

// --- Constants ---
const CAMPUS_CENTER = { lat: 42.3398, lng: -71.0892 };
const IMPORTANCE_LABELS = { 3: "High", 2: "Medium", 1: "Low" };
const IMPORTANCE_COLORS = { 3: "#b91c1c", 2: "#a16207", 1: "#1d4ed8" };
const RADIUS_MARKS = [
  { value: 50, label: "50ft" },
  { value: 150, label: "150ft" },
  { value: 300, label: "300ft" },
  { value: 500, label: "500ft" },
];

/**
 * Parse coordinate strings like "42.3391° N 71.0898° W" into { lat, lng }.
 */
function parseCoordinates(coordStr) {
  if (!coordStr || typeof coordStr !== "string") return null;
  const match = coordStr.match(/([\d.]+)°?\s*([NS])\s+([\d.]+)°?\s*([EW])/i);
  if (!match) {
    try {
      const obj = typeof coordStr === "string" ? JSON.parse(coordStr) : coordStr;
      if (obj.lat != null && obj.lng != null) return { lat: Number(obj.lat), lng: Number(obj.lng) };
    } catch { /* ignore */ }
    return null;
  }
  let lat = parseFloat(match[1]);
  let lng = parseFloat(match[3]);
  if (match[2].toUpperCase() === "S") lat = -lat;
  if (match[4].toUpperCase() === "W") lng = -lng;
  return { lat, lng };
}

/** Haversine distance in feet */
function haversine(a, b) {
  const R = 20902231; // Earth radius in feet
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatDate(d) {
  const diff = Math.floor((new Date() - new Date(d)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff}d ago`;
}

// --- DetailModal: Full listing detail view (same as FeedPage) ---
function DetailModal({ item, onClose, onClaim }) {
  const [claimed, setClaimed] = useState(false);
  if (!item) return null;
  return (
    <Modal open={!!item} onClose={onClose}>
      <Box sx={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        background: "#fff", borderRadius: 4, p: "26px", width: "100%", maxWidth: 520,
        maxHeight: "90vh", overflowY: "auto", outline: "none",
      }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={900}>{item.title}</Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Posted by {item.poster_name} · {formatDate(item.date)}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </Box>

        {item.image_url
          ? <Box component="img" src={item.image_url} alt={item.title} sx={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 2, mb: 2, border: "1.5px solid #ecdcdc" }} />
          : <Box sx={{ width: "100%", height: 120, background: "#f5f0f0", borderRadius: 2, mb: 2, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px dashed #dac8c8" }}>
              <Typography variant="caption" color="text.disabled" fontWeight={700}>No photo provided</Typography>
            </Box>
        }

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
          <Chip label={IMPORTANCE_LABELS[item.importance]} size="small" sx={{ background: IMPORTANCE_COLORS[item.importance] + "22", color: IMPORTANCE_COLORS[item.importance], fontWeight: 800 }} />
          <Chip label={item.category} size="small" sx={{ background: "#f5eded", color: "#A84D48", fontWeight: 700 }} />
          {item.resolved && <Chip label="Resolved" size="small" sx={{ background: "#dcfce7", color: "#16a34a", fontWeight: 800 }} />}
        </Box>

        <Paper variant="outlined" sx={{ p: 2, mb: 2, background: "#fdf7f7", borderColor: "#ecdcdc", borderRadius: 2 }}>
          <Typography variant="caption" fontWeight={800} color="#a07070" sx={{ letterSpacing: 0.5, display: "block", mb: 0.75 }}>LOCATION</Typography>
          <Typography fontWeight={700} fontSize={14}>{item.locations?.name ?? "Unknown location"}</Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>Found at: {item.found_at}</Typography>
        </Paper>

        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" fontWeight={800} color="#a07070" sx={{ letterSpacing: 0.5, display: "block", mb: 0.75 }}>DESCRIPTION</Typography>
          <Typography variant="body2" color="text.secondary" lineHeight={1.65}>{item.description}</Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button
            variant="contained"
            fullWidth
            disabled={item.resolved}
            onClick={async () => {
              setClaimed(true);
              await onClaim(item.item_id);
            }}
            sx={{ background: claimed ? "#16a34a" : "#A84D48", "&:hover": { background: claimed ? "#15803d" : "#8f3e3a" }, fontWeight: 800, borderRadius: 2 }}
          >
            {item.resolved ? "Already Resolved" : claimed ? "Marked as Found!" : "This is Mine!"}
          </Button>
          <Button variant="outlined" sx={{ borderColor: "#ecdcdc", color: "#A84D48", fontWeight: 800, borderRadius: 2, flexShrink: 0 }}>
            Message
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

// --- MapPage ---
export default function MapPage() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const searchPinRef = useRef(null);
  const circleRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchPin, setSearchPin] = useState(null);        // { lat, lng }
  const [radius, setRadius] = useState(150);               // feet
  const [nearbyItems, setNearbyItems] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // ---- Fetch all listings with coordinates ----
  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("listings")
      .select("*, locations(name, coordinates)")
      .order("date", { ascending: false });

    if (!error && data) {
      const normalized = data.map((item) => {
        let lat = item.lat;
        let lng = item.lng;
        if (lat == null && item.locations?.coordinates) {
          const parsed = parseCoordinates(item.locations.coordinates);
          if (parsed) { lat = parsed.lat; lng = parsed.lng; }
        }
        return { ...item, _lat: lat, _lng: lng };
      });
      setItems(normalized);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchItems();
    // Reset map to campus center
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo(CAMPUS_CENTER);
      mapInstanceRef.current.setZoom(17);
    }
    clearSearch();
    setTimeout(() => setRefreshing(false), 600);
  };

  // ---- Claim handler ----
  const handleClaim = async (item_id) => {
    await supabase.from("listings").update({ resolved: true }).eq("item_id", item_id);
    setItems(prev => prev.map(i => i.item_id === item_id ? { ...i, resolved: true } : i));
    if (selectedItem?.item_id === item_id) setSelectedItem(prev => ({ ...prev, resolved: true }));
  };

  // ---- Initialize Google Map ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { Map } = await importLibrary("maps");
      await importLibrary("marker");
      if (cancelled || !mapRef.current) return;

      const map = new Map(mapRef.current, {
        center: CAMPUS_CENTER,
        zoom: 16,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "greedy",
        mapId: "LOST_HOUND_MAP",
        clickableIcons: false,
      });

      mapInstanceRef.current = map;

      // Click to place search pin
      map.addListener("click", (e) => {
        const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        setSearchPin(pos);
        setShowPanel(true);
      });
    })();

    return () => { cancelled = true; };
  }, []);

  // ---- Place / move the search pin + radius circle ----
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    (async () => {
      const { AdvancedMarkerElement } = await importLibrary("marker");

      if (!searchPin) {
        if (searchPinRef.current) { searchPinRef.current.map = null; searchPinRef.current = null; }
        if (circleRef.current) { circleRef.current.setMap(null); circleRef.current = null; }
        return;
      }

      // Search pin marker (red)
      if (searchPinRef.current) {
        searchPinRef.current.position = searchPin;
      } else {
        const pinEl = document.createElement("div");
        pinEl.innerHTML = `<svg width="32" height="42" viewBox="0 0 32 42" fill="none"><path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26s16-14 16-26C32 7.16 24.84 0 16 0z" fill="#A84D48"/><circle cx="16" cy="16" r="7" fill="#fff"/></svg>`;
        const marker = new AdvancedMarkerElement({
          map,
          position: searchPin,
          gmpDraggable: true,
          content: pinEl,
          zIndex: 999,
        });
        marker.addListener("dragend", () => {
          const p = marker.position;
          setSearchPin({ lat: p.lat, lng: p.lng });
        });
        searchPinRef.current = marker;
      }

      // Radius circle
      const radiusMeters = radius * 0.3048; // feet to meters
      if (circleRef.current) {
        circleRef.current.setCenter(searchPin);
        circleRef.current.setRadius(radiusMeters);
      } else {
        const { Circle } = await importLibrary("maps");

        // google.maps.Circle may already be available via the maps library
        const circle = new google.maps.Circle({
          map,
          center: searchPin,
          radius: radiusMeters,
          fillColor: "#A84D48",
          fillOpacity: 0.10,
          strokeColor: "#A84D48",
          strokeOpacity: 0.45,
          strokeWeight: 2,
        });
        circleRef.current = circle;
      }
    })();
  }, [searchPin, radius]);

  // ---- Render item markers (only after search pin is placed) ----
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    // Don't show any item markers until the user places a search pin
    if (!searchPin) return;

    (async () => {
      const { AdvancedMarkerElement } = await importLibrary("marker");

      // Only show items that are within the radius
      nearbyItems.forEach((item, index) => {
        if (item._lat == null || item._lng == null) return;
        const color = item.resolved ? "#94a3b8" : (IMPORTANCE_COLORS[item.importance] || "#666");

        const el = document.createElement("div");
        el.style.transition = "opacity 0.3s";
        el.style.cursor = "pointer";
        // Drop-bounce animation staggered by index
        el.style.animation = `markerDrop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.05}s both`;
        el.innerHTML = `<svg width="24" height="32" viewBox="0 0 24 32" fill="none"><path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20C24 5.37 18.63 0 12 0z" fill="${color}"/><circle cx="12" cy="12" r="5" fill="#fff" opacity="0.9"/></svg>`;

        // Inject keyframes if not already present
        if (!document.getElementById("marker-drop-style")) {
          const style = document.createElement("style");
          style.id = "marker-drop-style";
          style.textContent = `
            @keyframes markerDrop {
              0% { opacity: 0; transform: translateY(-20px) scale(0.6); }
              60% { opacity: 1; transform: translateY(2px) scale(1.05); }
              80% { transform: translateY(-1px) scale(0.98); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
          `;
          document.head.appendChild(style);
        }

        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: item._lat, lng: item._lng },
          content: el,
        });

        // Click marker → zoom in and open detail modal
        marker.addListener("click", () => {
          if (mapInstanceRef.current && item._lat && item._lng) {
            mapInstanceRef.current.panTo({ lat: item._lat, lng: item._lng });
            mapInstanceRef.current.setZoom(18);
          }
          setSelectedItem(item);
        });

        markersRef.current.push(marker);
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchPin, nearbyItems]);

  // ---- Filter nearby items when pin or radius changes ----
  useEffect(() => {
    if (!searchPin) {
      setNearbyItems([]);
      return;
    }
    const nearby = items.filter((i) => {
      if (i._lat == null || i._lng == null) return false;
      return haversine(searchPin, { lat: i._lat, lng: i._lng }) <= radius;
    });
    setNearbyItems(nearby);
  }, [searchPin, radius, items]);

  // ---- Clear search pin ----
  const clearSearch = () => {
    setSearchPin(null);
    setShowPanel(false);
    setNearbyItems([]);
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "center", width: "100%", p: 3 }}>
      <Box sx={{ width: "100%", maxWidth: 1200 }}>
        {/* Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h4" fontWeight={900}>
            Campus Map
          </Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            {searchPin && (
              <Button
                size="small"
                onClick={clearSearch}
                startIcon={<CloseIcon />}
                sx={{ color: "#A84D48", fontWeight: 700 }}
              >
                Clear Pin
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={handleRefresh}
              disabled={refreshing}
              sx={{
                borderColor: "#ecdcdc", color: "#A84D48", fontWeight: 800,
                borderRadius: 2, minWidth: 0, px: 1.5, fontSize: 18,
                "& .refresh-icon": {
                  display: "inline-block",
                  transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)",
                  transform: refreshing ? "rotate(360deg)" : "rotate(0deg)",
                },
              }}
            >
              <span className="refresh-icon">↻</span>
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 2.5, flexDirection: { xs: "column", md: "row" } }}>
          {/* Map */}
          <Paper
            elevation={3}
            sx={{
              flex: 1,
              height: { xs: "50vh", md: "calc(100vh - 200px)" },
              minHeight: 400,
              overflow: "hidden",
              borderRadius: 3,
              position: "relative",
            }}
          >
            {loading && (
              <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 10 }}>
                <CircularProgress sx={{ color: "#A84D48" }} />
              </Box>
            )}
            <Box ref={mapRef} sx={{ width: "100%", height: "100%" }} />

            {/* Instruction overlay */}
            {!searchPin && !loading && (
              <Paper
                elevation={0}
                sx={{
                  position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
                  display: "flex", alignItems: "center", gap: 1,
                  px: 2.5, py: 1.25, borderRadius: 99,
                  background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)",
                  border: "1.5px solid #ecdcdc",
                }}
              >
                <MyLocationIcon sx={{ color: "#A84D48", fontSize: 18 }} />
                <Typography variant="body2" fontWeight={700} color="text.secondary">
                  Tap the map to search for nearby lost items
                </Typography>
              </Paper>
            )}
          </Paper>

          {/* Side panel — radius controls + nearby list */}
          <Collapse in={showPanel && !!searchPin} orientation="horizontal" sx={{ minWidth: showPanel ? 320 : 0 }}>
            <Paper
              elevation={2}
              sx={{
                width: 320, p: 2.5, borderRadius: 3,
                height: { xs: "auto", md: "calc(100vh - 200px)" },
                overflowY: "auto",
                border: "1.5px solid #ecdcdc",
              }}
            >
              {/* Radius slider */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <FilterAltIcon sx={{ color: "#A84D48", fontSize: 20 }} />
                <Typography fontWeight={800} fontSize={15}>
                  Search Radius
                </Typography>
              </Box>
              <Slider
                value={radius}
                min={25}
                max={500}
                step={25}
                onChange={(_, v) => setRadius(v)}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${v} ft`}
                marks={RADIUS_MARKS}
                sx={{ color: "#A84D48", mb: 2 }}
              />

              {/* Nearby items */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                <ListIcon sx={{ color: "#a07070", fontSize: 18 }} />
                <Typography variant="body2" fontWeight={800} color="text.secondary">
                  {nearbyItems.length} item{nearbyItems.length !== 1 ? "s" : ""} within {radius} ft
                </Typography>
              </Box>

              {nearbyItems.length === 0 ? (
                <Typography variant="body2" color="text.disabled" fontWeight={600} sx={{ textAlign: "center", mt: 4 }}>
                  No lost items in this area. Try a larger radius.
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {nearbyItems.map((item) => (
                    <Paper
                      key={item.item_id}
                      variant="outlined"
                      sx={{
                        p: 1.5, borderRadius: 2, borderColor: "#ecdcdc",
                        cursor: "pointer", transition: "box-shadow 0.15s",
                        opacity: item.resolved ? 0.6 : 1,
                        "&:hover": { boxShadow: "0 2px 12px rgba(168,77,72,0.12)" },
                      }}
                      onClick={() => {
                        // Pan + zoom to item, then open detail modal
                        if (mapInstanceRef.current && item._lat && item._lng) {
                          mapInstanceRef.current.panTo({ lat: item._lat, lng: item._lng });
                          mapInstanceRef.current.setZoom(20);
                        }
                        setSelectedItem(item);
                      }}
                    >
                      <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                        {/* Thumbnail */}
                        <Box sx={{
                          width: 44, height: 44, borderRadius: 1.5, flexShrink: 0,
                          overflow: "hidden", background: "#f0eded",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          border: "1px solid #e0d6d6",
                        }}>
                          {item.image_url
                            ? <img src={item.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <Typography variant="caption" sx={{ color: "#ccc", fontSize: 18 }}>📦</Typography>
                          }
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontWeight={800} fontSize={13} noWrap>{item.title}</Typography>
                          <Typography variant="caption" color="text.secondary" fontWeight={600} noWrap>
                            {item.locations?.name ?? "Unknown"} · {formatDate(item.date)}
                          </Typography>
                        </Box>
                        <Chip
                          label={IMPORTANCE_LABELS[item.importance]}
                          size="small"
                          sx={{
                            background: IMPORTANCE_COLORS[item.importance] + "22",
                            color: IMPORTANCE_COLORS[item.importance],
                            fontWeight: 800, fontSize: 10, flexShrink: 0,
                          }}
                        />
                      </Box>
                    </Paper>
                  ))}
                </Box>
              )}
            </Paper>
          </Collapse>
        </Box>
      </Box>

      {/* Detail modal — opens on marker click or sidebar item click */}
      <DetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onClaim={handleClaim}
      />
    </Box>
  );
}