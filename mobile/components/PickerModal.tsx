import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import BottomSheet from "./BottomSheet";

interface Option {
  label: string;
  value: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: Option[];
  selected: string;
  onSelect: (value: string) => void;
}

export default function PickerModal({ visible, onClose, title, options, selected, onSelect }: Props) {
  const { t } = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose} heightFraction={0.5}>
      <View className="px-5 pt-2 pb-4">
        <Text className="text-lg font-black text-ink dark:text-ink-dk mb-4">{title}</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {options.map((option) => {
            const isSelected = selected === option.value;

            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => { onSelect(option.value); onClose(); }}
                className={`flex-row items-center justify-between px-4 py-3.5 rounded-xl mb-2 border ${
                  isSelected
                    ? "bg-primary/10 dark:bg-primary-dk/10 border-primary dark:border-primary-dk"
                    : "bg-card dark:bg-card-dk border-border dark:border-border-dk"
                }`}
              >
                <Text className={`text-sm font-semibold ${
                  isSelected ? "text-primary dark:text-primary-dk" : "text-ink dark:text-ink-dk"
                }`}>
                  {option.label}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark" size={18} color={t.accent} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </BottomSheet>
  );
}
