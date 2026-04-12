import { useState } from "react";
import { useTimezone } from "../../contexts/TimezoneContext";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../utils/supabaseClient";
import apiFetch from "../../utils/apiFetch";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import ScreenHeader from "../../components/ScreenHeader";
import { CAMPUSES } from "../../constants/campuses";
import TermsModal from "../../components/TermsModal";
import { TIME_ZONE_OPTIONS } from "../../utils/timezone";

const NAME_MAX_LENGTH = 25;

export default function SettingsScreen() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, profile, updateProfile, logout } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [savingName, setSavingName] = useState(false);

  const [passwordStep, setPasswordStep] = useState<"idle" | "verify" | "change">("idle");
  const [currentPassword, setCurrentPassword] = useState("");
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [savingCampus, setSavingCampus] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const { timezone, setTimezone } = useTimezone();

  const handleSaveName = async () => {
    if (!firstName.trim() || !lastName.trim()) return;
    setSavingName(true);
    try {
      await apiFetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ first_name: firstName.trim(), last_name: lastName.trim() }),
      });
      updateProfile({ first_name: firstName.trim(), last_name: lastName.trim() });
      setEditingName(false);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update name.");
    }
    setSavingName(false);
  };

  const handleVerifyCurrentPassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert("Error", "Please enter your current password.");
      return;
    }
    setVerifyingPassword(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: user?.email,
        password: currentPassword,
      });
      if (error) throw error;
      setPasswordStep("change");
      setCurrentPassword("");
    } catch (err: any) {
      Alert.alert("Verification Failed", "Incorrect password.");
    }
    setVerifyingPassword(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      });
      Alert.alert("Success", "Password updated successfully.");
      setPasswordStep("idle");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to change password.");
    }
    setSavingPassword(false);
  };

  const handleCampusChange = async (campusId: string) => {
    setSavingCampus(true);
    try {
      await apiFetch("/api/profile/campus", {
        method: "PATCH",
        body: JSON.stringify({ default_campus: campusId }),
      });
      updateProfile({ default_campus: campusId });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update campus.");
    }
    setSavingCampus(false);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account, all your listings, messages, and data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch("/api/profile", { method: "DELETE" });
              await logout();
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete account.");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dk" edges={["top"]}>
      <ScreenHeader title="Settings" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
      >
        {/* Profile Section */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-muted dark:text-muted-dk uppercase tracking-widest mb-2 px-1">
            Profile
          </Text>
          <View className="rounded-2xl bg-card dark:bg-card-dk border border-border dark:border-border-dk overflow-hidden">
            {/* Email row */}
            <View className="flex-row items-center px-4 py-4 border-b border-separator dark:border-separator-dk">
              <Text className="flex-1 text-sm font-semibold text-ink dark:text-ink-dk">Email</Text>
              <Text className="text-sm text-subtext dark:text-subtext-dk">{user?.email || ""}</Text>
            </View>

            {/* Name row — inline edit or display */}
            {editingName ? (
              <View className="px-4 py-3">
                <View className="flex-row items-center bg-input-bg dark:bg-input-bg-dk border border-input-border dark:border-input-border-dk rounded-xl px-3 mb-2">
                  <TextInput
                    className="flex-1 py-3 text-sm text-ink dark:text-ink-dk"
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="First name"
                    placeholderTextColor={t.muted}
                    maxLength={NAME_MAX_LENGTH}
                  />
                </View>
                <View className="flex-row items-center bg-input-bg dark:bg-input-bg-dk border border-input-border dark:border-input-border-dk rounded-xl px-3 mb-3">
                  <TextInput
                    className="flex-1 py-3 text-sm text-ink dark:text-ink-dk"
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Last name"
                    placeholderTextColor={t.muted}
                    maxLength={NAME_MAX_LENGTH}
                  />
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className="flex-1 py-2.5 rounded-xl bg-card dark:bg-card-dk border border-border dark:border-border-dk items-center"
                    onPress={() => { setEditingName(false); setFirstName(profile?.first_name || ""); setLastName(profile?.last_name || ""); }}
                  >
                    <Text className="text-sm text-subtext dark:text-subtext-dk font-semibold">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 py-2.5 rounded-xl bg-primary dark:bg-primary-dk items-center ${savingName ? "opacity-60" : ""}`}
                    onPress={handleSaveName}
                    disabled={savingName}
                  >
                    {savingName ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-white font-bold text-sm">Save</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                className="flex-row items-center px-4 py-4"
                onPress={() => setEditingName(true)}
              >
                <Text className="flex-1 text-sm font-semibold text-ink dark:text-ink-dk">Name</Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm text-subtext dark:text-subtext-dk">
                    {profile?.first_name} {profile?.last_name}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={t.muted} />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Security Section */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-muted dark:text-muted-dk uppercase tracking-widest mb-2 px-1">
            Security
          </Text>
          <View className="rounded-2xl bg-card dark:bg-card-dk border border-border dark:border-border-dk overflow-hidden">
            {passwordStep === "idle" ? (
              <TouchableOpacity
                className="flex-row items-center px-4 py-4"
                onPress={() => setPasswordStep("verify")}
              >
                <Text className="flex-1 text-sm font-semibold text-ink dark:text-ink-dk">Change Password</Text>
                <Ionicons name="chevron-forward" size={16} color={t.muted} />
              </TouchableOpacity>
            ) : passwordStep === "verify" ? (
              <View className="px-4 py-3">
                <Text className="text-sm font-semibold text-subtext dark:text-subtext-dk mb-3">
                  Enter your current password to continue
                </Text>
                <View className="flex-row items-center bg-input-bg dark:bg-input-bg-dk border border-input-border dark:border-input-border-dk rounded-xl px-3 mb-3">
                  <TextInput
                    className="flex-1 py-3 text-sm text-ink dark:text-ink-dk"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Current password"
                    placeholderTextColor={t.muted}
                    secureTextEntry
                    autoFocus
                  />
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className="flex-1 py-2.5 rounded-xl bg-card dark:bg-card-dk border border-border dark:border-border-dk items-center"
                    onPress={() => { setPasswordStep("idle"); setCurrentPassword(""); }}
                  >
                    <Text className="text-sm text-subtext dark:text-subtext-dk font-semibold">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 py-2.5 rounded-xl bg-primary dark:bg-primary-dk items-center ${verifyingPassword ? "opacity-60" : ""}`}
                    onPress={handleVerifyCurrentPassword}
                    disabled={verifyingPassword}
                  >
                    {verifyingPassword ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-white font-bold text-sm">Verify</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View className="px-4 py-3">
                <View className="flex-row items-center bg-input-bg dark:bg-input-bg-dk border border-input-border dark:border-input-border-dk rounded-xl px-3 mb-2">
                  <TextInput
                    className="flex-1 py-3 text-sm text-ink dark:text-ink-dk"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="New password"
                    placeholderTextColor={t.muted}
                    secureTextEntry
                  />
                </View>
                <View className="flex-row items-center bg-input-bg dark:bg-input-bg-dk border border-input-border dark:border-input-border-dk rounded-xl px-3 mb-3">
                  <TextInput
                    className="flex-1 py-3 text-sm text-ink dark:text-ink-dk"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm password"
                    placeholderTextColor={t.muted}
                    secureTextEntry
                  />
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className="flex-1 py-2.5 rounded-xl bg-card dark:bg-card-dk border border-border dark:border-border-dk items-center"
                    onPress={() => { setPasswordStep("idle"); setNewPassword(""); setConfirmPassword(""); }}
                  >
                    <Text className="text-sm text-subtext dark:text-subtext-dk font-semibold">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 py-2.5 rounded-xl bg-primary dark:bg-primary-dk items-center ${savingPassword ? "opacity-60" : ""}`}
                    onPress={handleChangePassword}
                    disabled={savingPassword}
                  >
                    {savingPassword ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-white font-bold text-sm">Update</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Preferences Section */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-muted dark:text-muted-dk uppercase tracking-widest mb-2 px-1">
            Preferences
          </Text>
          <View className="rounded-2xl bg-card dark:bg-card-dk border border-border dark:border-border-dk overflow-hidden">
            {/* Campus row */}
            <View className="px-4 py-4 border-b border-separator dark:border-separator-dk">
              <Text className="text-sm font-semibold text-ink dark:text-ink-dk mb-3">Default Campus</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {CAMPUSES.map((c: any) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => handleCampusChange(c.id)}
                    disabled={savingCampus}
                    className={`px-3 py-1.5 rounded-full border ${
                      profile?.default_campus === c.id
                        ? "bg-primary dark:bg-primary-dk border-primary dark:border-primary-dk"
                        : "bg-card dark:bg-card-dk border-border dark:border-border-dk"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        profile?.default_campus === c.id
                          ? "text-white"
                          : "text-subtext dark:text-subtext-dk"
                      }`}
                    >
                      {c.name}, {c.state}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Timezone row */}
            <View className="px-4 py-4">
              <Text className="text-sm font-semibold text-ink dark:text-ink-dk mb-3">Time Zone</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {TIME_ZONE_OPTIONS.map((tz: any) => {
                  const isActive = tz.value === timezone;
                  return (
                    <TouchableOpacity
                      key={tz.value}
                      onPress={() => setTimezone(tz.value)}
                      className={`px-3 py-1.5 rounded-full border ${
                        isActive
                          ? "bg-primary dark:bg-primary-dk border-primary dark:border-primary-dk"
                          : "bg-card dark:bg-card-dk border-border dark:border-border-dk"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isActive ? "text-white" : "text-subtext dark:text-subtext-dk"
                        }`}
                      >
                        {tz.label} ({tz.description})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-muted dark:text-muted-dk uppercase tracking-widest mb-2 px-1">
            About
          </Text>
          <View className="rounded-2xl bg-card dark:bg-card-dk border border-border dark:border-border-dk overflow-hidden">
            <TouchableOpacity
              className="flex-row items-center px-4 py-4 border-b border-separator dark:border-separator-dk"
              onPress={() => Alert.alert("Credits", "Lost & Hound was built by Nahom Hailemelekot, Benjamin Hailu, Liam Pulsifer, and Ryan Sinha.\n\nProject context: Oasis @ Northeastern University.")}
            >
              <Ionicons name="people-outline" size={18} color={t.muted} style={{ marginRight: 10 }} />
              <Text className="flex-1 text-sm font-semibold text-ink dark:text-ink-dk">Credits</Text>
              <Ionicons name="chevron-forward" size={16} color={t.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center px-4 py-4 border-b border-separator dark:border-separator-dk"
              onPress={() => Alert.alert("Disclaimer", "Lost & Hound is a student-made project created as part of Oasis @ Northeastern University.\n\nThis project is not affiliated with, endorsed by, or related to Northeastern University. It is an independent student initiative.")}
            >
              <Ionicons name="information-circle-outline" size={18} color={t.muted} style={{ marginRight: 10 }} />
              <Text className="flex-1 text-sm font-semibold text-ink dark:text-ink-dk">Disclaimer</Text>
              <Ionicons name="chevron-forward" size={16} color={t.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center px-4 py-4 border-b border-separator dark:border-separator-dk"
              onPress={() => setTermsOpen(true)}
            >
              <Ionicons name="document-text-outline" size={18} color={t.muted} style={{ marginRight: 10 }} />
              <Text className="flex-1 text-sm font-semibold text-ink dark:text-ink-dk">Terms & Conditions</Text>
              <Ionicons name="chevron-forward" size={16} color={t.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center px-4 py-4"
              onPress={() => Alert.alert("Privacy & Data", "We store account profile information and app content needed to operate Lost & Hound, including listings and messages.\n\nData may be reviewed by moderators only when reports are submitted or policy enforcement is required.\n\nYou can request account removal from Settings, subject to moderation and legal retention requirements.")}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color={t.muted} style={{ marginRight: 10 }} />
              <Text className="flex-1 text-sm font-semibold text-ink dark:text-ink-dk">Privacy & Data</Text>
              <Ionicons name="chevron-forward" size={16} color={t.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Danger Zone — outside all cards */}
        <TouchableOpacity
          className="mt-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 items-center"
          onPress={logout}
        >
          <Text className="text-red-500 font-bold text-sm">Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="mt-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 items-center"
          onPress={handleDeleteAccount}
        >
          <Text className="text-red-500 font-bold text-sm">Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>

      <TermsModal visible={termsOpen} onClose={() => setTermsOpen(false)} readOnly />
    </SafeAreaView>
  );
}
