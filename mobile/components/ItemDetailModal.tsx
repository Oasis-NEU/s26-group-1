import {
  View, Text, TouchableOpacity, ScrollView,
  Image, Alert,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useTimezone } from "../contexts/TimezoneContext";
import apiFetch from "../utils/apiFetch";
import { formatRelativeDate } from "../utils/timezone";
import { tapHaptic } from "../utils/haptics";
import BottomSheet from "./BottomSheet";

const IMPORTANCE_LABELS: Record<number, string> = { 3: "High", 2: "Medium", 1: "Low" };
const IMPORTANCE_COLORS: Record<number, string> = { 3: "#b91c1c", 2: "#a16207", 1: "#1d4ed8" };
const LISTING_TYPE_LABELS: Record<string, string> = { found: "Found", lost: "Lost" };
const LISTING_TYPE_COLORS: Record<string, string> = { found: "#0891b2", lost: "#4f46e5" };

function parseCoordinates(coords: string | null): { lat: number; lng: number } | null {
  if (!coords) return null;
  const pointMatch = coords.match(/POINT\(([^ ]+) ([^ ]+)\)/);
  if (pointMatch) return { lat: parseFloat(pointMatch[2]), lng: parseFloat(pointMatch[1]) };
  const degMatch = coords.match(/([\d.]+)°?\s*([NS])\s+([\d.]+)°?\s*([EW])/i);
  if (degMatch) {
    let lat = parseFloat(degMatch[1]);
    let lng = parseFloat(degMatch[3]);
    if (degMatch[2].toUpperCase() === "S") lat = -lat;
    if (degMatch[4].toUpperCase() === "W") lng = -lng;
    return { lat, lng };
  }
  const parts = coords.split(",").map((s: string) => parseFloat(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return { lat: parts[0], lng: parts[1] };
  return null;
}

function getItemCoords(item: any): { lat: number; lng: number } | null {
  if (item?._lat != null && item?._lng != null) return { lat: item._lat, lng: item._lng };
  if (item?.lat != null && item?.lng != null) return { lat: item.lat, lng: item.lng };
  if (item?.locations?.coordinates) return parseCoordinates(item.locations.coordinates);
  return null;
}

interface Props {
  item: any | null;
  onClose: () => void;
  onClaim?: (item_id: string) => void;
  onReport?: (item: any) => void;
}

export default function ItemDetailModal({ item, onClose, onClaim, onReport }: Props) {
  const { user } = useAuth();
  const { t } = useTheme();
  const { timezone } = useTimezone();
  const router = useRouter();

  const coords = item ? getItemCoords(item) : null;
  const isOwner = user?.id && item?.poster_id === user.id;

  const handleMessage = async () => {
    tapHaptic();
    try {
      const result = await apiFetch("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ listing_id: item.item_id, other_user_id: item.poster_id }),
      });
      onClose();
      router.push({ pathname: "/(tabs)/messages", params: { conversationId: result.id } });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to start conversation.");
    }
  };

  return (
    <BottomSheet visible={!!item} onClose={onClose} heightFraction={0.88}>
      {/* Image hero */}
      {item?.image_url ? (
        <Image
          source={{ uri: item.image_url }}
          style={{ width: "100%", height: 200 }}
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-40 bg-separator dark:bg-separator-dk items-center justify-center">
          <Ionicons name="image-outline" size={40} color={t.muted} />
        </View>
      )}

      {/* Content */}
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text className="text-2xl font-black text-ink dark:text-ink-dk mb-1">{item?.title}</Text>

        {/* Badges */}
        <View className="flex-row gap-2 mb-4 flex-wrap">
          {item?.listing_type && (
            <View
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: (LISTING_TYPE_COLORS[item.listing_type] || "#999") + "22" }}
            >
              <Text
                className="text-xs font-bold"
                style={{ color: LISTING_TYPE_COLORS[item.listing_type] || "#999" }}
              >
                {LISTING_TYPE_LABELS[item.listing_type] || item.listing_type}
              </Text>
            </View>
          )}
          {item?.importance != null && (
            <View
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: (IMPORTANCE_COLORS[item.importance] || "#999") + "22" }}
            >
              <Text
                className="text-xs font-bold"
                style={{ color: IMPORTANCE_COLORS[item.importance] || "#999" }}
              >
                {IMPORTANCE_LABELS[item.importance]}
              </Text>
            </View>
          )}
          <View className="px-3 py-1 rounded-full bg-separator dark:bg-separator-dk">
            <Text className="text-xs font-semibold text-subtext dark:text-subtext-dk">{item?.category}</Text>
          </View>
        </View>

        {/* Details card */}
        <View className="rounded-2xl bg-card dark:bg-card-dk border border-border dark:border-border-dk p-4 mb-4">
          {/* Location */}
          <View className="mb-3 flex-row items-start gap-2">
            <Ionicons name="location" size={16} color={t.accent} style={{ marginTop: 2 }} />
            <View className="flex-1">
              <Text className="text-xs font-bold text-muted dark:text-muted-dk uppercase tracking-wide mb-1">Location</Text>
              <Text className="text-sm text-ink dark:text-ink-dk">{item?.locations?.name || "Unknown"}</Text>
              {item?.found_at ? (
                <Text className="text-xs text-subtext dark:text-subtext-dk mt-1">{item.found_at}</Text>
              ) : null}
            </View>
          </View>

          {/* Divider */}
          <View className="border-b border-border dark:border-border-dk mb-3" />

          {/* Poster + date */}
          <View className="flex-row items-center gap-2">
            <Ionicons name="person" size={16} color={t.accent} />
            <View className="flex-1">
              <Text className="text-xs font-bold text-muted dark:text-muted-dk uppercase tracking-wide mb-1">Posted by</Text>
              <Text className="text-sm text-ink dark:text-ink-dk">{item?.poster_name || "Unknown"}</Text>
            </View>
            <Text className="text-xs text-subtext dark:text-subtext-dk">{item ? formatRelativeDate(item.date, timezone) : ""}</Text>
          </View>
        </View>

        {/* Description card */}
        {item?.description ? (
          <View className="rounded-2xl bg-card dark:bg-card-dk border border-border dark:border-border-dk p-4 mb-4">
            <Text className="text-xs font-bold text-muted dark:text-muted-dk uppercase tracking-wide mb-2">Description</Text>
            <Text className="text-sm text-ink dark:text-ink-dk leading-5">{item.description}</Text>
          </View>
        ) : null}

        {/* Mini map — SAFE ZONE: MapView props untouched */}
        {coords && (
          <View
            style={{
              borderRadius: 14,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: t.cardBorder,
              height: 160,
              marginBottom: 16,
            }}
          >
            <MapView
              style={{ width: "100%", height: "100%" }}
              initialRegion={{ latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.003, longitudeDelta: 0.003 }}
              scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false}
            >
              <Marker coordinate={{ latitude: coords.lat, longitude: coords.lng }} pinColor={t.accent} />
            </MapView>
          </View>
        )}

        {/* Action buttons */}
        <View className="gap-3 mt-2">
          {item?.resolved ? (
            <View style={{ backgroundColor: t.isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.12)", borderRadius: 12, padding: 16, alignItems: "center" }}>
              <Text style={{ color: t.isDark ? "#6ee7b7" : "#065f46", fontWeight: "700", fontSize: 14 }}>This item has been resolved</Text>
            </View>
          ) : isOwner ? (
            <TouchableOpacity
              className="bg-primary dark:bg-primary-dk rounded-xl p-4 items-center"
              onPress={() => onClaim?.(item.item_id)}
            >
              <Text className="text-white font-bold">Mark as Returned</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className="rounded-xl p-4 flex-row items-center justify-center gap-2"
              style={{ backgroundColor: t.accent }}
              onPress={handleMessage}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#fff" />
              <Text className="text-white font-bold text-base">Message Poster</Text>
            </TouchableOpacity>
          )}

          {!isOwner && (
            <TouchableOpacity
              className="border border-red-500/30 rounded-xl p-4 items-center"
              onPress={() => {
                onClose();
                setTimeout(() => onReport?.(item), 300);
              }}
            >
              <Text className="text-red-500 font-semibold text-sm">Report Post</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </BottomSheet>
  );
}
