import { useState, useRef } from "react";
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Alert, Share, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useUser } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { CameraView, useCameraPermissions } from "expo-camera";
import QRCode from "react-native-qrcode-svg";
import { sendFriendRequest, getProfile } from "@/lib/firestore/users";
import { sendPushNotification } from "@/lib/notifications";

const INVITE_BASE = "https://elalbum2026.com/invite";

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Tab = "myQR" | "scan";

export function QRModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { user } = useUser();
  const [tab, setTab] = useState<Tab>("myQR");
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  // Synchronous guard — useRef so it blocks re-entry before React re-renders
  const processingRef = useRef(false);

  async function handleCopyLink() {
    await Clipboard.setStringAsync(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inviteUrl = `${INVITE_BASE}/${user?.id ?? ""}`;

  function resetScan() {
    processingRef.current = false;
    setScanned(false);
    setSending(false);
  }

  async function handleBarCodeScanned({ data }: { data: string }) {
    if (processingRef.current) return;
    processingRef.current = true;
    // Unmount the camera immediately so it stops firing
    setScanned(true);

    // Extract userId from the scanned URL
    // Accepts both elalbum2026.com/invite/{id} and controldepostales://invite/{id}
    const match = data.match(/invite\/([^/?#]+)/);
    const friendId = match?.[1];

    if (!friendId || !user || friendId === user.id) {
      Alert.alert(t("common.error"), t("friends.invalidQR"));
      setScanned(false);
      return;
    }

    setSending(true);
    try {
      const friendProfile = await getProfile(friendId);
      if (!friendProfile) {
        Alert.alert(t("common.error"), t("friends.userNotFound"), [
          { text: t("common.ok"), onPress: resetScan },
        ]);
        return;
      }

      // Check if already friends
      if (friendProfile.friends?.includes(user.id)) {
        Alert.alert(t("friends.alreadyFriends"), friendProfile.name, [
          { text: t("common.ok"), onPress: resetScan },
        ]);
        return;
      }

      const myName = user.firstName ?? user.emailAddresses[0]?.emailAddress ?? t("account.userFallback");
      await sendFriendRequest(user.id, friendId);

      // Notify friend
      if (friendProfile.expoPushToken) {
        await sendPushNotification(
          friendProfile.expoPushToken,
          t("friends.requestTitle", { name: myName }),
          t("friends.requestBody")
        );
      }

      Alert.alert(t("friends.requestSent"), friendProfile.name, [
        { text: t("common.ok"), onPress: onClose },
      ]);
    } catch {
      Alert.alert(t("common.error"), t("friends.requestError"), [
        { text: t("common.ok"), onPress: resetScan },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-6 pb-3 border-b border-gray-100">
          <Text className="text-lg font-bold text-gray-800">{t("friends.addFriend")}</Text>
          <TouchableOpacity onPress={onClose} className="p-2">
            <Text className="text-blue-600 font-semibold">{t("common.cancel")}</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View className="flex-row border-b border-gray-100 px-4 pt-2">
          {(["myQR", "scan"] as Tab[]).map((t_) => (
            <TouchableOpacity
              key={t_}
              onPress={() => setTab(t_)}
              className={`flex-1 pb-2.5 items-center ${tab === t_ ? "border-b-2 border-blue-600" : ""}`}
            >
              <Text className={`font-semibold text-sm ${tab === t_ ? "text-blue-600" : "text-gray-400"}`}>
                {t_ === "myQR" ? t("friends.myQR") : t("friends.scan")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === "myQR" ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-gray-500 text-sm text-center mb-8">
              {t("friends.myQRHint")}
            </Text>
            <View className="p-5 bg-white rounded-3xl shadow-md border border-gray-100">
              <QRCode value={inviteUrl} size={220} />
            </View>

            {/* Link display — tap to copy */}
            <TouchableOpacity
              onPress={handleCopyLink}
              activeOpacity={0.7}
              style={{
                marginTop: 20, width: "100%",
                backgroundColor: "#F0F0F0", borderRadius: 12,
                paddingHorizontal: 14, paddingVertical: 10,
                flexDirection: "row", alignItems: "center", gap: 8,
              }}
            >
              <Text
                style={{ flex: 1, color: "#1A1A1A", fontSize: 12, fontWeight: "600" }}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {inviteUrl}
              </Text>
              <FontAwesome
                name={copied ? "check" : "copy"}
                size={14}
                color={copied ? "#16A34A" : "#6B7280"}
              />
            </TouchableOpacity>

            {/* Share link button */}
            <TouchableOpacity
              onPress={() =>
                Share.share(
                  Platform.OS === "ios"
                    ? { url: inviteUrl }
                    : { message: inviteUrl }
                )
              }
              style={{
                marginTop: 12, width: "100%",
                backgroundColor: "#2563EB", borderRadius: 12,
                flexDirection: "row", alignItems: "center", justifyContent: "center",
                paddingVertical: 13, gap: 8,
              }}
              activeOpacity={0.8}
            >
              <FontAwesome name="share-alt" size={15} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
                {t("friends.invite")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-1">
            {!permission?.granted ? (
              <View className="flex-1 items-center justify-center px-8">
                <Text className="text-gray-500 text-base text-center mb-6">
                  {t("friends.cameraPermission")}
                </Text>
                <TouchableOpacity
                  onPress={requestPermission}
                  className="bg-blue-600 rounded-2xl py-3 px-8"
                >
                  <Text className="text-white font-bold">{t("friends.allowCamera")}</Text>
                </TouchableOpacity>
              </View>
            ) : scanned ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#2563eb" />
                <Text className="text-gray-500 text-sm mt-4">{t("friends.sending")}</Text>
              </View>
            ) : (
              <View className="flex-1 relative">
                <CameraView
                  style={{ flex: 1 }}
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={handleBarCodeScanned}
                />
                {/* Scan frame overlay */}
                <View className="absolute inset-0 items-center justify-center">
                  <View
                    style={{
                      width: 240, height: 240,
                      borderWidth: 2, borderColor: "white", borderRadius: 16,
                    }}
                  />
                </View>
                <View className="absolute bottom-10 left-0 right-0 items-center">
                  <Text className="text-white text-sm font-medium bg-black/40 px-4 py-2 rounded-full">
                    {t("friends.scanHint")}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}
