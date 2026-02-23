import { useState, useEffect, useRef } from "react";
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
// Reusable click‑to‑drop map pin component
import MapPinPicker from "../components/Mappinpicker";

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

        {/* Main listing photo, or a placeholder if missing */}
        {item.image_url
          ? <Box component="img" src={item.image_url} alt={item.title} sx={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 2, mb: 2, border: "1.5px solid #ecdcdc" }} />
          : <Box sx={{ width: "100%", height: 120, background: "#f5f0f0", borderRadius: 2, mb: 2, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px dashed #dac8c8" }}>
              <Typography variant="caption" color="text.disabled" fontWeight={700}>No photo provided</Typography>
            </Box>
        }

        {/* Importance / category / resolved badges */}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
          <Chip label={IMPORTANCE_LABELS[item.importance]} size="small" sx={{ background: IMPORTANCE_COLORS[item.importance] + "22", color: IMPORTANCE_COLORS[item.importance], fontWeight: 800 }} />
          <Chip label={item.category} size="small" sx={{ background: "#f5eded", color: "#A84D48", fontWeight: 700 }} />
          {item.resolved && <Chip label="Resolved" size="small" sx={{ background: "#dcfce7", color: "#16a34a", fontWeight: 800 }} />}
        </Box>

        {/* Location section — shows building text and mini map (if pinned) */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2, background: "#fdf7f7", borderColor: "#ecdcdc", borderRadius: 2 }}>
          <Typography variant="caption" fontWeight={800} color="#a07070" sx={{ letterSpacing: 0.5, display: "block", mb: 0.75 }}>LOCATION</Typography>
          <Typography fontWeight={700} fontSize={14}>{item.locations?.name ?? "Unknown location"}</Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>Found at: {item.found_at}</Typography>

          {/* Show read‑only mini map when the listing has lat/lng */}
          {(item.lat && item.lng) ? (
            <Box sx={{ mt: 1.5 }}>
              <MapPinPicker
                value={{ lat: item.lat, lng: item.lng }}
                height={120}
                interactive={false}
                showCoords={false}
                zoom={17}
                center={{ lat: item.lat, lng: item.lng }}
              />
            </Box>
          ) : (
            <Box sx={{ mt: 1.5, background: "#ede8e8", borderRadius: 1.5, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography variant="caption" color="text.disabled" fontWeight={700}>No exact location pinned</Typography>
            </Box>
          )}
        </Paper>

        {/* Long‑form description of the item */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" fontWeight={800} color="#a07070" sx={{ letterSpacing: 0.5, display: "block", mb: 0.75 }}>DESCRIPTION</Typography>
          <Typography variant="body2" color="text.secondary" lineHeight={1.65}>{item.description}</Typography>
        </Box>

        {/* Claim + future messaging actions */}
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

// --- NewItemModal: Updated with optional map pin picker ---
function NewItemModal({ open, onClose, onAdd }) {
  const { user, profile } = useAuth();
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({
    title: "", category: "Other", location_id: "", found_at: "",
    importance: 2, description: "", image: null, pin: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  // Helper to update one field in the form state
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  // Basic required‑field validation for the submit button
  const valid = form.title.trim() && form.found_at.trim() && form.description.trim() && form.location_id;

  // Load list of campus buildings for the dropdown when modal opens
  useEffect(() => {
    if (!open) return;
    supabase.from("locations").select("location_id, name").then(({ data }) => {
      if (data) setLocations(data);
    });
  }, [open]);

  const handleSubmit = async () => {
    if (!valid) return;
    setSubmitting(true);

    let image_url = null;

    // If the user attached a photo, upload it to Supabase Storage
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

    // If a pin was dropped, persist its coordinates on the listing
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
            <Select value={form.location_id} label="Building" onChange={e => set("location_id", e.target.value)}>
              {locations.map(l => <MenuItem key={l.location_id} value={l.location_id}>{l.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        <TextField label="Found At (specific spot)" value={form.found_at} onChange={e => set("found_at", e.target.value)} placeholder="e.g. Table near window, Room 204" fullWidth sx={{ mb: 2 }} />
        <TextField label="Description" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Color, markings, contents..." multiline rows={3} fullWidth sx={{ mb: 2 }} />

        {/* --- Optional map pin so reporters can mark the exact spot --- */}
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
            {form.pin ? "📍 Pin placed — tap to edit" : "Drop a pin on the map (optional)"}
          </Button>

          {/* Inline map picker that lets the user drop / edit a pin */}
          <Collapse in={showMap}>
            <MapPinPicker
              value={form.pin}
              onChange={(latLng) => set("pin", latLng)}
              height={180}
            />
            {form.pin && (
              <Button
                size="small"
                onClick={() => set("pin", null)}
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
          <Button
            variant="contained" startIcon={<AddIcon />} onClick={() => setShowNew(true)}
            sx={{ background: "#A84D48", "&:hover": { background: "#8f3e3a" }, fontWeight: 900, borderRadius: 2 }}
          >
            Report Item
          </Button>
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