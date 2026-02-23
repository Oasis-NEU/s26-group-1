import { useState, useEffect, useRef, useMemo } from "react";
import {
  Box, Typography, Paper, TextField, Button, Select, MenuItem,
  FormControl, InputLabel, Chip, CircularProgress, Modal, Slider,
  IconButton, InputAdornment, Collapse,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import UploadIcon from "@mui/icons-material/UploadFile";
import MapIcon from "@mui/icons-material/PinDrop";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";
import MapPinPicker from "../components/MapPinPicker";

// --- Constants ---
const CATEGORIES = ["All", "Husky Card", "Jacket", "Wallet/Purse", "Bag", "Keys", "Electronics", "Other"];
const SORT_OPTIONS = ["Newest", "Oldest", "Most Important"];
const IMPORTANCE_LABELS = { 3: "High", 2: "Medium", 1: "Low" };
const IMPORTANCE_COLORS = { 3: "#b91c1c", 2: "#a16207", 1: "#1d4ed8" };
const IMPORTANCE_MARKS = [{ value: 1, label: "Low" }, { value: 2, label: "Medium" }, { value: 3, label: "High" }];

// --- Helpers ---
function formatDate(d) {
  const diff = Math.floor((new Date() - new Date(d)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff} days ago`;
}

/**
 * Parse coordinate strings like "42.3391° N 71.0898° W" into { lat, lng }.
 * Returns null if parsing fails.
 */
function parseCoordinates(coordStr) {
  if (!coordStr || typeof coordStr !== "string") return null;
  // Match patterns like "42.3391° N 71.0898° W" or "42.3391°N 71.0898°W"
  const match = coordStr.match(
    /([\d.]+)°?\s*([NS])\s+([\d.]+)°?\s*([EW])/i
  );
  if (!match) {
    // Try JSON object format { lat, lng }
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

// --- ImageUpload ---
function ImageUpload({ image, onChange }) {
  const inputRef = useRef();
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onChange({ dataUrl: ev.target.result, file });
    reader.readAsDataURL(file);
  };
  return (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 0.75 }}>
        Photo (optional)
      </Typography>
      <Box
        onClick={() => inputRef.current.click()}
        sx={{
          border: `2px dashed ${image ? "#A84D48" : "#ccc"}`,
          borderRadius: 2, p: 2, cursor: "pointer", textAlign: "center",
          background: image ? "#fdf7f7" : "#fafafa",
          transition: "border-color 0.15s",
          "&:hover": { borderColor: "#A84D48" },
        }}
      >
        {image
          ? <img src={image.dataUrl} alt="preview" style={{ maxHeight: 120, maxWidth: "100%", borderRadius: 8, objectFit: "cover" }} />
          : <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, color: "text.disabled" }}>
              <UploadIcon />
              <Typography variant="caption" fontWeight={700}>Click to upload a photo</Typography>
              <Typography variant="caption">JPG, PNG, WEBP</Typography>
            </Box>
        }
      </Box>
      {image && (
        <Button size="small" onClick={() => onChange(null)} sx={{ mt: 0.5, color: "#A84D48", fontSize: 12 }}>
          Remove photo
        </Button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
    </Box>
  );
}

// --- ItemCard ---
function ItemCard({ item, onClick }) {
  return (
    <Paper
      elevation={1}
      onClick={() => onClick(item)}
      sx={{
        display: "flex", gap: 2, p: 2, borderRadius: 3, cursor: "pointer",
        opacity: item.resolved ? 0.65 : 1,
        border: "1.5px solid", borderColor: item.resolved ? "#e8e0e0" : "#ecdcdc",
        transition: "box-shadow 0.15s, transform 0.15s",
        "&:hover": { boxShadow: "0 4px 18px rgba(168,77,72,0.13)", transform: "translateY(-2px)" },
      }}
    >
      <Box sx={{
        width: 72, height: 72, borderRadius: 2, flexShrink: 0, overflow: "hidden",
        background: "#f0eded", border: "1.5px solid #e0d6d6",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {item.image_url
          ? <img src={item.image_url} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <UploadIcon sx={{ color: "#c4a8a7", fontSize: 28 }} />
        }
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography fontWeight={800} fontSize={16}>{item.title}</Typography>
              {item.resolved && <Chip label="Resolved" size="small" sx={{ background: "#dcfce7", color: "#16a34a", fontWeight: 800, fontSize: 11 }} />}
            </Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
              {item.locations?.name ?? "Unknown location"} · {item.found_at}
            </Typography>
            <Typography variant="caption" sx={{ color: "#aaa", fontWeight: 600 }}>
              {item.poster_name} · {formatDate(item.date)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.75, flexShrink: 0 }}>
            <Chip
              label={IMPORTANCE_LABELS[item.importance]}
              size="small"
              sx={{ background: IMPORTANCE_COLORS[item.importance] + "22", color: IMPORTANCE_COLORS[item.importance], fontWeight: 800, fontSize: 11, border: `1px solid ${IMPORTANCE_COLORS[item.importance]}44` }}
            />
            <Chip label={item.category} size="small" sx={{ background: "#f5eded", color: "#a07070", fontWeight: 700, fontSize: 11 }} />
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ mt: 1, lineHeight: 1.5 }}>
          {item.description?.length > 100 ? item.description.slice(0, 100) + "…" : item.description}
        </Typography>
      </Box>
    </Paper>
  );
}

// --- DetailModal ---
function DetailModal({ item, onClose, onClaim }) {
  const [claimed, setClaimed] = useState(false);
  if (!item) return null;

  // Try to get coordinates from item-level lat/lng or from the location
  const pinCoords = (item.lat && item.lng)
    ? { lat: item.lat, lng: item.lng }
    : parseCoordinates(item.locations?.coordinates);

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

        {/* Location section with map */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2, background: "#fdf7f7", borderColor: "#ecdcdc", borderRadius: 2 }}>
          <Typography variant="caption" fontWeight={800} color="#a07070" sx={{ letterSpacing: 0.5, display: "block", mb: 0.75 }}>LOCATION</Typography>
          <Typography fontWeight={700} fontSize={14}>{item.locations?.name ?? "Unknown location"}</Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>Found at: {item.found_at}</Typography>

          {pinCoords ? (
            <Box sx={{ mt: 1.5 }}>
              <MapPinPicker
                value={pinCoords}
                height={120}
                interactive={false}
                showCoords={false}
                zoom={17}
                center={pinCoords}
              />
            </Box>
          ) : (
            <Box sx={{ mt: 1.5, background: "#ede8e8", borderRadius: 1.5, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography variant="caption" color="text.disabled" fontWeight={700}>No exact location pinned</Typography>
            </Box>
          )}
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

// --- NewItemModal: Building auto-places pin, user can drag to adjust ---
function NewItemModal({ open, onClose, onAdd }) {
  const { user, profile } = useAuth();
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({
    title: "", category: "Other", location_id: "", found_at: "",
    importance: 2, description: "", image: null, pin: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [flyTo, setFlyTo] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.title.trim() && form.found_at.trim() && form.description.trim() && form.location_id;

  useEffect(() => {
    if (!open) return;
    supabase.from("locations").select("location_id, name, coordinates").then(({ data }) => {
      if (data) setLocations(data);
    });
  }, [open]);

  // When user selects a building, auto-place pin at its coordinates
  const handleBuildingChange = (location_id) => {
    set("location_id", location_id);
    const loc = locations.find((l) => l.location_id === location_id);
    if (!loc) return;

    const coords = parseCoordinates(loc.coordinates);
    if (coords) {
      set("pin", coords);
      setFlyTo({ ...coords, zoom: 18 });
      // Auto-expand the map if it's collapsed
      if (!showMap) setShowMap(true);
    }
  };

  const handleSubmit = async () => {
    if (!valid) return;
    setSubmitting(true);

    let image_url = null;

    if (form.image?.file) {
      const ext = form.image.file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(path, form.image.file);
      if (!uploadError) {
        const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
        image_url = data.publicUrl;
      }
    }

    const posterName = profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : user.email;

    const insertData = {
      title: form.title,
      category: form.category,
      location_id: form.location_id,
      found_at: form.found_at,
      importance: form.importance,
      description: form.description,
      image_url,
      resolved: false,
      poster_id: user.id,
      poster_name: posterName,
      date: new Date().toISOString(),
    };

    // Include lat/lng if pin was placed
    if (form.pin) {
      insertData.lat = form.pin.lat;
      insertData.lng = form.pin.lng;
    }

    const { data, error } = await supabase
      .from("listings")
      .insert([insertData])
      .select(`*, locations(name, coordinates)`)
      .single();

    setSubmitting(false);
    if (!error && data) {
      onAdd(data);
      onClose();
      setForm({ title: "", category: "Other", location_id: "", found_at: "", importance: 2, description: "", image: null, pin: null });
      setShowMap(false);
      setFlyTo(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        background: "#fff", borderRadius: 4, p: "26px", width: "100%", maxWidth: 520,
        maxHeight: "92vh", overflowY: "auto", outline: "none",
      }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
          <Typography variant="h6" fontWeight={900}>Report Found Item</Typography>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </Box>

        <TextField label="Item Name" value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Blue Husky Card" fullWidth sx={{ mb: 2 }} />

        <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select value={form.category} label="Category" onChange={e => set("category", e.target.value)}>
              {CATEGORIES.filter(c => c !== "All").map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Building</InputLabel>
            <Select value={form.location_id} label="Building" onChange={e => handleBuildingChange(e.target.value)}>
              {locations.map(l => <MenuItem key={l.location_id} value={l.location_id}>{l.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        <TextField label="Found At (specific spot)" value={form.found_at} onChange={e => set("found_at", e.target.value)} placeholder="e.g. Table near window, Room 204" fullWidth sx={{ mb: 2 }} />
        <TextField label="Description" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Color, markings, contents..." multiline rows={3} fullWidth sx={{ mb: 2 }} />

        {/* --- Map pin section --- */}
        <Box sx={{ mb: 2 }}>
          <Button
            size="small"
            startIcon={<MapIcon />}
            onClick={() => setShowMap(!showMap)}
            sx={{
              color: form.pin ? "#16a34a" : "#A84D48",
              fontWeight: 700, mb: 0.75,
              background: form.pin ? "#dcfce722" : "transparent",
            }}
          >
            {form.pin
              ? `📍 Pin placed${form.location_id ? "" : ""} — tap to ${showMap ? "hide" : "edit"}`
              : "Drop a pin on the map (optional)"}
          </Button>

          <Collapse in={showMap}>
            <MapPinPicker
              value={form.pin}
              onChange={(latLng) => set("pin", latLng)}
              height={200}
              flyTo={flyTo}
            />
            {form.pin && (
              <Button
                size="small"
                onClick={() => { set("pin", null); setFlyTo(null); }}
                sx={{ mt: 0.5, color: "#A84D48", fontSize: 12 }}
              >
                Remove pin
              </Button>
            )}
          </Collapse>
        </Box>

        {/* Importance */}
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ display: "block", mb: 1 }}>
            Importance: <span style={{ color: IMPORTANCE_COLORS[form.importance], fontWeight: 900 }}>{IMPORTANCE_LABELS[form.importance]}</span>
          </Typography>
          <Slider
            value={form.importance} min={1} max={3} step={1}
            onChange={(_, v) => set("importance", v)}
            sx={{ color: IMPORTANCE_COLORS[form.importance] }}
            marks={IMPORTANCE_MARKS}
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <ImageUpload image={form.image} onChange={v => set("image", v)} />
        </Box>

        <Button
          variant="contained" fullWidth disabled={!valid || submitting} onClick={handleSubmit}
          sx={{ background: "#A84D48", "&:hover": { background: "#8f3e3a" }, fontWeight: 900, borderRadius: 2, py: 1.5 }}
        >
          {submitting ? <CircularProgress size={20} color="inherit" /> : "Post Listing"}
        </Button>
      </Box>
    </Modal>
  );
}

// --- FeedPage ---
export default function FeedPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("Newest");
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("listings")
        .select(`*, locations(name, coordinates)`)
        .order("date", { ascending: false });
      if (!error) setItems(data ?? []);
      setLoading(false);
    };
    fetchItems();
  }, []);

  const handleClaim = async (item_id) => {
    await supabase.from("listings").update({ resolved: true }).eq("item_id", item_id);
    setItems(prev => prev.map(i => i.item_id === item_id ? { ...i, resolved: true } : i));
    if (selected?.item_id === item_id) setSelected(prev => ({ ...prev, resolved: true }));
  };

  const filtered = items
    .filter(i => category === "All" || i.category === category)
    .filter(i =>
      i.title?.toLowerCase().includes(search.toLowerCase()) ||
      i.locations?.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.description?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === "Newest") return new Date(b.date) - new Date(a.date);
      if (sort === "Oldest") return new Date(a.date) - new Date(b.date);
      if (sort === "Most Important") return b.importance - a.importance;
      return 0;
    });

  return (
    <Box sx={{ display: "flex", justifyContent: "center", width: "100%", p: 3 }}>
      <Box sx={{ width: "100%", maxWidth: 680 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
          <Typography variant="h4" fontWeight={900}>Lost & Found Feed</Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => {
                const btn = document.getElementById("feed-refresh-icon");
                if (btn) btn.style.transform = "rotate(360deg)";
                setLoading(true);
                supabase
                  .from("listings")
                  .select(`*, locations(name, coordinates)`)
                  .order("date", { ascending: false })
                  .then(({ data, error }) => {
                    if (!error) setItems(data ?? []);
                    setLoading(false);
                    setTimeout(() => { if (btn) btn.style.transform = "rotate(0deg)"; }, 600);
                  });
              }}
              sx={{
                borderColor: "#ecdcdc", color: "#A84D48", fontWeight: 800,
                borderRadius: 2, minWidth: 0, px: 1.5, fontSize: 18,
              }}
            >
              <span
                id="feed-refresh-icon"
                style={{ display: "inline-block", transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)" }}
              >
                ↻
              </span>
            </Button>
            <Button
              variant="contained" startIcon={<AddIcon />} onClick={() => setShowNew(true)}
              sx={{ background: "#A84D48", "&:hover": { background: "#8f3e3a" }, fontWeight: 900, borderRadius: 2 }}
            >
              Report Item
            </Button>
          </Box>
        </Box>

        <TextField
          fullWidth placeholder="Search items, locations, descriptions..."
          value={search} onChange={e => setSearch(e.target.value)} sx={{ mb: 2 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: "#a07070" }} /></InputAdornment> }}
        />

        <Box sx={{ display: "flex", gap: 1, overflowX: "auto", pb: 1, mb: 1.5 }}>
          {CATEGORIES.map(c => (
            <Chip key={c} label={c} clickable onClick={() => setCategory(c)} sx={{
              flexShrink: 0, fontWeight: 800,
              background: category === c ? "#A84D48" : "#fff",
              color: category === c ? "#fff" : "#a07070",
              border: `1.5px solid ${category === c ? "#A84D48" : "#e0d8d8"}`,
              "&:hover": { background: category === c ? "#8f3e3a" : "#fdf7f7" },
            }} />
          ))}
        </Box>

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={700}>
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          </Typography>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Sort by</InputLabel>
            <Select value={sort} label="Sort by" onChange={e => setSort(e.target.value)}>
              {SORT_OPTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        {loading
          ? <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}><CircularProgress sx={{ color: "#A84D48" }} /></Box>
          : filtered.length === 0
            ? <Typography textAlign="center" color="text.disabled" fontWeight={700} sx={{ mt: 8 }}>No items found.</Typography>
            : <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {filtered.map(item => <ItemCard key={item.item_id} item={item} onClick={setSelected} />)}
              </Box>
        }
      </Box>

      <DetailModal item={selected} onClose={() => setSelected(null)} onClaim={handleClaim} />
      <NewItemModal open={showNew} onClose={() => setShowNew(false)} onAdd={item => setItems(prev => [item, ...prev])} />
    </Box>
  );
}