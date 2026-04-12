import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, RefreshControl, Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import ScreenHeader from "../../components/ScreenHeader";
import ItemDetailModal from "../../components/ItemDetailModal";
import ReportModal from "../../components/ReportModal";
import PickerModal from "../../components/PickerModal";
import apiFetch from "../../utils/apiFetch";
import { useTheme } from "../../contexts/ThemeContext";
import { useTimezone } from "../../contexts/TimezoneContext";
import { CAMPUSES } from "../../constants/campuses";
import { formatRelativeDate } from "../../utils/timezone";
import { useCreatePost } from "../../contexts/CreatePostContext";

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
  if (item?.lat != null && item?.lng != null) return { lat: item.lat, lng: item.lng };
  if (item?.locations?.coordinates) return parseCoordinates(item.locations.coordinates);
  return null;
}

const CATEGORIES = ["All", "Husky Card", "Jacket", "Wallet/Purse", "Bag", "Keys", "Electronics", "Other"];
const IMPORTANCE_LABELS: Record<number, string> = { 3: "High", 2: "Medium", 1: "Low" };
const IMPORTANCE_COLORS: Record<number, string> = { 3: "#b91c1c", 2: "#a16207", 1: "#1d4ed8" };
const LISTING_TYPE_LABELS: Record<string, string> = { found: "Found", lost: "Lost" };
const LISTING_TYPE_COLORS: Record<string, string> = { found: "#0891b2", lost: "#4f46e5" };
const SORT_OPTIONS = ["Newest", "Oldest", "Most Important"];

export default function FeedScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { timezone } = useTimezone();
  const { user, profile } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("Newest");
  const [showResolved, setShowResolved] = useState(false);
  const [showMyPosts, setShowMyPosts] = useState(false);
  const [listingTypeFilter, setListingTypeFilter] = useState("all");
  const [selectedCampus, setSelectedCampus] = useState(profile?.default_campus || "boston");
  const [selected, setSelected] = useState<any | null>(null);
  const [reportItem, setReportItem] = useState<any | null>(null);
  const [pickerOpen, setPickerOpen] = useState<"category" | "campus" | "sort" | null>(null);

  const { registerOnItemCreated } = useCreatePost();

  useEffect(() => {
    registerOnItemCreated((item: any) => {
      setItems((prev) => [item, ...prev]);
    });
  }, []);

  const fetchItems = useCallback(async (page = 1, append = false, silent = false) => {
    if (page === 1 && !silent) setLoading(true);
    else if (page > 1) setLoadingMore(true);
    try {
      if (page === 1) await apiFetch("/api/listings/cleanup", { method: "POST" }).catch(() => {});
      const result = await apiFetch(`/api/listings?page=${page}&limit=10`);
      const newItems = result?.data || [];
      if (append) {
        setItems((prev) => [...prev, ...newItems]);
      } else {
        // Merge by id so existing items update in place rather than wiping the list
        setItems((prev) => {
          const prevMap = new Map(prev.map((i) => [i.item_id, i]));
          const merged = newItems.map((i: any) => prevMap.has(i.item_id) ? { ...prevMap.get(i.item_id), ...i } : i);
          return merged;
        });
      }
      setHasMore(result?.hasMore ?? false);
      if (!append) setTotalItems(result?.total ?? 0);
      setCurrentPage(page);
    } catch (err) {
      console.error("Fetch listings error:", err);
    }
    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchItems(1, false, true); // silent=true: keep existing list visible while fetching
    setRefreshing(false);
  }, [fetchItems]);

  const loadMore = useCallback(() => {
    if (hasMore && !loadingMore) fetchItems(currentPage + 1, true);
  }, [hasMore, loadingMore, currentPage, fetchItems]);

  const filtered = useMemo(() => {
    return items
      .filter((i) => selectedCampus === "all" || i.locations?.campus === selectedCampus)
      .filter((i) => showResolved || !i.resolved)
      .filter((i) => !showMyPosts || (user?.id && i.poster_id === user.id))
      .filter((i) => category === "All" || i.category === category)
      .filter((i) => listingTypeFilter === "all" || i.listing_type === listingTypeFilter)
      .filter((i) =>
        i.title?.toLowerCase().includes(search.toLowerCase()) ||
        i.locations?.name?.toLowerCase().includes(search.toLowerCase()) ||
        i.description?.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a: any, b: any) => {
        if (sort === "Newest") return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sort === "Oldest") return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sort === "Most Important") return b.importance - a.importance;
        return 0;
      });
  }, [items, selectedCampus, showResolved, showMyPosts, category, listingTypeFilter, search, sort, user?.id]);

  const handleClaim = async (item_id: string) => {
    try {
      await apiFetch(`/api/listings/${item_id}/resolve`, { method: "PATCH" });
      setItems((prev) => prev.map((i) => (i.item_id === item_id ? { ...i, resolved: true } : i)));
      setSelected((prev: any) => prev?.item_id === item_id ? { ...prev, resolved: true } : prev);
    } catch (err) { console.error("Claim error:", err); }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      className="mx-4 mb-2 rounded-2xl overflow-hidden border border-border dark:border-border-dk bg-card dark:bg-card-dk"
      onPress={() => setSelected(item)}
      activeOpacity={0.8}
    >
      <View className="flex-row p-3 gap-3">
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            className="w-16 h-16 rounded-xl"
            resizeMode="cover"
          />
        ) : (
          <View className="w-16 h-16 rounded-xl bg-separator dark:bg-separator-dk items-center justify-center">
            <Ionicons name="image-outline" size={24} color={t.muted} />
          </View>
        )}
        <View className="flex-1 gap-1">
          <Text className="text-sm font-bold text-ink dark:text-ink-dk" numberOfLines={1}>
            {item.title}
          </Text>
          {item.description ? (
            <Text className="text-xs text-subtext dark:text-subtext-dk" numberOfLines={2} style={{ lineHeight: 16 }}>
              {item.description}
            </Text>
          ) : null}
          <View className="flex-row items-center gap-3">
            {item.locations?.name ? (
              <View className="flex-row items-center gap-0.5 flex-1 min-w-0">
                <Ionicons name="location-outline" size={11} color={t.muted} />
                <Text className="text-xs text-muted dark:text-muted-dk" numberOfLines={1} style={{ flex: 1 }}>
                  {item.locations.name}
                </Text>
              </View>
            ) : null}
            {item.poster_name ? (
              <View className="flex-row items-center gap-0.5 shrink-0">
                <Ionicons name="person-outline" size={11} color={t.muted} />
                <Text className="text-xs text-muted dark:text-muted-dk" numberOfLines={1}>
                  {item.poster_name}
                </Text>
              </View>
            ) : null}
          </View>
          <View className="flex-row items-center gap-2">
            <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: LISTING_TYPE_COLORS[item.listing_type] + "22" }}>
              <Text className="text-xs font-bold" style={{ color: LISTING_TYPE_COLORS[item.listing_type] }}>
                {LISTING_TYPE_LABELS[item.listing_type]}
              </Text>
            </View>
            <Text className="text-xs text-muted dark:text-muted-dk">
              {formatRelativeDate(item.created_at, timezone)}
            </Text>
          </View>
        </View>
        <View className="items-center justify-center">
          <View
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: IMPORTANCE_COLORS[item.importance] }}
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dk" edges={["top"]}>
      <ScreenHeader title="Feed" showLogo />

      {/* Search */}
      <View className="flex-row items-center bg-input-bg dark:bg-input-bg-dk rounded-full border border-input-border dark:border-input-border-dk px-4 mx-4 mt-2 mb-2">
        <Ionicons name="search-outline" size={18} color={t.muted} />
        <TextInput
          className="flex-1 py-3 px-2 text-sm text-ink dark:text-ink-dk"
          placeholder="Search listings..."
          placeholderTextColor={t.muted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={t.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Dropdown pickers row */}
      <View className="flex-row items-center px-4 py-1 gap-2">
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-between px-3 py-2 rounded-xl border border-border dark:border-border-dk bg-card dark:bg-card-dk"
          onPress={() => setPickerOpen("category")}
        >
          <Text className="text-xs font-bold text-ink dark:text-ink-dk flex-1" numberOfLines={1}>{category}</Text>
          <Ionicons name="chevron-down" size={14} color={t.muted} />
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-between px-3 py-2 rounded-xl border border-border dark:border-border-dk bg-card dark:bg-card-dk"
          onPress={() => setPickerOpen("campus")}
        >
          <Text className="text-xs font-bold text-ink dark:text-ink-dk flex-1" numberOfLines={1}>{selectedCampus === "all" ? "All" : CAMPUSES.find((c: any) => c.id === selectedCampus)?.name || "Campus"}</Text>
          <Ionicons name="chevron-down" size={14} color={t.muted} />
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-between px-3 py-2 rounded-xl border border-border dark:border-border-dk bg-card dark:bg-card-dk"
          onPress={() => setPickerOpen("sort")}
        >
          <Text className="text-xs font-bold text-ink dark:text-ink-dk flex-1" numberOfLines={1}>{sort}</Text>
          <Ionicons name="chevron-down" size={14} color={t.muted} />
        </TouchableOpacity>
      </View>

      {/* Toggle filters row */}
      <View className="flex-row items-center px-4 py-1 gap-3">
        <Text className="text-xs font-bold text-subtext dark:text-subtext-dk">{totalItems} item{totalItems !== 1 ? "s" : ""}</Text>
        <TouchableOpacity
          onPress={() => { const c = ["all", "lost", "found"]; setListingTypeFilter(c[(c.indexOf(listingTypeFilter) + 1) % c.length]); }}
          style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, borderWidth: 1, backgroundColor: listingTypeFilter !== "all" ? t.accent : t.cardSolid, borderColor: listingTypeFilter !== "all" ? t.accent : t.cardBorder }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: listingTypeFilter !== "all" ? "#fff" : t.text }}>
            {listingTypeFilter === "all" ? "All" : LISTING_TYPE_LABELS[listingTypeFilter]}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowMyPosts((v) => !v)}
          style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, borderWidth: 1, backgroundColor: showMyPosts ? t.accent : t.cardSolid, borderColor: showMyPosts ? t.accent : t.cardBorder }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: showMyPosts ? "#fff" : t.text }}>Mine</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowResolved((v) => !v)}
          style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, borderWidth: 1, backgroundColor: showResolved ? t.accent : t.cardSolid, borderColor: showResolved ? t.accent : t.cardBorder }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: showResolved ? "#fff" : t.text }}>Resolved</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View className="flex-1 justify-center items-center pt-16">
          <ActivityIndicator size="large" color={t.accent} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.item_id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={hasMore ? (
            <View style={{ alignItems: "center", paddingVertical: 16 }}>
              {loadingMore ? <ActivityIndicator size="small" color={t.accent} /> : <Text style={{ color: t.muted, fontSize: 13 }}>Pull up for more</Text>}
            </View>
          ) : null}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center pt-16">
              <Text className="text-base font-bold text-muted dark:text-muted-dk">No items found.</Text>
            </View>
          }
        />
      )}

      <ItemDetailModal item={selected} onClose={() => setSelected(null)} onClaim={handleClaim} onReport={(item) => setReportItem(item)} />

      <ReportModal
        visible={!!reportItem}
        onClose={() => setReportItem(null)}
        type="post"
        targetId={reportItem?.item_id || ""}
        targetLabel={reportItem?.title || ""}
      />

      <PickerModal
        visible={pickerOpen === "category"}
        onClose={() => setPickerOpen(null)}
        title="Category"
        options={CATEGORIES.map((c) => ({ label: c, value: c }))}
        selected={category}
        onSelect={setCategory}
      />
      <PickerModal
        visible={pickerOpen === "campus"}
        onClose={() => setPickerOpen(null)}
        title="Campus"
        options={[{ label: "All Campuses", value: "all" }, ...CAMPUSES.map((c: any) => ({ label: `${c.name}, ${c.state}`, value: c.id }))]}
        selected={selectedCampus}
        onSelect={setSelectedCampus}
      />
      <PickerModal
        visible={pickerOpen === "sort"}
        onClose={() => setPickerOpen(null)}
        title="Sort By"
        options={SORT_OPTIONS.map((s) => ({ label: s, value: s }))}
        selected={sort}
        onSelect={setSort}
      />
    </SafeAreaView>
  );
}
