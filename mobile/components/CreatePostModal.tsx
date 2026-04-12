import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Image, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as ImagePicker from "expo-image-picker";
import MapView, { Marker } from "react-native-maps";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import apiFetch from "../utils/apiFetch";
import { CAMPUSES } from "../constants/campuses";
import { successHaptic } from "../utils/haptics";
import BottomSheet from "./BottomSheet";
import PickerModal from "./PickerModal";

function parseCoordinates(coords: string | null): { lat: number; lng: number } | null {
  if (!coords) return null;
  // POINT(lng lat)
  const pointMatch = coords.match(/POINT\(([^ ]+) ([^ ]+)\)/);
  if (pointMatch) return { lat: parseFloat(pointMatch[2]), lng: parseFloat(pointMatch[1]) };
  // "42.3393° N 71.0893° W" format
  const degMatch = coords.match(/([\d.]+)°?\s*([NS])\s+([\d.]+)°?\s*([EW])/i);
  if (degMatch) {
    let lat = parseFloat(degMatch[1]);
    let lng = parseFloat(degMatch[3]);
    if (degMatch[2].toUpperCase() === "S") lat = -lat;
    if (degMatch[4].toUpperCase() === "W") lng = -lng;
    return { lat, lng };
  }
  // "lat, lng" format
  const parts = coords.split(",").map((s: string) => parseFloat(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return { lat: parts[0], lng: parts[1] };
  return null;
}

const CATEGORIES = ["Husky Card", "Jacket", "Wallet/Purse", "Bag", "Keys", "Electronics", "Other"];
const IMPORTANCE_LABELS: Record<number, string> = { 1: "Low", 2: "Medium", 3: "High" };
const IMPORTANCE_COLORS: Record<number, string> = { 1: "#1d4ed8", 2: "#a16207", 3: "#b91c1c" };

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: any) => void;
}

export default function CreatePostModal({ visible, onClose, onAdd }: Props) {
  const { profile } = useAuth();
  const { t } = useTheme();
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedCampus, setSelectedCampus] = useState(profile?.default_campus || "boston");
  const [listingType, setListingType] = useState<"found" | "lost">("found");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Other");
  const [locationId, setLocationId] = useState("");
  const [foundAt, setFoundAt] = useState("");
  const [importance, setImportance] = useState(2);
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<{ uri: string; type: string; name: string } | null>(null);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showBuildings, setShowBuildings] = useState(false);
  const [showPinMap, setShowPinMap] = useState(false);
  const [mapTouching, setMapTouching] = useState(false);

  const selectedBuilding = locations.find((l) => l.location_id === locationId);
  const valid = title.trim() && foundAt.trim() && description.trim() && locationId;

  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        const data = await apiFetch(`/api/locations?campus=${selectedCampus}`);
        setLocations(data || []);
      } catch (err) {
        console.error("Fetch locations error:", err);
      }
    })();
  }, [visible, selectedCampus]);

  const resetForm = () => {
    setTitle(""); setCategory("Other"); setLocationId(""); setFoundAt("");
    setImportance(2); setDescription(""); setImage(null); setPin(null);
    setListingType("found"); setSelectedCampus(profile?.default_campus || "boston");
    setShowBuildings(false); setShowPinMap(false);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImage({
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        name: asset.fileName || `photo-${Date.now()}.jpg`,
      });
    }
  };

  const handleSubmit = async () => {
    if (!valid) return;
    setSubmitting(true);

    let image_url = null;

    if (image) {
      try {
        // Get signed upload URL
        const uploadData = await apiFetch("/api/upload-url", {
          method: "POST",
          body: JSON.stringify({
            filename: image.name,
            contentType: image.type,
            fileSize: 0, // Size check happens server-side
          }),
        });

        // Upload the image
        const response = await fetch(image.uri);
        const blob = await response.blob();
        const uploadRes = await fetch(uploadData.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": image.type },
          body: blob,
        });

        if (uploadRes.ok) {
          const verify = await apiFetch("/api/verify-image", {
            method: "POST",
            body: JSON.stringify({ path: uploadData.path }),
          });
          if (verify?.valid) image_url = uploadData.publicUrl;
        }
      } catch (err) {
        console.error("Image upload error:", err);
      }
    }

    try {
      const data = await apiFetch("/api/listings", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          category,
          location_id: locationId,
          found_at: foundAt.trim(),
          importance,
          description: description.trim(),
          image_url,
          listing_type: listingType,
          lat: pin?.lat ?? null,
          lng: pin?.lng ?? null,
        }),
      });

      successHaptic();
      onAdd(data);
      onClose();
      resetForm();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create listing.");
    }
    setSubmitting(false);
  };

  return (
    <>
      <BottomSheet visible={visible} onClose={() => { onClose(); resetForm(); }} heightFraction={0.92}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!mapTouching}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-xl font-black text-ink dark:text-ink-dk">
              {listingType === "found" ? "Report Found Item" : "Report Lost Item"}
            </Text>
            <TouchableOpacity
              onPress={() => { onClose(); resetForm(); }}
              hitSlop={8}
              className="w-8 h-8 rounded-full bg-separator dark:bg-separator-dk items-center justify-center"
            >
              <Ionicons name="close" size={18} color={t.muted} />
            </TouchableOpacity>
          </View>

          {/* Found / Lost toggle */}
          <View className="flex-row bg-separator dark:bg-separator-dk rounded-xl p-1 mb-4">
            {(["found", "lost"] as const).map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setListingType(type)}
                className={`flex-1 py-2.5 rounded-lg items-center ${listingType === type ? "bg-primary dark:bg-primary-dk" : ""}`}
              >
                <Text className={`text-sm font-bold ${listingType === type ? "text-white" : "text-subtext dark:text-subtext-dk"}`}>
                  {type === "found" ? "I Found Something" : "I Lost Something"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Title */}
          <View className="mb-4">
            <Text className="text-xs font-bold text-subtext dark:text-subtext-dk uppercase tracking-wide mb-1.5">Item Name</Text>
            <TextInput
              className="bg-input-bg dark:bg-input-bg-dk border border-input-border dark:border-input-border-dk rounded-xl px-4 py-3.5 text-sm text-ink dark:text-ink-dk"
              value={title}
              onChangeText={(txt) => setTitle(txt.slice(0, 50))}
              placeholder="e.g. Black North Face Jacket"
              placeholderTextColor={t.muted}
              maxLength={50}
            />
            <Text style={{ color: t.muted, fontSize: 11, textAlign: "right", marginTop: 2 }}>{title.length}/50</Text>
          </View>

          {/* Campus */}
          <View className="mb-4">
            <Text className="text-xs font-bold text-subtext dark:text-subtext-dk uppercase tracking-wide mb-1.5">Campus</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 4 }}>
              {CAMPUSES.map((c: any) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => { setSelectedCampus(c.id); setLocationId(""); setPin(null); }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    borderWidth: 1,
                    backgroundColor: selectedCampus === c.id ? t.accent : t.inputBg,
                    borderColor: selectedCampus === c.id ? t.accent : t.inputBorder,
                  }}
                >
                  <Text style={{ color: selectedCampus === c.id ? "#fff" : t.subtext, fontWeight: "700", fontSize: 12 }}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Category + Building */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text className="text-xs font-bold text-subtext dark:text-subtext-dk uppercase tracking-wide mb-1.5">Category</Text>
              <TouchableOpacity
                className="bg-input-bg dark:bg-input-bg-dk border border-input-border dark:border-input-border-dk rounded-xl px-4 py-3.5 flex-row items-center justify-between"
                onPress={() => {
                  Alert.alert("Category", undefined, CATEGORIES.map((c) => ({
                    text: c, onPress: () => setCategory(c),
                  })));
                }}
              >
                <Text style={{ color: t.text, fontSize: 14 }}>{category}</Text>
                <Ionicons name="chevron-down" size={16} color={t.muted} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text className="text-xs font-bold text-subtext dark:text-subtext-dk uppercase tracking-wide mb-1.5">Building</Text>
              <TouchableOpacity
                className="bg-input-bg dark:bg-input-bg-dk border border-input-border dark:border-input-border-dk rounded-xl px-4 py-3.5 flex-row items-center justify-between"
                onPress={() => setShowBuildings(true)}
              >
                <Text style={{ color: selectedBuilding ? t.text : t.muted, fontSize: 14 }} numberOfLines={1}>
                  {selectedBuilding?.name || "Select..."}
                </Text>
                <Ionicons name="chevron-down" size={16} color={t.muted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Pin map toggle / Pin map */}
          {!showPinMap ? (
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                borderRadius: 12,
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: t.inputBorder,
                padding: 14,
                marginBottom: 16,
              }}
              onPress={() => setShowPinMap(true)}
            >
              <Ionicons name="map-outline" size={18} color={t.muted} />
              <Text style={{ color: t.muted, fontWeight: "600", fontSize: 13 }}>Drop a pin on the map (optional)</Text>
            </TouchableOpacity>
          ) : (() => {
            const campus = CAMPUSES.find((c: any) => c.id === selectedCampus) || CAMPUSES[0];
            const mapCenter = pin || { lat: campus.center.lat, lng: campus.center.lng };
            return (
              <View
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: t.inputBorder,
                  marginBottom: 16,
                }}
                onTouchStart={() => setMapTouching(true)}
                onTouchEnd={() => setMapTouching(false)}
                onTouchCancel={() => setMapTouching(false)}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, paddingTop: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: t.subtext }}>
                    {pin ? "Hold and drag pin to adjust" : "Tap map to place pin"}
                  </Text>
                  <TouchableOpacity onPress={() => { setShowPinMap(false); setPin(null); }}>
                    <Ionicons name="close" size={18} color={t.muted} />
                  </TouchableOpacity>
                </View>
                <MapView
                  key={`${mapCenter.lat}-${mapCenter.lng}`}
                  style={{ width: "100%", height: 200 }}
                  initialRegion={{
                    latitude: mapCenter.lat,
                    longitude: mapCenter.lng,
                    latitudeDelta: 0.003,
                    longitudeDelta: 0.003,
                  }}
                  scrollEnabled={true}
                  zoomEnabled={true}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  onPress={(e) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    setPin({ lat: latitude, lng: longitude });
                  }}
                >
                  {pin && (
                    <Marker
                      coordinate={{ latitude: pin.lat, longitude: pin.lng }}
                      draggable
                      onDragEnd={(e) => setPin({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}
                      pinColor={t.accent}
                    />
                  )}
                </MapView>
              </View>
            );
          })()}

          {/* Specific Location */}
          <View className="mb-4">
            <Text className="text-xs font-bold text-subtext dark:text-subtext-dk uppercase tracking-wide mb-1.5">Specific Location</Text>
            <TextInput
              className="bg-input-bg dark:bg-input-bg-dk border border-input-border dark:border-input-border-dk rounded-xl px-4 py-3.5 text-sm text-ink dark:text-ink-dk"
              value={foundAt}
              onChangeText={(txt) => setFoundAt(txt.slice(0, 50))}
              placeholder="e.g. Second floor study area"
              placeholderTextColor={t.muted}
              maxLength={50}
            />
            <Text style={{ color: t.muted, fontSize: 11, textAlign: "right", marginTop: 2 }}>{foundAt.length}/50</Text>
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text className="text-xs font-bold text-subtext dark:text-subtext-dk uppercase tracking-wide mb-1.5">Description</Text>
            <TextInput
              className="bg-input-bg dark:bg-input-bg-dk border border-input-border dark:border-input-border-dk rounded-xl px-4 py-3.5 text-sm text-ink dark:text-ink-dk"
              style={{ minHeight: 80, textAlignVertical: "top" }}
              value={description}
              onChangeText={(txt) => setDescription(txt.slice(0, 250))}
              placeholder="Describe the item..."
              placeholderTextColor={t.muted}
              multiline
              maxLength={250}
            />
            <Text style={{ color: t.muted, fontSize: 11, textAlign: "right", marginTop: 2 }}>{description.length}/250</Text>
          </View>

          {/* Importance */}
          <View className="mb-4">
            <Text style={{ color: t.subtext, fontWeight: "700", fontSize: 13, marginBottom: 4 }}>
              Importance:{" "}
              <Text style={{ color: IMPORTANCE_COLORS[importance], fontWeight: "800" }}>{IMPORTANCE_LABELS[importance]}</Text>
            </Text>
            <Slider
              style={{ width: "100%", height: 30 }}
              minimumValue={1}
              maximumValue={3}
              step={1}
              value={importance}
              onValueChange={(v: number) => setImportance(v)}
              minimumTrackTintColor={IMPORTANCE_COLORS[importance]}
              maximumTrackTintColor={t.inputBorder}
              thumbTintColor={IMPORTANCE_COLORS[importance]}
            />
          </View>

          {/* Image */}
          <View className="mb-4">
            <Text className="text-xs font-bold text-subtext dark:text-subtext-dk uppercase tracking-wide mb-1.5">Photo (optional)</Text>
            {image ? (
              <View style={{ position: "relative" }}>
                <Image source={{ uri: image.uri }} style={{ width: "100%", height: 180, borderRadius: 12 }} />
                <TouchableOpacity
                  onPress={() => setImage(null)}
                  style={{ position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 12 }}
                >
                  <Ionicons name="close-circle" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={{
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderStyle: "dashed",
                  borderColor: t.inputBorder,
                  padding: 20,
                  alignItems: "center",
                  gap: 6,
                }}
                onPress={pickImage}
              >
                <Ionicons name="camera-outline" size={24} color={t.muted} />
                <Text style={{ color: t.muted, fontWeight: "600", fontSize: 13 }}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity
            className={`bg-primary dark:bg-primary-dk rounded-xl p-4 items-center mt-2 ${submitting || !valid ? "opacity-60" : ""}`}
            onPress={handleSubmit}
            disabled={!valid || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">
                {listingType === "found" ? "Report Found Item" : "Report Lost Item"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>

      {/* Building picker — PickerModal is a sibling BottomSheet, avoids nested Modal */}
      <PickerModal
        visible={showBuildings}
        onClose={() => setShowBuildings(false)}
        title="Select Building"
        options={locations.map((loc) => ({ value: loc.location_id, label: loc.name }))}
        selected={locationId}
        onSelect={(value) => {
          setLocationId(value);
          const loc = locations.find((l) => l.location_id === value);
          if (loc) {
            console.log("[CreatePost] Raw coordinates:", JSON.stringify(loc.coordinates), typeof loc.coordinates);
            const coords = parseCoordinates(loc.coordinates);
            console.log("[CreatePost] Parsed:", coords);
            if (coords) {
              setPin(coords);
              setShowPinMap(true);
            } else {
              console.warn("[CreatePost] Failed to parse coordinates");
            }
          }
        }}
      />
    </>
  );
}
