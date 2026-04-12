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
    <View className="flex-row items-center px-3 py-2 border-b border-separator dark:border-separator-dk">
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
