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
  withTiming,
  useAnimatedStyle,
  runOnJS,
  Easing,
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
      translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
    }
  }, [visible]);

  const handleClose = () => {
    translateY.value = withTiming(sheetHeight, { duration: 250, easing: Easing.in(Easing.cubic) }, (finished) => {
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
