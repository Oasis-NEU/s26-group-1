import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { supabase } from "../../utils/supabaseClient";
import { useTheme } from "../../contexts/ThemeContext";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setMessage("");

    if (!email.endsWith("@northeastern.edu")) {
      setError("You must use a @northeastern.edu email address.");
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
      if (resetError) throw resetError;
      setMessage("Check your email for a password reset link.");
    } catch (err: any) {
      setError(err.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#1a0a0a", "#030303", "#0a0505"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo + Brand */}
          <View className="items-center mb-7">
            <Image
              source={require("../../assets/AppLogo.jpeg")}
              className="w-20 h-20 rounded-2xl mb-3"
              resizeMode="contain"
            />
            <Text className="text-2xl font-black text-white tracking-wide">Lost & Hound</Text>
          </View>

          {/* Glass Card */}
          <BlurView
            intensity={25}
            tint="dark"
            style={{ borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }}
          >
            <View className="p-6">
              <Text className="text-xl font-extrabold text-white mb-1">Reset Password</Text>
              <Text className="text-sm text-white/60 mb-5">
                Enter your Northeastern email and we'll send you a reset link.
              </Text>

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
                />
              </View>

              {error ? <Text className="text-red-300 text-sm mb-2 font-semibold">{error}</Text> : null}
              {message ? <Text className="text-green-300 text-sm mb-2 font-semibold">{message}</Text> : null}

              <TouchableOpacity
                className={`bg-primary rounded-xl p-4 items-center mt-2 ${loading ? "opacity-60" : ""}`}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-base">Send Reset Link</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.back()} className="mt-4 items-center">
                <Text className="text-white/70 font-bold text-sm">Back to sign in</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
