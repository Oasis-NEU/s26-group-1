import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import apiFetch from "../utils/apiFetch";
import { successHaptic } from "../utils/haptics";
import BottomSheet from "./BottomSheet";

const REPORT_REASON_MAX_LENGTH = 50;
const REPORT_DETAILS_MAX_LENGTH = 250;

const POST_REASONS = [
  "Stolen item / theft concern",
  "False or misleading listing",
  "Inappropriate content",
  "Spam",
  "Already resolved / duplicate",
  "Other",
];

const USER_REASONS = [
  "Stolen item / theft concern",
  "Harassment or threatening behavior",
  "Scam or fraud attempt",
  "Impersonation",
  "Inappropriate messages",
  "Other",
];

interface Props {
  visible: boolean;
  onClose: () => void;
  type: "post" | "user";
  targetId: string;
  targetLabel: string;
}

export default function ReportModal({ visible, onClose, type, targetId, targetLabel }: Props) {
  const { t } = useTheme();
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const reasons = type === "post" ? POST_REASONS : USER_REASONS;
  const isOther = reason === "Other";
  const isStolen = reason === "Stolen item / theft concern";

  const handleSubmit = async () => {
    if (!reason) return;
    if (isOther && !customReason.trim()) { setError("Please enter a reason."); return; }

    setSubmitting(true);
    setError("");

    const row: any = {
      reason: isOther ? customReason.trim() : reason,
      details: details.trim() || null,
    };
    if (type === "post") row.reported_listing_id = targetId;
    else row.reported_user_id = targetId;

    try {
      await apiFetch("/api/reports", { method: "POST", body: JSON.stringify(row) });
      successHaptic();
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setReason(""); setCustomReason(""); setDetails("");
      setSubmitted(false); setError("");
    }, 200);
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose} heightFraction={0.65}>
      <View className="px-5 pt-2 pb-4 flex-1">
        {submitted ? (
          <View className="flex-1 items-center justify-center gap-3 px-4">
            <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
            <Text className="text-lg font-extrabold text-ink dark:text-ink-dk">Report submitted</Text>
            <Text className="text-sm text-subtext dark:text-subtext-dk text-center leading-5">
              Thanks for helping keep the community safe. We'll review this shortly.
            </Text>
            <TouchableOpacity
              className="bg-primary dark:bg-primary-dk rounded-xl px-8 py-3 mt-2"
              onPress={handleClose}
            >
              <Text className="text-white font-bold text-sm">Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <Text className="text-xl font-black text-ink dark:text-ink-dk mb-1">Report</Text>
            <Text className="text-sm text-subtext dark:text-subtext-dk mb-5">{targetLabel}</Text>

            {/* Reason options */}
            {reasons.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setReason(r)}
                className={`flex-row items-center px-4 py-3.5 rounded-xl mb-2 border ${
                  reason === r
                    ? "bg-primary/10 dark:bg-primary-dk/10 border-primary dark:border-primary-dk"
                    : "bg-card dark:bg-card-dk border-border dark:border-border-dk"
                }`}
              >
                <View className={`w-4 h-4 rounded-full border-2 mr-3 items-center justify-center ${
                  reason === r
                    ? "border-primary dark:border-primary-dk bg-primary dark:bg-primary-dk"
                    : "border-muted dark:border-muted-dk"
                }`} />
                <Text className={`text-sm font-semibold flex-1 ${
                  reason === r ? "text-primary dark:text-primary-dk" : "text-ink dark:text-ink-dk"
                }`}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Stolen item warning */}
            {isStolen && (
              <View className="flex-row items-center gap-2 p-2.5 rounded-lg border border-yellow-300 dark:border-yellow-700/50 bg-yellow-50 dark:bg-yellow-900/20 mb-2">
                <Ionicons name="warning" size={16} color="#f59e0b" />
                <Text className="text-xs font-semibold flex-1 text-yellow-800 dark:text-yellow-300">
                  High priority: select this only if theft is suspected.
                </Text>
              </View>
            )}

            {/* Custom reason input for "Other" */}
            {isOther && (
              <>
                <TextInput
                  className="bg-input-bg dark:bg-input-bg-dk border border-input-border dark:border-input-border-dk rounded-xl px-4 py-3 text-sm text-ink dark:text-ink-dk mt-2"
                  placeholder="Enter report reason"
                  placeholderTextColor={t.muted}
                  value={customReason}
                  onChangeText={(txt) => setCustomReason(txt.slice(0, REPORT_REASON_MAX_LENGTH))}
                  maxLength={REPORT_REASON_MAX_LENGTH}
                />
                <Text className="text-xs text-right mt-0.5 text-muted dark:text-muted-dk">
                  {customReason.length}/{REPORT_REASON_MAX_LENGTH}
                </Text>
              </>
            )}

            {/* Details input */}
            <TextInput
              className="bg-input-bg dark:bg-input-bg-dk border border-input-border dark:border-input-border-dk rounded-xl px-4 py-3 text-sm text-ink dark:text-ink-dk mt-2 mb-1"
              placeholder="Additional details (optional)"
              placeholderTextColor={t.muted}
              value={details}
              onChangeText={(txt) => setDetails(txt.slice(0, REPORT_DETAILS_MAX_LENGTH))}
              multiline
              numberOfLines={3}
              maxLength={REPORT_DETAILS_MAX_LENGTH}
            />
            <Text className="text-xs text-right mb-2 text-muted dark:text-muted-dk">
              {details.length}/{REPORT_DETAILS_MAX_LENGTH}
            </Text>

            {/* Error */}
            {error ? (
              <Text className="text-red-500 text-sm font-semibold mt-1 mb-2">{error}</Text>
            ) : null}

            {/* Submit button */}
            <TouchableOpacity
              className={`bg-red-500 rounded-xl p-4 items-center ${!reason || submitting || (isOther && !customReason.trim()) ? "opacity-40" : ""}`}
              onPress={handleSubmit}
              disabled={!reason || submitting || (isOther && !customReason.trim())}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Submit Report</Text>}
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </BottomSheet>
  );
}
