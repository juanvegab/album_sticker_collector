import "../global.css";
import { useEffect } from "react";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SecureStore from "expo-secure-store";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { usePremium } from "@/hooks/usePremium";

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
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Initialize premium/trial only when signed in
  usePremium();

  useEffect(() => {
    if (!isLoaded) return;
    SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";

    if (isSignedIn && !inTabsGroup) {
      router.replace("/(tabs)/album");
    } else if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    }
  }, [isLoaded, isSignedIn]);

  return <Slot />;
}

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

  if (!publishableKey) {
    throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env");
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <AppRoot />
      </ClerkLoaded>
    </ClerkProvider>
  );
}
