import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTheme } from "../contexts/ThemeContext";
import { useCreatePost } from "../contexts/CreatePostContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useConversations } from "../contexts/ConversationsContext";

const TAB_CONFIG = [
  { name: "feed",     label: "Feed",     icon: "list-outline" as const,       iconActive: "list" as const },
  { name: "map",      label: "Maps",     icon: "map-outline" as const,         iconActive: "map" as const },
  { name: "create",   label: "",         icon: "add" as const,                 iconActive: "add" as const },
  { name: "messages", label: "Messages", icon: "chatbubble-outline" as const,  iconActive: "chatbubble" as const },
  { name: "settings", label: "Settings", icon: "settings-outline" as const,    iconActive: "settings" as const },
];

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { t } = useTheme();
  const { open } = useCreatePost();
  const insets = useSafeAreaInsets();
  const { unreadTotal } = useConversations();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom + 4 },
      ]}
    >
      <BlurView
        intensity={80}
        tint={t.isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />
      {/* Subtle top border */}
      <View
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: StyleSheet.hairlineWidth,
          backgroundColor: t.isDark ? "rgba(255,255,255,0.08)" : "rgba(168,77,72,0.1)",
        }}
      />

      <View style={styles.row}>
        {TAB_CONFIG.map((tab) => {
          const route = state.routes.find((r) => r.name === tab.name);
          const isFocused = route ? state.index === state.routes.indexOf(route) : false;

          // Center (+) button
          if (tab.name === "create") {
            return (
              <TouchableOpacity
                key="create"
                onPress={open}
                activeOpacity={0.8}
                style={styles.centerBtn}
              >
                <View
                  style={[
                    styles.centerCircle,
                    { backgroundColor: t.isDark ? "#FF4500" : "#A84D48" },
                  ]}
                >
                  <Ionicons name="add" size={28} color="#fff" />
                </View>
              </TouchableOpacity>
            );
          }

          const onPress = () => {
            if (!route) return;
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const color = isFocused
            ? t.isDark ? "#FF4500" : "#A84D48"
            : t.isDark ? "#818384" : "#999";

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tabBtn}
            >
              <Ionicons
                name={isFocused ? tab.iconActive : tab.icon}
                size={22}
                color={color}
              />
              {tab.label ? (
                <Text
                  style={[
                    styles.label,
                    { color, fontWeight: isFocused ? "700" : "500" },
                  ]}
                >
                  {tab.label}
                </Text>
              ) : null}
              {tab.name === "messages" && unreadTotal > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: 2,
                    right: "25%",
                    backgroundColor: "#ef4444",
                    borderRadius: 8,
                    minWidth: 16,
                    height: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 3,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                    {unreadTotal}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    gap: 2,
  },
  label: {
    fontSize: 10,
  },
  centerBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  centerCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});
