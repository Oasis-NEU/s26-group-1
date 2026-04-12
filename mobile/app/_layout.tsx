import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import { ItemsProvider } from "../contexts/ItemsContext";
import { TimezoneProvider } from "../contexts/TimezoneContext";
import { ConversationsProvider } from "../contexts/ConversationsContext";
import { CreatePostProvider } from "../contexts/CreatePostContext";
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
              <CreatePostProvider>
                <OfflineBanner />
                <AuthGate />
              </CreatePostProvider>
            </ConversationsProvider>
          </ItemsProvider>
        </TimezoneProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
