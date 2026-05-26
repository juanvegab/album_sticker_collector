import "../global.css";
import { useEffect, useState } from "react";
import { Linking } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ClerkProvider, ClerkLoaded, useAuth, useUser } from "@clerk/clerk-expo";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useFirebaseUser } from "@/hooks/useFirebaseUser";
import { usePremium } from "@/hooks/usePremium";
import { useFeatureFlagsStore } from "@/store/featureFlagsStore";
import { initI18n } from "@/lib/i18n";
import { createOrUpdateProfile } from "@/lib/firestore/users";
import { SplashView } from "@/components/SplashView";
import Toast from "react-native-toast-message";

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

SplashScreen.preventAutoHideAsync();

const tokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, value: string) {
    return SecureStore.setItemAsync(key, value);
  },
  async clearToken(key: string) {
    return SecureStore.deleteItemAsync(key);
  },
};

function AppRoot() {
  useFirebaseAuth();
  const fbUser = useFirebaseUser();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const segments = useSegments();
  const router = useRouter();
  const [i18nReady, setI18nReady] = useState(false);
  const loadFlags = useFeatureFlagsStore((s) => s.loadFlags);

  // Initialize premium/trial only when signed in
  usePremium();

  // Load feature flags once Firebase auth is ready
  useEffect(() => {
    if (!fbUser) return;
    loadFlags().catch(() => {});
  }, [fbUser?.uid]);

  // ── Notification deep-link listener ───────────────────────────────────
  // Fires when the user taps a push notification (app in foreground or background).
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response.notification.request.content.data ?? {}) as Record<string, string>;

      if (data.url) {
        // Broadcast notification with a clickable link
        Linking.openURL(data.url).catch(console.error);
      } else if (data.screen === "friends") {
        router.navigate("/(tabs)/friends");
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    initI18n().finally(() => setI18nReady(true));
  }, []);

  // Create/update Firestore user profile — wait for Firebase Auth to avoid permission errors
  useEffect(() => {
    if (!user || !fbUser) return;
    const name = user.firstName ?? user.emailAddresses[0]?.emailAddress ?? "Usuario";
    createOrUpdateProfile(user.id, name, user.imageUrl ?? undefined).catch(console.error);
  }, [user?.id, fbUser?.uid]);

  // GDPR/EU consent for AdMob — only runs in real builds (UMP SDK not available in Expo Go)
  useEffect(() => {
    if (isExpoGo) return;
    (async () => {
      try {
        const { AdsConsent } = await import("react-native-google-mobile-ads");
        const info = await AdsConsent.requestInfoUpdate();
        if (info.isConsentFormAvailable) {
          await AdsConsent.showForm();
        }
      } catch {
        // silently ignore — consent failure should not block the app
      }
    })();
  }, []);

  useEffect(() => {
    if (!isLoaded || !i18nReady) return;
    SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";

    if (isSignedIn && !inTabsGroup) {
      router.replace("/(tabs)/resumen");
    } else if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    }
  }, [isLoaded, isSignedIn, i18nReady]);

  if (!i18nReady) return <SplashView />;

  return <Slot />;
}

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

  if (!publishableKey) {
    throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env");
  }

  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ClerkLoaded>
          <AppRoot />
        </ClerkLoaded>
      </ClerkProvider>
      <Toast />
    </SafeAreaProvider>
  );
}
