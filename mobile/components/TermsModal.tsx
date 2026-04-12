import { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity,
  ScrollView, NativeSyntheticEvent, NativeScrollEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import BottomSheet from "./BottomSheet";

const SECTIONS = [
  { title: "1. Disclaimer", content: "Lost & Hound is a student-made project created as part of Oasis @ Northeastern University. This platform is not officially affiliated with or endorsed by Northeastern University\u2014it is an independent student initiative. Users acknowledge that Lost & Hound is maintained by students and may have limitations or changes without notice." },
  { title: "2. Eligibility", content: "Lost & Hound is designed for Northeastern University students. You must register using a valid @northeastern.edu email address. By creating an account, you confirm that you are affiliated with Northeastern University and that the information you provide is accurate." },
  { title: "3. Platform Purpose & Limitations", content: "Lost & Hound is a community-powered platform that connects people who have found lost items with people who may have lost them. The platform serves solely as a communication tool and bulletin board. Lost & Hound does not verify ownership of any items, does not facilitate the physical exchange of items, and does not guarantee that any lost item will be recovered." },
  { title: "4. No False Claims & Code of Conduct", content: "You agree not to falsely claim ownership of items that do not belong to you. Falsely claiming an item is a violation of these Terms and may constitute theft under applicable law. You agree not to post fraudulent, misleading, or deceptive listings. Violations may result in immediate account suspension and permanent bans." },
  { title: "5. Messaging & Harassment Policy", content: "The in-app messaging system is provided solely for communication related to lost and found items. You agree not to use messaging for harassment, threats, intimidation, stalking, solicitation, spam, or any form of abusive behavior. All messages are subject to review by moderators in the event of a report." },
  { title: "6. Safety & Liability Disclaimer", content: "LOST & HOUND, ITS CREATORS, DEVELOPERS, AND OPERATORS ARE NOT RESPONSIBLE FOR ANY LOSS, THEFT, DAMAGE, INJURY, OR HARM OF ANY KIND ARISING FROM THE USE OF THIS PLATFORM. You acknowledge that all interactions with other users, including in-person meetings for item exchanges, are conducted entirely at your own risk." },
  { title: "7. Assumption of Risk", content: "By using Lost & Hound, you expressly acknowledge and agree that you assume all risks associated with using this platform, communicating with other users, and any in-person interactions that result from using this platform." },
  { title: "8. Moderation & Ban Policy", content: "Lost & Hound employs moderators who have the authority to review reported content, remove listings or messages that violate these Terms, and issue temporary or permanent bans. Moderation decisions are made at the sole discretion of the moderation team." },
  { title: "9. Data Handling & Privacy", content: "When you create an account, we store your first name, last name, email address, and campus preference. Your data is stored securely using Supabase infrastructure. We do not sell, share, or distribute your personal information to third parties. You may delete your account at any time through the Settings page." },
  { title: "10. Indemnification", content: "You agree to indemnify, defend, and hold harmless Lost & Hound, its creators, developers, operators, and contributors from any claims, damages, losses, liabilities, costs, or expenses arising from your use of the platform or your violation of these Terms." },
  { title: "11. Limitation of Liability", content: "TO THE MAXIMUM EXTENT PERMITTED BY LAW, LOST & HOUND AND ITS CREATORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. THE PLATFORM IS PROVIDED \"AS IS\" AND \"AS AVAILABLE\" WITHOUT WARRANTIES OF ANY KIND." },
  { title: "12. Changes to Terms", content: "We reserve the right to modify these Terms at any time. Continued use of Lost & Hound after changes are posted constitutes your acceptance of the updated Terms." },
  { title: "13. Governing Law", content: "These Terms shall be governed by and construed in accordance with the laws of the Commonwealth of Massachusetts. Any disputes shall be subject to the exclusive jurisdiction of the courts located in Suffolk County, Massachusetts." },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onAccept?: () => void;
  readOnly?: boolean;
}

export default function TermsModal({ visible, onClose, onAccept, readOnly = false }: Props) {
  const { t } = useTheme();
  const [accepted, setAccepted] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setAccepted(false);
      setScrolledToBottom(false);
    }
  }, [visible]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const atBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
    if (atBottom) setScrolledToBottom(true);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} heightFraction={0.85}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pb-4" style={{ borderBottomWidth: 1, borderBottomColor: t.separator }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", backgroundColor: t.isDark ? "rgba(255,69,0,0.16)" : "rgba(168,77,72,0.08)" }}>
            <Ionicons name="document-text" size={20} color={t.accent} />
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: "900", color: t.text }}>Terms & Conditions</Text>
            <Text style={{ fontSize: 11, fontWeight: "600", color: t.subtext, marginTop: 1 }}>
              {readOnly ? "Review the full terms" : "Please read before creating your account"}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={22} color={t.muted} />
        </TouchableOpacity>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={true}
      >
        <Text style={{ fontSize: 13, lineHeight: 20, marginBottom: 16, color: t.subtext }}>
          {readOnly
            ? "Welcome to Lost & Hound \u2014 a student-made lost and found platform for Northeastern University. Please review the full terms and conditions below."
            : "Welcome to Lost & Hound \u2014 a student-made lost and found platform for Northeastern University. By creating an account, you agree to the following terms."}
        </Text>

        {SECTIONS.map((section, i) => (
          <View key={i} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "800", marginBottom: 6, color: t.isDark ? "#FFBEA4" : "#3d2020" }}>
              {section.title}
            </Text>
            <Text style={{ fontSize: 13, lineHeight: 20, color: t.subtext }}>
              {section.content}
            </Text>
            {i < SECTIONS.length - 1 && (
              <View style={{ height: 0.5, marginTop: 16, backgroundColor: t.separator }} />
            )}
          </View>
        ))}

        <View style={{ marginTop: 8, padding: 14, borderRadius: 10, borderWidth: 1, backgroundColor: t.isDark ? "#232324" : "#fdf7f7", borderColor: t.cardBorder }}>
          <Text style={{ fontSize: 11, fontWeight: "700", marginBottom: 4, color: t.subtext }}>Last updated: March 2026</Text>
          <Text style={{ fontSize: 11, color: t.muted }}>If you have questions about these Terms, contact the Lost & Hound team.</Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: t.separator, backgroundColor: t.isDark ? "#161617" : "#faf8f8" }}>
        {!readOnly && !scrolledToBottom && (
          <Text style={{ textAlign: "center", fontSize: 11, fontWeight: "600", marginBottom: 8, color: t.muted }}>
            ↓ Scroll to the bottom to continue
          </Text>
        )}

        {readOnly ? (
          <TouchableOpacity
            style={{ borderRadius: 12, paddingVertical: 14, alignItems: "center", backgroundColor: t.accent }}
            onPress={onClose}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Close</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}
              onPress={() => { if (scrolledToBottom) setAccepted(!accepted); }}
              activeOpacity={scrolledToBottom ? 0.7 : 1}
            >
              <View style={[
                { width: 22, height: 22, borderRadius: 6, borderWidth: 2, justifyContent: "center", alignItems: "center" },
                !scrolledToBottom && { borderColor: t.isDark ? "#4A4A4B" : "#ddd" },
                scrolledToBottom && { borderColor: t.accent },
                accepted && { backgroundColor: t.accent, borderColor: t.accent },
              ]}>
                {accepted && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={[
                { fontSize: 13, fontWeight: "600", flex: 1 },
                { color: scrolledToBottom ? t.text : (t.isDark ? "#787A7C" : "#bbb") },
              ]}>
                I have read and agree to the Terms & Conditions
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
                { backgroundColor: accepted ? t.accent : (t.isDark ? "#37383A" : "#e0d6d6") },
              ]}
              onPress={() => { if (accepted) { onAccept?.(); onClose(); } }}
              disabled={!accepted}
              activeOpacity={accepted ? 0.7 : 1}
            >
              <Text style={[
                { color: "#fff", fontWeight: "700", fontSize: 15 },
                !accepted && { color: t.isDark ? "#808285" : "#aaa" },
              ]}>
                Accept & Create Account
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </BottomSheet>
  );
}
