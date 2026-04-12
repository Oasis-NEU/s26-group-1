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
