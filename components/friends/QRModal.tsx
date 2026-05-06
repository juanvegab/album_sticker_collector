import { useState } from "react";
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
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

  const inviteUrl = `${INVITE_BASE}/${user?.id ?? ""}`;

  async function handleBarCodeScanned({ data }: { data: string }) {
    if (scanned || sending) return;
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
          { text: t("common.ok"), onPress: () => setScanned(false) },
        ]);
        return;
      }

      // Check if already friends
      if (friendProfile.friends?.includes(user.id)) {
        Alert.alert(t("friends.alreadyFriends"), friendProfile.name, [
          { text: t("common.ok"), onPress: () => setScanned(false) },
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
        { text: t("common.ok"), onPress: () => setScanned(false) },
      ]);
    } finally {
      setSending(false);
      // Do NOT reset scanned here — only reset via Alert callbacks above
      // to prevent the camera from re-firing while an Alert is visible
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
            <Text className="text-xs text-gray-400 mt-6 text-center">{inviteUrl}</Text>
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
            ) : (
              <View className="flex-1 relative">
                <CameraView
                  style={{ flex: 1 }}
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
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
                    {sending ? t("friends.sending") : t("friends.scanHint")}
                  </Text>
                </View>
                {sending && (
                  <View className="absolute inset-0 bg-black/30 items-center justify-center">
                    <ActivityIndicator size="large" color="white" />
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}
