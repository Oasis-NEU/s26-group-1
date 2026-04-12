# Mobile UI Makeover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the entire Lost & Hound mobile app from StyleSheet.create() to NativeWind v4, redesign all screens and modals to a glassy/modern art style using existing color tokens, add a 5-tab navigation with center (+) button, and make the auth screens polished with logo-first branding.

**Architecture:** Install NativeWind v4, wire ThemeContext to emit a `dark` CSS class so NativeWind's `dark:` prefix activates automatically, then migrate every component phase by phase — configs first, shared components second, navigation third, screens fourth, modals last. A new `CreatePostContext` lifts the create-post modal out of feed.tsx so the tab bar (+) button can open it from anywhere.

**Tech Stack:** NativeWind v4, React Native Reanimated ~4.1.1 (already installed), expo-blur ~15.0.8 (already installed), expo-linear-gradient ~15.0.8 (already installed), Expo Router ~6.0.23, TypeScript.

---

## ⚠️ CRITICAL RULES (read before touching any file)

1. **Map SAFE ZONE** — `app/(tabs)/map.tsx`: Only touch outer container `className`, the top search bar wrapper, and the bottom drawer card wrapper. Never modify `MapView`, markers, `mapTouching` state, `scrollEnabled`, radius slider logic, coordinate parsing, or `campuses.js` usage.
2. **No nested Modals** — never render a `<Modal>` inside another `<Modal>`. Use callbacks + 300ms delay to chain modals (see DEVELOPMENT-NOTES.md).
3. **Early returns** — any early return before a modal render will hide the modal. Keep modals at the bottom of the return tree, outside conditionals.
4. **`paddingBottom: 80`** (or `pb-20`) on ALL tab screen scroll views — tab bar is absolutely positioned.
5. **Never await Supabase or apiFetch inside `onAuthStateChange`** — wrap in `setTimeout(fn, 0)`.
6. **StyleSheet.create() is static** — NativeWind replaces this entirely. After migration, no StyleSheet in any component we touch.

---

## File Map

| Action | File |
|--------|------|
| CREATE | `mobile/babel.config.js` |
| CREATE | `mobile/metro.config.js` |
| CREATE | `mobile/tailwind.config.js` |
| CREATE | `mobile/global.css` |
| CREATE | `mobile/nativewind-env.d.ts` |
| CREATE | `mobile/contexts/CreatePostContext.tsx` |
| CREATE | `mobile/components/TabBar.tsx` |
| CREATE | `mobile/components/BottomSheet.tsx` |
| CREATE | `mobile/app/(tabs)/create.tsx` |
| MODIFY | `mobile/contexts/ThemeContext.tsx` |
| MODIFY | `mobile/app/_layout.tsx` |
| MODIFY | `mobile/app/(tabs)/_layout.tsx` |
| MODIFY | `mobile/components/ScreenHeader.tsx` |
| MODIFY | `mobile/components/OfflineBanner.tsx` |
| MODIFY | `mobile/components/CreatePostModal.tsx` |
| MODIFY | `mobile/components/ItemDetailModal.tsx` |
| MODIFY | `mobile/components/ReportModal.tsx` |
| MODIFY | `mobile/components/PickerModal.tsx` |
| MODIFY | `mobile/components/TermsModal.tsx` |
| MODIFY | `mobile/app/(auth)/login.tsx` |
| MODIFY | `mobile/app/(auth)/forgot-password.tsx` |
| MODIFY | `mobile/app/(tabs)/feed.tsx` |
| MODIFY | `mobile/app/(tabs)/map.tsx` ⚠️ SAFE ZONE |
| MODIFY | `mobile/app/(tabs)/messages.tsx` |
| MOVE+MODIFY | `mobile/app/settings.tsx` → `mobile/app/(tabs)/settings.tsx` |

---

## Task 1: NativeWind v4 Installation & Config

**Files:**
- Create: `mobile/babel.config.js`
- Create: `mobile/metro.config.js`
- Create: `mobile/tailwind.config.js`
- Create: `mobile/global.css`
- Create: `mobile/nativewind-env.d.ts`

- [ ] **Step 1: Install nativewind**

```bash
cd mobile && npm install nativewind@^4.0.0
```

- [ ] **Step 2: Create `mobile/babel.config.js`**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["nativewind/babel"],
  };
};
```

- [ ] **Step 3: Create `mobile/metro.config.js`**

```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: "./global.css" });
```

- [ ] **Step 4: Create `mobile/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary:        "#A84D48",
        "primary-dk":   "#FF4500",
        surface:        "#f5f0f0",
        "surface-dk":   "#030303",
        card:           "rgba(255,255,255,0.65)",
        "card-dk":      "rgba(26,26,27,0.75)",
        "card-solid":   "#ffffff",
        "card-solid-dk":"#1A1A1B",
        ink:            "#3d2020",
        "ink-dk":       "#D7DADC",
        subtext:        "#6b6b6b",
        "subtext-dk":   "#B8BABD",
        muted:          "#999",
        "muted-dk":     "#818384",
        border:         "rgba(168,77,72,0.12)",
        "border-dk":    "rgba(255,255,255,0.1)",
        separator:      "rgba(168,77,72,0.08)",
        "separator-dk": "rgba(255,255,255,0.06)",
        "input-bg":     "rgba(255,255,255,0.7)",
        "input-bg-dk":  "rgba(45,45,46,0.8)",
        "input-border": "rgba(168,77,72,0.18)",
        "input-border-dk": "rgba(255,255,255,0.14)",
        "tab-bar":      "rgba(255,255,255,0.72)",
        "tab-bar-dk":   "rgba(26,26,27,0.85)",
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 5: Create `mobile/global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 6: Create `mobile/nativewind-env.d.ts`**

```ts
/// <reference types="nativewind/types" />
```

- [ ] **Step 7: Verify Metro starts cleanly**

```bash
cd mobile && npx expo start --clear
```

Expected: Metro bundler starts without errors. If you see "nativewind/babel not found", run `npm install` again.

- [ ] **Step 8: Commit**

```bash
git add mobile/babel.config.js mobile/metro.config.js mobile/tailwind.config.js mobile/global.css mobile/nativewind-env.d.ts mobile/package.json mobile/package-lock.json
git commit -m "feat: install and configure NativeWind v4"
```

---

## Task 2: Wire ThemeContext Dark Class + StatusBar

**Files:**
- Modify: `mobile/contexts/ThemeContext.tsx`
- Modify: `mobile/app/_layout.tsx`

- [ ] **Step 1: Update ThemeContext to wrap children in a dark-class View**

Replace the `return` statement in `ThemeProvider` (currently lines 62–74) with:

```tsx
import { createContext, useContext, useState, type ReactNode } from "react";
import { useColorScheme, View } from "react-native";

// ... keep LIGHT, DARK, ThemeColors, ThemeMode, ThemeContextType, ThemeContext, useTheme unchanged ...

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>("auto");

  const isDark =
    themeMode === "dark" ? true :
    themeMode === "light" ? false :
    systemScheme === "dark";

  const t = { ...(isDark ? DARK : LIGHT), isDark };

  return (
    <ThemeContext.Provider value={{ t, themeMode, setThemeMode }}>
      <View className={isDark ? "dark flex-1" : "flex-1"}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}
```

- [ ] **Step 2: Update StatusBar in `app/_layout.tsx`**

Replace `<StatusBar style="auto" />` with a theme-aware StatusBar. Add `useTheme` import and update:

```tsx
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import { ItemsProvider } from "../contexts/ItemsContext";
import { TimezoneProvider } from "../contexts/TimezoneContext";
import { ConversationsProvider } from "../contexts/ConversationsContext";
import { StatusBar } from "expo-status-bar";
import OfflineBanner from "../components/OfflineBanner";
import "../global.css";

function AuthGate() {
  const { user, mfaVerified } = useAuth();
  const { t } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";
    if ((!user || !mfaVerified) && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && mfaVerified && inAuthGroup) {
      router.replace("/(tabs)/feed");
    }
  }, [user, mfaVerified, segments]);

  return (
    <>
      <StatusBar style={t.isDark ? "light" : "dark"} />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TimezoneProvider>
          <ItemsProvider>
            <ConversationsProvider>
              <OfflineBanner />
              <AuthGate />
            </ConversationsProvider>
          </ItemsProvider>
        </TimezoneProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 3: Verify dark/light mode status bar**

Run `npx expo start`, toggle dark/light mode — status bar should be white text on dark, black text on light.

- [ ] **Step 4: Commit**

```bash
git add mobile/contexts/ThemeContext.tsx mobile/app/_layout.tsx
git commit -m "feat: wire NativeWind dark class and theme-aware StatusBar"
```

---

## Task 3: Redesign ScreenHeader + OfflineBanner

**Files:**
- Modify: `mobile/components/ScreenHeader.tsx`
- Modify: `mobile/components/OfflineBanner.tsx`

- [ ] **Step 1: Rewrite ScreenHeader with NativeWind**

```tsx
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";

interface ScreenHeaderProps {
  title: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  onLeftPress?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  showLogo?: boolean;
}

export default function ScreenHeader({
  title,
  leftIcon,
  onLeftPress,
  rightIcon,
  onRightPress,
  showLogo = false,
}: ScreenHeaderProps) {
  const { t, themeMode, setThemeMode } = useTheme();

  const cycleTheme = () => {
    const modes: Array<"auto" | "light" | "dark"> = ["auto", "light", "dark"];
    setThemeMode(modes[(modes.indexOf(themeMode) + 1) % modes.length]);
  };

  const themeIcon =
    themeMode === "dark" ? "moon" :
    themeMode === "light" ? "sunny" :
    "contrast-outline";

  return (
    <View className="flex-row items-center px-3 py-2.5 border-b border-separator dark:border-separator-dk">
      {/* Left — fixed width keeps title centered */}
      <View className="w-20 flex-row items-center">
        {leftIcon && onLeftPress ? (
          <TouchableOpacity
            onPress={onLeftPress}
            hitSlop={12}
            className="w-9 h-9 rounded-full items-center justify-center"
          >
            <Ionicons name={leftIcon} size={22} color={t.accent} />
          </TouchableOpacity>
        ) : showLogo ? (
          <Image
            source={require("../assets/AppLogo.jpeg")}
            className="w-8 h-8 rounded-lg"
            resizeMode="contain"
          />
        ) : null}
      </View>

      {/* Title — always centered */}
      <Text
        className="flex-1 text-xl font-black text-center text-ink dark:text-ink-dk"
        numberOfLines={1}
      >
        {title}
      </Text>

      {/* Right — fixed width matching left */}
      <View className="w-20 flex-row items-center justify-end gap-1">
        <TouchableOpacity
          onPress={cycleTheme}
          hitSlop={8}
          className="w-9 h-9 rounded-full items-center justify-center"
        >
          <Ionicons name={themeIcon} size={18} color={t.subtext} />
        </TouchableOpacity>
        {rightIcon && onRightPress ? (
          <TouchableOpacity
            onPress={onRightPress}
            hitSlop={8}
            className="w-9 h-9 rounded-full items-center justify-center"
          >
            <Ionicons name={rightIcon} size={22} color={t.subtext} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Rewrite OfflineBanner as floating pill**

```tsx
import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  if (!isOffline) return null;

  return (
    <View className="absolute top-12 self-center z-50 flex-row items-center gap-1.5 px-4 py-2 rounded-full bg-red-500 shadow-lg">
      <Ionicons name="cloud-offline-outline" size={14} color="#fff" />
      <Text className="text-white font-bold text-sm">No internet connection</Text>
    </View>
  );
}
```

- [ ] **Step 3: Verify components render in both modes**

Run app, check ScreenHeader title is centered, theme toggle works, OfflineBanner shows as pill when offline (simulate by toggling airplane mode).

- [ ] **Step 4: Commit**

```bash
git add mobile/components/ScreenHeader.tsx mobile/components/OfflineBanner.tsx
git commit -m "feat: redesign ScreenHeader and OfflineBanner with NativeWind"
```

---

## Task 4: CreatePostContext

**Files:**
- Create: `mobile/contexts/CreatePostContext.tsx`

This context lifts the create-post modal state so the tab bar (+) can open it from outside feed.tsx.

- [ ] **Step 1: Create `mobile/contexts/CreatePostContext.tsx`**

```tsx
import { createContext, useContext, useState, useRef, type ReactNode } from "react";

interface CreatePostContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  onItemCreated: (item: any) => void;
  registerOnItemCreated: (cb: (item: any) => void) => void;
}

const CreatePostContext = createContext<CreatePostContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
  onItemCreated: () => {},
  registerOnItemCreated: () => {},
});

export function CreatePostProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const callbackRef = useRef<((item: any) => void) | null>(null);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  const registerOnItemCreated = (cb: (item: any) => void) => {
    callbackRef.current = cb;
  };

  const onItemCreated = (item: any) => {
    callbackRef.current?.(item);
    setIsOpen(false);
  };

  return (
    <CreatePostContext.Provider value={{ isOpen, open, close, onItemCreated, registerOnItemCreated }}>
      {children}
    </CreatePostContext.Provider>
  );
}

export const useCreatePost = () => useContext(CreatePostContext);
```

- [ ] **Step 2: Add CreatePostProvider to the provider tree in `app/_layout.tsx`**

Add `import { CreatePostProvider } from "../contexts/CreatePostContext";` at the top.

Wrap the innermost children:

```tsx
<ConversationsProvider>
  <CreatePostProvider>
    <OfflineBanner />
    <AuthGate />
  </CreatePostProvider>
</ConversationsProvider>
```

- [ ] **Step 3: Commit**

```bash
git add mobile/contexts/CreatePostContext.tsx mobile/app/_layout.tsx
git commit -m "feat: add CreatePostContext to share modal state across tab bar"
```

---

## Task 5: Create BottomSheet Component

**Files:**
- Create: `mobile/components/BottomSheet.tsx`

Shared animated bottom sheet wrapper used by all 5 modals. Uses Reanimated for spring entrance.

- [ ] **Step 1: Create `mobile/components/BottomSheet.tsx`**

```tsx
import { useEffect } from "react";
import {
  Modal,
  TouchableOpacity,
  View,
  StyleSheet,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  withSpring,
  withTiming,
  useAnimatedStyle,
  runOnJS,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { useTheme } from "../contexts/ThemeContext";

const SCREEN_HEIGHT = Dimensions.get("window").height;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Height as fraction of screen height, default 0.85 */
  heightFraction?: number;
}

export default function BottomSheet({
  visible,
  onClose,
  children,
  heightFraction = 0.85,
}: BottomSheetProps) {
  const { t } = useTheme();
  const sheetHeight = SCREEN_HEIGHT * heightFraction;
  const translateY = useSharedValue(sheetHeight);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    }
  }, [visible]);

  const handleClose = () => {
    translateY.value = withTiming(sheetHeight, { duration: 220 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Dimmed backdrop */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={handleClose}
        className="bg-black/50"
      />

      {/* Sheet */}
      <Animated.View
        style={[
          {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: sheetHeight,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: "hidden",
          },
          animatedStyle,
        ]}
      >
        <BlurView
          intensity={80}
          tint={t.isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
        <View className="flex-1 bg-card/90 dark:bg-card-dk/90">
          {/* Handle bar */}
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-muted dark:bg-muted-dk opacity-50" />
          </View>
          {children}
        </View>
      </Animated.View>
    </Modal>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/components/BottomSheet.tsx
git commit -m "feat: create shared BottomSheet component with Reanimated spring animation"
```

---

## Task 6: Create CustomTabBar Component

**Files:**
- Create: `mobile/components/TabBar.tsx`
- Create: `mobile/app/(tabs)/create.tsx`

- [ ] **Step 1: Create `mobile/app/(tabs)/create.tsx`** (dummy screen, never rendered)

```tsx
// This file exists so Expo Router registers the "create" slot.
// Navigation to this route is disabled via href: null in _layout.tsx.
export default function CreateScreen() {
  return null;
}
```

- [ ] **Step 2: Create `mobile/components/TabBar.tsx`**

```tsx
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTheme } from "../contexts/ThemeContext";
import { useCreatePost } from "../contexts/CreatePostContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
        {TAB_CONFIG.map((tab, index) => {
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
              {tab.name === "messages" && /* unread badge handled below */  null}
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
```

- [ ] **Step 3: Add unread badge to Messages button**

In `TabBar.tsx`, add an import and badge rendering. After the `label` Text, add for the messages tab:

Find the `tab.name === "messages"` case inside the map. Import `useConversations` and show the badge:

```tsx
// At top of TabBar.tsx, add:
import { useConversations } from "../contexts/ConversationsContext";

// Inside the component, before return:
const { unreadTotal } = useConversations();

// In the messages tabBtn, after the label Text:
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
```

- [ ] **Step 4: Commit**

```bash
git add mobile/components/TabBar.tsx mobile/app/(tabs)/create.tsx
git commit -m "feat: create custom TabBar with center (+) button and unread badge"
```

---

## Task 7: Update (tabs)/_layout.tsx — 5 Tabs + Modal

**Files:**
- Modify: `mobile/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Rewrite `(tabs)/_layout.tsx`**

```tsx
import { useState } from "react";
import { Tabs } from "expo-router";
import TabBar from "../../components/TabBar";
import CreatePostModal from "../../components/CreatePostModal";
import { useCreatePost } from "../../contexts/CreatePostContext";
import { useItems } from "../../contexts/ItemsContext";

function TabsWithModal() {
  const { isOpen, close, onItemCreated } = useCreatePost();
  const { refreshItems } = useItems();

  const handleAdd = (item: any) => {
    onItemCreated(item);
    refreshItems();
  };

  return (
    <>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <TabBar {...props} />}
      >
        <Tabs.Screen name="feed"     options={{ title: "Feed" }} />
        <Tabs.Screen name="map"      options={{ title: "Maps" }} />
        <Tabs.Screen name="create"   options={{ href: null }} />
        <Tabs.Screen name="messages" options={{ title: "Messages" }} />
        <Tabs.Screen name="settings" options={{ title: "Settings" }} />
      </Tabs>

      <CreatePostModal
        visible={isOpen}
        onClose={close}
        onAdd={handleAdd}
      />
    </>
  );
}

export default function TabsLayout() {
  return <TabsWithModal />;
}
```

- [ ] **Step 2: Verify all 5 tabs appear, (+) opens CreatePostModal**

Run app, confirm: Feed, Maps, (+), Messages, Settings tabs visible. Tap (+) — modal slides up. Settings navigates correctly.

- [ ] **Step 3: Commit**

```bash
git add mobile/app/(tabs)/_layout.tsx
git commit -m "feat: add 5-tab layout with custom TabBar and CreatePostModal from tab bar"
```

---

## Task 8: Move Settings to Tab

**Files:**
- Create: `mobile/app/(tabs)/settings.tsx` (content from `app/settings.tsx`)
- Modify: `mobile/app/settings.tsx` (can be deleted or left as redirect)

- [ ] **Step 1: Copy `app/settings.tsx` to `app/(tabs)/settings.tsx`**

Read `app/settings.tsx` and copy the full content to `app/(tabs)/settings.tsx` with these changes:
1. Fix all import paths: `"../contexts/..."` → `"../../contexts/..."`, `"../utils/..."` → `"../../utils/..."`, `"../components/..."` → `"../../components/..."`, `"../constants/..."` → `"../../constants/..."`
2. Remove `const router = useRouter()` and any `router.back()` calls
3. Remove any back-button from ScreenHeader (the `leftIcon` / `onLeftPress` props for back navigation)
4. Keep all logic, state, and functionality identical

- [ ] **Step 2: Delete `app/settings.tsx`**

```bash
rm mobile/app/settings.tsx
```

- [ ] **Step 3: Verify Settings tab loads**

Tap Settings tab in app — full settings screen should appear with no back button.

- [ ] **Step 4: Commit**

```bash
git add mobile/app/(tabs)/settings.tsx
git rm mobile/app/settings.tsx
git commit -m "feat: move Settings to tab route"
```

---

## Task 9: Redesign Auth — login.tsx

**Files:**
- Modify: `mobile/app/(auth)/login.tsx`

The screen already has LinearGradient + BlurView. Key changes: pill tab switcher, icon prefixes on inputs, NativeWind classes replacing all StyleSheet entries, cleaner MFA screen.

- [ ] **Step 1: Replace StyleSheet.create at bottom of file with NativeWind**

Remove the entire `const styles = StyleSheet.create({...})` block at the bottom of `login.tsx`.

- [ ] **Step 2: Add pill tab switcher to replace inline text toggle**

Find the current toggle (a `<Text>` with `onPress` to switch `isSignUp`). Replace with:

```tsx
{/* Pill mode switcher — place ABOVE the form card, after brandSection */}
<View className="flex-row bg-black/20 rounded-full p-1 mb-5 self-stretch">
  <TouchableOpacity
    className={`flex-1 py-2.5 rounded-full items-center ${!isSignUp ? "bg-primary" : ""}`}
    onPress={() => { setIsSignUp(false); setError(""); setMessage(""); }}
  >
    <Text className={`font-bold text-sm ${!isSignUp ? "text-white" : "text-white/60"}`}>
      Sign In
    </Text>
  </TouchableOpacity>
  <TouchableOpacity
    className={`flex-1 py-2.5 rounded-full items-center ${isSignUp ? "bg-primary" : ""}`}
    onPress={() => { setIsSignUp(true); setError(""); setMessage(""); }}
  >
    <Text className={`font-bold text-sm ${isSignUp ? "text-white" : "text-white/60"}`}>
      Sign Up
    </Text>
  </TouchableOpacity>
</View>
```

Remove the old subtitle `<Text>` with inline toggle link inside the card.

- [ ] **Step 3: Add icon prefixes to inputs**

Replace each `<TextInput style={styles.input} ...>` with an icon-wrapped version:

```tsx
{/* Email input wrapper */}
<View className="flex-row items-center bg-white/10 rounded-xl border border-white/10 mb-3 px-4">
  <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.4)" />
  <TextInput
    className="flex-1 py-4 px-3 text-base text-white"
    placeholder="you@northeastern.edu"
    placeholderTextColor="rgba(255,255,255,0.3)"
    value={email}
    onChangeText={setEmail}
    autoCapitalize="none"
    keyboardType="email-address"
    textContentType="emailAddress"
  />
</View>

{/* Password input wrapper */}
<View className="flex-row items-center bg-white/10 rounded-xl border border-white/10 mb-3 px-4">
  <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.4)" />
  <TextInput
    className="flex-1 py-4 px-3 text-base text-white"
    placeholder="Password"
    placeholderTextColor="rgba(255,255,255,0.3)"
    value={password}
    onChangeText={(v) => setPassword(v.slice(0, PASSWORD_MAX_LENGTH))}
    secureTextEntry
    textContentType="password"
  />
</View>

{/* First/Last name inputs (sign up only) */}
{isSignUp && (
  <>
    <View className="flex-row items-center bg-white/10 rounded-xl border border-white/10 mb-3 px-4">
      <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.4)" />
      <TextInput
        className="flex-1 py-4 px-3 text-base text-white"
        placeholder="First name"
        placeholderTextColor="rgba(255,255,255,0.3)"
        value={firstName}
        onChangeText={(v) => setFirstName(v.slice(0, NAME_MAX_LENGTH))}
        autoCapitalize="words"
      />
    </View>
    <View className="flex-row items-center bg-white/10 rounded-xl border border-white/10 mb-3 px-4">
      <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.4)" />
      <TextInput
        className="flex-1 py-4 px-3 text-base text-white"
        placeholder="Last name"
        placeholderTextColor="rgba(255,255,255,0.3)"
        value={lastName}
        onChangeText={(v) => setLastName(v.slice(0, NAME_MAX_LENGTH))}
        autoCapitalize="words"
      />
    </View>
  </>
)}
```

- [ ] **Step 4: Replace remaining StyleSheet refs with NativeWind**

For each `style={styles.X}` reference remaining, apply the equivalent className:

| Old style ref | New className |
|---|---|
| `styles.gradient` | `flex-1` (on LinearGradient) |
| `styles.scrollContent` | `flex-grow justify-center p-6 pb-10` |
| `styles.brandSection` | `items-center mb-7` |
| `styles.logo` | `w-20 h-20 rounded-2xl mb-3` (with shadow via StyleSheet.create inline only if needed) |
| `styles.brandTitle` | `text-2xl font-black text-white tracking-wide` |
| `styles.brandTagline` | `text-lg font-extrabold text-white/85 text-center mt-2 leading-6` |
| `styles.brandCaption` | `text-sm text-white/50 text-center mt-2 leading-5` |
| `styles.glassCard` | `rounded-2xl overflow-hidden border border-white/10` (keep on BlurView) |
| `styles.cardInner` | `p-6` |
| `styles.title` | `text-xl font-extrabold text-white mb-1` |
| `styles.button` | `bg-primary rounded-xl p-4 items-center mt-2` |
| `styles.buttonDisabled` | `opacity-60` |
| `styles.buttonText` | `text-white text-base font-bold` |
| `styles.linkBtn` | `mt-4 items-center` |
| `styles.linkText` | `text-white/70 font-bold text-sm` |
| `styles.error` | `text-red-300 text-sm mb-2 font-semibold` |
| `styles.info` | `text-green-300 text-sm mb-2 font-semibold` |
| `styles.footerCaption` | `text-center text-white/30 text-xs mt-5` |

- [ ] **Step 5: MFA screen — apply same NativeWind treatment**

The MFA screen `if (authStep === "mfa")` block uses the same class names as credentials screen. Replace `style={styles.X}` refs there with the same mapping above. Keep all MFA logic (factorId, challengeId, QR key display, verify handler) completely unchanged.

- [ ] **Step 6: Verify auth flow end-to-end**

Open app without auth → login screen shows gradient + logo + pill switcher. Switch between Sign In / Sign Up with the pill. Try to sign in (no actual credentials needed for visual check). Forgot password link navigates.

- [ ] **Step 7: Commit**

```bash
git add mobile/app/(auth)/login.tsx
git commit -m "feat: redesign auth login screen with pill switcher and icon inputs"
```

---

## Task 10: Redesign forgot-password.tsx

**Files:**
- Modify: `mobile/app/(auth)/forgot-password.tsx`

- [ ] **Step 1: Read current forgot-password.tsx**

Read the full file to understand its current structure before changing it.

- [ ] **Step 2: Apply same visual treatment as login.tsx**

- Wrap in `LinearGradient` with same colors as login: `["#1a0a0a", "#030303", "#0a0505"]`
- Logo at top in `brandSection` (same className as login)
- Form in `BlurView` glass card (same `glassCard` + `cardInner` classNames)
- Replace input with icon-prefixed wrapper (mail-outline icon)
- Replace button with `bg-primary rounded-xl p-4 items-center`
- Replace `StyleSheet.create` with NativeWind classNames
- Keep ALL existing logic (email submit, navigation back to login) unchanged

- [ ] **Step 3: Verify forgot-password screen**

Navigate to forgot-password from login — should show same gradient + glass card style.

- [ ] **Step 4: Commit**

```bash
git add mobile/app/(auth)/forgot-password.tsx
git commit -m "feat: redesign forgot-password screen to match login style"
```

---

## Task 11: Redesign Feed Screen

**Files:**
- Modify: `mobile/app/(tabs)/feed.tsx`

Key changes: remove create post button (now in tab bar), register `onItemCreated` callback with `CreatePostContext`, restyle cards/search/filters.

- [ ] **Step 1: Remove CreatePostModal import and local state**

Remove:
```tsx
import CreatePostModal from "../../components/CreatePostModal";
const [showCreatePost, setShowCreatePost] = useState(false);
```

- [ ] **Step 2: Import and register CreatePostContext callback**

```tsx
import { useCreatePost } from "../../contexts/CreatePostContext";

// Inside FeedScreen component, after state declarations:
const { registerOnItemCreated } = useCreatePost();

useEffect(() => {
  registerOnItemCreated((item: any) => {
    setItems((prev) => [item, ...prev]);
  });
}, []);
```

- [ ] **Step 3: Remove the JSX create button and CreatePostModal render**

Search for the FAB/create button in the render. It'll look like a `TouchableOpacity` with `onPress={() => setShowCreatePost(true)}`. Remove it entirely.

Also remove the `<CreatePostModal visible={showCreatePost} ... />` from the return.

- [ ] **Step 4: Restyle search bar**

Find the search `TextInput` wrapper. Replace its `style` with NativeWind:

```tsx
<View className="flex-row items-center bg-input-bg dark:bg-input-bg-dk rounded-full border border-input-border dark:border-input-border-dk px-4 mx-4 mb-3">
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
```

- [ ] **Step 5: Restyle category filter pills**

Find the category ScrollView. Replace each pill button style:

```tsx
<ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 mb-3">
  {CATEGORIES.map((cat) => (
    <TouchableOpacity
      key={cat}
      onPress={() => setCategory(cat)}
      className={`mr-2 px-4 py-2 rounded-full border ${
        category === cat
          ? "bg-primary dark:bg-primary-dk border-primary dark:border-primary-dk"
          : "bg-card dark:bg-card-dk border-border dark:border-border-dk"
      }`}
    >
      <Text className={`text-xs font-bold ${category === cat ? "text-white" : "text-ink dark:text-ink-dk"}`}>
        {cat}
      </Text>
    </TouchableOpacity>
  ))}
</ScrollView>
```

- [ ] **Step 6: Restyle listing cards**

Find the card render (inside `renderItem` or the FlatList render function). Apply:

```tsx
<TouchableOpacity
  className="mx-4 mb-3 rounded-2xl overflow-hidden border border-border dark:border-border-dk bg-card dark:bg-card-dk"
  onPress={() => setSelected(item)}
  activeOpacity={0.8}
>
  <View className="flex-row p-3 gap-3">
    {/* Thumbnail */}
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

    {/* Content */}
    <View className="flex-1 gap-1">
      <Text className="text-base font-bold text-ink dark:text-ink-dk" numberOfLines={1}>
        {item.title}
      </Text>
      <View className="flex-row gap-2 flex-wrap">
        {/* Type badge */}
        <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: LISTING_TYPE_COLORS[item.listing_type] + "22" }}>
          <Text className="text-xs font-bold" style={{ color: LISTING_TYPE_COLORS[item.listing_type] }}>
            {LISTING_TYPE_LABELS[item.listing_type]}
          </Text>
        </View>
        {/* Category */}
        <Text className="text-xs text-subtext dark:text-subtext-dk">{item.category}</Text>
      </View>
      {/* Date + campus */}
      <Text className="text-xs text-muted dark:text-muted-dk">
        {formatRelativeDate(item.created_at, timezone)} · {item.campus || ""}
      </Text>
    </View>

    {/* Importance dot */}
    <View className="items-center justify-center">
      <View
        className="w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: IMPORTANCE_COLORS[item.importance] }}
      />
    </View>
  </View>
</TouchableOpacity>
```

- [ ] **Step 7: Update SafeAreaView + FlatList container**

```tsx
<SafeAreaView className="flex-1 bg-surface dark:bg-surface-dk" edges={["top"]}>
  ...
  <FlatList
    ...
    contentContainerStyle={{ paddingBottom: 100 }}  // clears tab bar
    ...
  />
</SafeAreaView>
```

- [ ] **Step 8: Remove StyleSheet.create block**

Delete the entire `const styles = StyleSheet.create({...})` at the bottom.

- [ ] **Step 9: Verify feed renders with new card style and no create button**

Open Feed tab — no FAB button, cards show with new rounded glass style, filter pills work, search bar has icon.

- [ ] **Step 10: Commit**

```bash
git add mobile/app/(tabs)/feed.tsx
git commit -m "feat: redesign Feed screen with NativeWind, remove create button"
```

---

## Task 12: Map Screen — SAFE ZONE Styling Only

**Files:**
- Modify: `mobile/app/(tabs)/map.tsx`

⚠️ **ONLY touch className/style on: outer SafeAreaView, top search bar wrapper View, bottom drawer card wrapper View. Nothing else.**

- [ ] **Step 1: Read the full map.tsx before touching it**

Read `app/(tabs)/map.tsx` in full. Identify: the outer container, the search bar View, and the bottom results drawer View. Note their current `style={...}` props.

- [ ] **Step 2: Update outer container**

Find the outermost `SafeAreaView` or `View` and change only its `style` to:
```tsx
<SafeAreaView className="flex-1 bg-surface dark:bg-surface-dk" edges={["top"]}>
```

- [ ] **Step 3: Update search bar wrapper**

Find the search bar wrapper View. Change only its `style` to:
```tsx
<View className="mx-4 mt-3 mb-2 flex-row items-center bg-input-bg dark:bg-input-bg-dk rounded-full border border-input-border dark:border-input-border-dk px-4">
```

- [ ] **Step 4: Update bottom drawer card wrapper**

Find the container that wraps the bottom results list. Change only its outer View style to:
```tsx
<View className="bg-card dark:bg-card-dk rounded-t-3xl border-t border-border dark:border-border-dk">
```

- [ ] **Step 5: Leave everything else completely unchanged**

MapView, markers, `mapTouching`, `scrollEnabled`, radius slider, `CAMPUSES` logic, coordinate parsing — zero changes.

- [ ] **Step 6: Verify map still works**

Open Map tab — map loads, can search, markers appear, scroll conflict still handled (scroll doesn't fight map when touching map), radius slider works.

- [ ] **Step 7: Commit**

```bash
git add mobile/app/(tabs)/map.tsx
git commit -m "feat: apply art-style-only container updates to Map screen (safe zone)"
```

---

## Task 13: Redesign Messages Screen

**Files:**
- Modify: `mobile/app/(tabs)/messages.tsx`

- [ ] **Step 1: Read current messages.tsx before modifying**

Read the full file to understand the current structure.

- [ ] **Step 2: Update outer container**

```tsx
<SafeAreaView className="flex-1 bg-surface dark:bg-surface-dk" edges={["top"]}>
```

- [ ] **Step 3: Restyle conversation rows**

Find the `renderItem` or mapping of conversation items. Replace with:

```tsx
<TouchableOpacity
  className="mx-4 mb-2 p-4 rounded-2xl bg-card dark:bg-card-dk border border-border dark:border-border-dk flex-row items-center gap-3"
  onPress={() => { /* existing navigation logic */ }}
  activeOpacity={0.8}
>
  {/* Avatar circle */}
  <View className="w-12 h-12 rounded-full bg-separator dark:bg-separator-dk items-center justify-center">
    <Text className="text-base font-bold text-ink dark:text-ink-dk">
      {getInitials(conversation)}
    </Text>
  </View>

  {/* Content */}
  <View className="flex-1">
    <Text className="text-sm font-bold text-ink dark:text-ink-dk" numberOfLines={1}>
      {getConversationTitle(conversation)}
    </Text>
    <Text className="text-xs text-subtext dark:text-subtext-dk mt-0.5" numberOfLines={1}>
      {conversation.last_message || "No messages yet"}
    </Text>
  </View>

  {/* Right side: timestamp + unread */}
  <View className="items-end gap-1">
    <Text className="text-xs text-muted dark:text-muted-dk">
      {formatRelativeDate(conversation.updated_at, timezone)}
    </Text>
    {conversation.unread_count > 0 && (
      <View className="w-5 h-5 rounded-full bg-red-500 items-center justify-center">
        <Text className="text-white text-xs font-bold">{conversation.unread_count}</Text>
      </View>
    )}
  </View>
</TouchableOpacity>
```

Note: `getInitials` and `getConversationTitle` refer to whatever helper functions are currently used for display names. Adapt to the existing variable names in the file.

- [ ] **Step 4: Style empty state**

Find the empty state View and apply:

```tsx
<View className="flex-1 items-center justify-center gap-3 pb-20">
  <Ionicons name="chatbubbles-outline" size={48} color={t.muted} />
  <Text className="text-base font-bold text-muted dark:text-muted-dk">No conversations yet</Text>
  <Text className="text-sm text-subtext dark:text-subtext-dk text-center px-8">
    Start a conversation by tapping on a listing
  </Text>
</View>
```

- [ ] **Step 5: Add `contentContainerStyle={{ paddingBottom: 100 }}` to scroll/list**

- [ ] **Step 6: Remove StyleSheet.create block**

- [ ] **Step 7: Verify Messages screen**

Open Messages tab — conversation rows show with new card style, avatar circles, unread dots.

- [ ] **Step 8: Commit**

```bash
git add mobile/app/(tabs)/messages.tsx
git commit -m "feat: redesign Messages screen with glassy conversation cards"
```

---

## Task 14: Redesign Settings Screen

**Files:**
- Modify: `mobile/app/(tabs)/settings.tsx`

- [ ] **Step 1: Update outer container and header**

```tsx
<SafeAreaView className="flex-1 bg-surface dark:bg-surface-dk" edges={["top"]}>
  <ScreenHeader title="Settings" />
  <ScrollView
    className="flex-1"
    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
  >
```

- [ ] **Step 2: Wrap settings sections in glassy cards**

Pattern for each section group:

```tsx
{/* Section: Profile */}
<View className="mb-4">
  <Text className="text-xs font-bold text-muted dark:text-muted-dk uppercase tracking-widest mb-2 px-1">
    Profile
  </Text>
  <View className="rounded-2xl bg-card dark:bg-card-dk border border-border dark:border-border-dk overflow-hidden">
    {/* Row items go here */}
  </View>
</View>
```

- [ ] **Step 3: Style individual rows**

Pattern for each row:

```tsx
<TouchableOpacity
  className="flex-row items-center px-4 py-4 border-b border-separator dark:border-separator-dk last:border-0"
  onPress={...}
>
  <Text className="flex-1 text-sm font-semibold text-ink dark:text-ink-dk">{label}</Text>
  <View className="flex-row items-center gap-2">
    <Text className="text-sm text-subtext dark:text-subtext-dk">{value}</Text>
    <Ionicons name="chevron-forward" size={16} color={t.muted} />
  </View>
</TouchableOpacity>
```

- [ ] **Step 4: Style logout/danger row**

```tsx
<TouchableOpacity
  className="mx-0 mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 items-center"
  onPress={logout}
>
  <Text className="text-red-500 font-bold text-sm">Sign Out</Text>
</TouchableOpacity>
```

- [ ] **Step 5: Remove StyleSheet.create block**

- [ ] **Step 6: Verify Settings screen**

Open Settings tab — grouped card layout, no back button.

- [ ] **Step 7: Commit**

```bash
git add mobile/app/(tabs)/settings.tsx
git commit -m "feat: redesign Settings screen with grouped card sections"
```

---

## Task 15: Redesign CreatePostModal

**Files:**
- Modify: `mobile/components/CreatePostModal.tsx`

- [ ] **Step 1: Import BottomSheet**

```tsx
import BottomSheet from "./BottomSheet";
```

- [ ] **Step 2: Replace Modal wrapper with BottomSheet**

Change the outermost render from:
```tsx
<Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
  <SafeAreaView style={...}>
    ...
  </SafeAreaView>
</Modal>
```

To:
```tsx
<BottomSheet visible={visible} onClose={onClose} heightFraction={0.92}>
  <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
    {/* header */}
    <View className="flex-row items-center justify-between mb-5">
      <Text className="text-xl font-black text-ink dark:text-ink-dk">New Listing</Text>
      <TouchableOpacity onPress={onClose} hitSlop={8} className="w-8 h-8 rounded-full bg-separator dark:bg-separator-dk items-center justify-center">
        <Ionicons name="close" size={18} color={t.text} />
      </TouchableOpacity>
    </View>
    {/* ... rest of form fields ... */}
  </ScrollView>
</BottomSheet>
```

- [ ] **Step 3: Apply NativeWind to all form fields**

For each input in the form:
```tsx
<View className="mb-4">
  <Text className="text-xs font-bold text-subtext dark:text-subtext-dk uppercase tracking-wide mb-1.5">{label}</Text>
  <TextInput
    className="bg-input-bg dark:bg-input-bg-dk border border-input-border dark:border-input-border-dk rounded-xl px-4 py-3.5 text-sm text-ink dark:text-ink-dk"
    placeholderTextColor={t.muted}
    ...
  />
</View>
```

- [ ] **Step 4: Style the listing type toggle (Found/Lost)**

```tsx
<View className="flex-row bg-separator dark:bg-separator-dk rounded-xl p-1 mb-4">
  {(["found", "lost"] as const).map((type) => (
    <TouchableOpacity
      key={type}
      onPress={() => setListingType(type)}
      className={`flex-1 py-2.5 rounded-lg items-center ${listingType === type ? "bg-primary dark:bg-primary-dk" : ""}`}
    >
      <Text className={`text-sm font-bold ${listingType === type ? "text-white" : "text-subtext dark:text-subtext-dk"}`}>
        {type === "found" ? "Found" : "Lost"}
      </Text>
    </TouchableOpacity>
  ))}
</View>
```

- [ ] **Step 5: Style submit button**

```tsx
<TouchableOpacity
  className={`bg-primary dark:bg-primary-dk rounded-xl p-4 items-center mt-2 ${loading ? "opacity-60" : ""}`}
  onPress={handleSubmit}
  disabled={loading}
>
  {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-base">Post Listing</Text>}
</TouchableOpacity>
```

- [ ] **Step 6: Remove StyleSheet.create block**

- [ ] **Step 7: Verify CreatePostModal**

Tap (+) tab — sheet slides up with spring animation, handle bar visible, form fields styled, close button works.

- [ ] **Step 8: Commit**

```bash
git add mobile/components/CreatePostModal.tsx
git commit -m "feat: redesign CreatePostModal as bottom sheet with NativeWind"
```

---

## Task 16: Redesign ItemDetailModal

**Files:**
- Modify: `mobile/components/ItemDetailModal.tsx`

- [ ] **Step 1: Read full ItemDetailModal.tsx before modifying**

- [ ] **Step 2: Import BottomSheet and replace Modal wrapper**

```tsx
import BottomSheet from "./BottomSheet";

// Replace outer Modal with:
<BottomSheet visible={!!item} onClose={onClose} heightFraction={0.88}>
  <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
    {/* Image hero at top */}
    {item?.image_url ? (
      <Image
        source={{ uri: item.image_url }}
        className="w-full h-52"
        resizeMode="cover"
      />
    ) : (
      <View className="w-full h-40 bg-separator dark:bg-separator-dk items-center justify-center">
        <Ionicons name="image-outline" size={40} color={t.muted} />
      </View>
    )}

    {/* Content */}
    <View className="p-5">
      <Text className="text-2xl font-black text-ink dark:text-ink-dk mb-1">{item?.title}</Text>
      {/* badges */}
      <View className="flex-row gap-2 mb-4 flex-wrap">
        <View className="px-3 py-1 rounded-full" style={{ backgroundColor: LISTING_TYPE_COLORS[item?.listing_type] + "22" }}>
          <Text className="text-xs font-bold" style={{ color: LISTING_TYPE_COLORS[item?.listing_type] }}>
            {LISTING_TYPE_LABELS[item?.listing_type]}
          </Text>
        </View>
        <View className="px-3 py-1 rounded-full bg-separator dark:bg-separator-dk">
          <Text className="text-xs font-semibold text-subtext dark:text-subtext-dk">{item?.category}</Text>
        </View>
      </View>

      {/* Details card */}
      <View className="rounded-2xl bg-card dark:bg-card-dk border border-border dark:border-border-dk p-4 mb-4">
        {/* ... item description, location, poster info rows ... */}
      </View>

      {/* Action buttons */}
      <View className="gap-3">
        {/* Claim/Resolve button */}
        <TouchableOpacity className="bg-primary dark:bg-primary-dk rounded-xl p-4 items-center" onPress={onClaim}>
          <Text className="text-white font-bold">Mark as Resolved</Text>
        </TouchableOpacity>
        {/* Report button */}
        <TouchableOpacity className="border border-red-500/30 rounded-xl p-4 items-center" onPress={onReport}>
          <Text className="text-red-500 font-semibold text-sm">Report</Text>
        </TouchableOpacity>
      </View>
    </View>
  </ScrollView>
</BottomSheet>
```

Preserve ALL existing `onClaim`, `onReport` logic and conditional rendering.

- [ ] **Step 3: Remove StyleSheet.create block**

- [ ] **Step 4: Verify ItemDetailModal**

Tap a listing card in Feed — sheet slides up, image appears at top, details below, claim/report buttons work.

- [ ] **Step 5: Commit**

```bash
git add mobile/components/ItemDetailModal.tsx
git commit -m "feat: redesign ItemDetailModal with image hero bottom sheet"
```

---

## Task 17: Redesign ReportModal

**Files:**
- Modify: `mobile/components/ReportModal.tsx`

- [ ] **Step 1: Read full ReportModal.tsx**

- [ ] **Step 2: Replace Modal with BottomSheet, apply NativeWind**

```tsx
import BottomSheet from "./BottomSheet";

<BottomSheet visible={visible} onClose={onClose} heightFraction={0.6}>
  <View className="p-5">
    <Text className="text-xl font-black text-ink dark:text-ink-dk mb-1">Report</Text>
    <Text className="text-sm text-subtext dark:text-subtext-dk mb-5">{targetLabel}</Text>

    {/* Reason options — pill rows */}
    {REPORT_REASONS.map((reason) => (
      <TouchableOpacity
        key={reason}
        onPress={() => setSelectedReason(reason)}
        className={`flex-row items-center px-4 py-3.5 rounded-xl mb-2 border ${
          selectedReason === reason
            ? "bg-primary/10 dark:bg-primary-dk/10 border-primary dark:border-primary-dk"
            : "bg-card dark:bg-card-dk border-border dark:border-border-dk"
        }`}
      >
        <View className={`w-4 h-4 rounded-full border-2 mr-3 ${
          selectedReason === reason
            ? "border-primary dark:border-primary-dk bg-primary dark:bg-primary-dk"
            : "border-muted dark:border-muted-dk"
        }`} />
        <Text className={`text-sm font-semibold ${
          selectedReason === reason ? "text-primary dark:text-primary-dk" : "text-ink dark:text-ink-dk"
        }`}>
          {reason}
        </Text>
      </TouchableOpacity>
    ))}

    {/* Details input */}
    <TextInput
      className="bg-input-bg dark:bg-input-bg-dk border border-input-border dark:border-input-border-dk rounded-xl px-4 py-3 text-sm text-ink dark:text-ink-dk mt-2 mb-4"
      placeholder="Additional details (optional)"
      placeholderTextColor={t.muted}
      value={details}
      onChangeText={setDetails}
      multiline
      numberOfLines={3}
    />

    <TouchableOpacity
      className={`bg-red-500 rounded-xl p-4 items-center ${!selectedReason ? "opacity-40" : ""}`}
      onPress={handleSubmit}
      disabled={!selectedReason}
    >
      <Text className="text-white font-bold">Submit Report</Text>
    </TouchableOpacity>
  </View>
</BottomSheet>
```

Adapt variable names to match existing state (`selectedReason`, `details`, `handleSubmit`, `REPORT_REASONS`).

- [ ] **Step 3: Remove StyleSheet.create block**

- [ ] **Step 4: Commit**

```bash
git add mobile/components/ReportModal.tsx
git commit -m "feat: redesign ReportModal as bottom sheet with pill reason options"
```

---

## Task 18: Redesign PickerModal

**Files:**
- Modify: `mobile/components/PickerModal.tsx`

- [ ] **Step 1: Read full PickerModal.tsx**

- [ ] **Step 2: Replace with BottomSheet + pill option rows**

```tsx
import BottomSheet from "./BottomSheet";

<BottomSheet visible={visible} onClose={onClose} heightFraction={0.5}>
  <View className="px-5 pt-2 pb-4">
    <Text className="text-lg font-black text-ink dark:text-ink-dk mb-4">{title}</Text>
    {options.map((option) => (
      <TouchableOpacity
        key={option.value ?? option}
        onPress={() => { onSelect(option); onClose(); }}
        className={`flex-row items-center justify-between px-4 py-3.5 rounded-xl mb-2 border ${
          selected === (option.value ?? option)
            ? "bg-primary/10 dark:bg-primary-dk/10 border-primary dark:border-primary-dk"
            : "bg-card dark:bg-card-dk border-border dark:border-border-dk"
        }`}
      >
        <Text className={`text-sm font-semibold ${
          selected === (option.value ?? option)
            ? "text-primary dark:text-primary-dk"
            : "text-ink dark:text-ink-dk"
        }`}>
          {option.label ?? option}
        </Text>
        {selected === (option.value ?? option) && (
          <Ionicons name="checkmark" size={18} color={t.accent} />
        )}
      </TouchableOpacity>
    ))}
  </View>
</BottomSheet>
```

Adapt `option.value`, `option.label` to whatever shape `PickerModal` currently expects (might be plain strings).

- [ ] **Step 3: Remove StyleSheet.create block**

- [ ] **Step 4: Commit**

```bash
git add mobile/components/PickerModal.tsx
git commit -m "feat: redesign PickerModal as bottom sheet with pill option rows"
```

---

## Task 19: Redesign TermsModal

**Files:**
- Modify: `mobile/components/TermsModal.tsx`

- [ ] **Step 1: Read full TermsModal.tsx**

- [ ] **Step 2: Replace with BottomSheet**

```tsx
import BottomSheet from "./BottomSheet";

<BottomSheet visible={visible} onClose={onClose} heightFraction={0.85}>
  <View className="flex-row items-center justify-between px-5 pb-4">
    <Text className="text-xl font-black text-ink dark:text-ink-dk">Terms of Service</Text>
    <TouchableOpacity onPress={onClose} hitSlop={8}>
      <Ionicons name="close" size={22} color={t.muted} />
    </TouchableOpacity>
  </View>

  <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
    {/* All existing terms text preserved exactly */}
    {/* Wrap each section in: */}
    <Text className="text-sm text-subtext dark:text-subtext-dk leading-6 mb-4">
      {termsContent}
    </Text>
  </ScrollView>

  {/* Accept button (if TermsModal has onAccept prop) */}
  {onAccept && (
    <View className="px-5 pt-3 pb-4 border-t border-separator dark:border-separator-dk">
      <TouchableOpacity
        className="bg-primary dark:bg-primary-dk rounded-xl p-4 items-center"
        onPress={onAccept}
      >
        <Text className="text-white font-bold">Accept & Continue</Text>
      </TouchableOpacity>
    </View>
  )}
</BottomSheet>
```

Preserve all existing props (`visible`, `onClose`, `onAccept` if it exists) and terms text content.

- [ ] **Step 3: Remove StyleSheet.create block**

- [ ] **Step 4: Commit**

```bash
git add mobile/components/TermsModal.tsx
git commit -m "feat: redesign TermsModal as scrollable bottom sheet"
```

---

## Task 20: Final Verification

- [ ] **Step 1: Full flow test — Auth**
  - Open app logged out → Login screen: gradient background, logo visible, pill switcher (Sign In / Sign Up)
  - Tap Sign Up → name fields appear
  - Tap Sign In → name fields hide
  - Forgot password → matches login screen style

- [ ] **Step 2: Full flow test — Navigation**
  - All 5 tabs: Feed, Maps, (+), Messages, Settings
  - (+) opens CreatePostModal as bottom sheet
  - Settings tab loads (no back button)
  - Cross-fade between tabs feels smooth

- [ ] **Step 3: Full flow test — Feed**
  - Cards render with new rounded glass style
  - No FAB/create button in Feed
  - Search bar has icon prefix
  - Category pills active/inactive states correct
  - Tap a card → ItemDetailModal slides up with image hero
  - Report from detail → ReportModal slides up

- [ ] **Step 4: Full flow test — Map SAFE ZONE**
  - Map loads, markers appear
  - Touch map → scroll doesn't fight
  - Radius slider works
  - Search filters work
  - Container/search bar/drawer cards have new styling

- [ ] **Step 5: Full flow test — Modals**
  - All 5 modals slide up with spring animation
  - Handle bar visible on all
  - Backdrop tap dismisses each modal
  - All modal forms functional (no regressions)

- [ ] **Step 6: Theme toggle**
  - Tap theme icon in ScreenHeader → cycles auto/light/dark
  - All screens switch cleanly
  - StatusBar is readable in both modes (white on dark, black on light)
  - OfflineBanner renders as pill when offline

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete mobile UI makeover with NativeWind, 5-tab nav, bottom sheet modals"
```

---

## Self-Review Notes

- ✅ All 6 design phases covered across 20 tasks
- ✅ NativeWind setup complete with type declarations
- ✅ Dark class wired through ThemeProvider
- ✅ Map safe zone enforced — only containers touched
- ✅ No nested modal violations — all modals use BottomSheet which wraps RN `<Modal>`
- ✅ `paddingBottom: 100` on all tab screen lists
- ✅ `href: null` on dummy create tab prevents navigation
- ✅ `CreatePostContext` lifts modal state cleanly
- ✅ All auth text preserved, logo kept
- ✅ TermsModal `onAccept` prop preserved for signup flow
- ✅ `registerOnItemCreated` in feed.tsx replaces old `setItems` callback
