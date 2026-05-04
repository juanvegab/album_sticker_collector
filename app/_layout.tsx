import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import "../global.css";
// Required for Dev Build to enable QR scanning + hot reload
import "expo-dev-client";

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

function AuthGuard() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    SplashScreen.hideAsync();
    const inAuth = segments[0] === "(auth)";
    if (!isSignedIn && !inAuth) {
      router.replace("/(auth)/sign-in");
    } else if (isSignedIn && inAuth) {
      router.replace("/(tabs)/album");
    }
  }, [isLoaded, isSignedIn, segments]);

  return <Slot />;
}

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <AuthGuard />
    </ClerkProvider>
  );
}
