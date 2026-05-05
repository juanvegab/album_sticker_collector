import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useSignIn, useOAuth } from "@clerk/clerk-expo";
import { Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import FontAwesome from "@expo/vector-icons/FontAwesome";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startOAuthFlow: startGoogleFlow } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startAppleFlow } = useOAuth({ strategy: "oauth_apple" });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  useEffect(() => {
    WebBrowser.warmUpAsync();
    return () => { WebBrowser.coolDownAsync(); };
  }, []);

  async function handleSignIn() {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
      }
    } catch (err: any) {
      Alert.alert("Error", err.errors?.[0]?.message ?? "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      const { createdSessionId, setActive: setOAuthActive } = await startGoogleFlow({
        redirectUrl: Linking.createURL("/(tabs)/album", { scheme: "controldepostales" }),
      });
      if (createdSessionId && setOAuthActive) {
        await setOAuthActive({ session: createdSessionId });
      }
    } catch (err: any) {
      Alert.alert("Error", err.errors?.[0]?.message ?? "No se pudo continuar con Google");
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleApple() {
    setAppleLoading(true);
    try {
      const { createdSessionId, setActive: setOAuthActive } = await startAppleFlow({
        redirectUrl: Linking.createURL("/(tabs)/album", { scheme: "controldepostales" }),
      });
      if (createdSessionId && setOAuthActive) {
        await setOAuthActive({ session: createdSessionId });
      }
    } catch (err: any) {
      Alert.alert("Error", err.errors?.[0]?.message ?? "No se pudo continuar con Apple");
    } finally {
      setAppleLoading(false);
    }
  }

  const anyLoading = loading || googleLoading || appleLoading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <View className="flex-1 justify-center px-8">
        <Text className="text-4xl mb-2">⚽</Text>
        <Text className="text-3xl font-bold text-gray-900 mb-1">Bienvenido</Text>
        <Text className="text-gray-500 mb-8">Tu álbum del Mundial 2026</Text>

        {/* Google */}
        <TouchableOpacity
          onPress={handleGoogle}
          disabled={anyLoading}
          className="border border-gray-300 rounded-xl py-3.5 items-center flex-row justify-center mb-3"
          activeOpacity={0.8}
        >
          {googleLoading ? (
            <ActivityIndicator color="#4285F4" />
          ) : (
            <>
              <FontAwesome name="google" size={18} color="#4285F4" />
              <Text className="text-gray-700 font-semibold text-base ml-3">
                Continuar con Google
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Apple */}
        <TouchableOpacity
          onPress={handleApple}
          disabled={anyLoading}
          className="bg-black rounded-xl py-3.5 items-center flex-row justify-center mb-6"
          activeOpacity={0.8}
        >
          {appleLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <FontAwesome name="apple" size={20} color="white" />
              <Text className="text-white font-semibold text-base ml-3">
                Continuar con Apple
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View className="flex-row items-center mb-6">
          <View className="flex-1 h-px bg-gray-200" />
          <Text className="mx-3 text-gray-400 text-sm">o con correo</Text>
          <View className="flex-1 h-px bg-gray-200" />
        </View>

        {/* Email / password */}
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-900 text-base"
          placeholder="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-6 text-gray-900 text-base"
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          onPress={handleSignIn}
          disabled={anyLoading}
          className="bg-blue-600 rounded-xl py-4 items-center mb-6"
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">Iniciar sesión</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center">
          <Text className="text-gray-500">¿No tienes cuenta? </Text>
          <Link href="/(auth)/sign-up" asChild>
            <TouchableOpacity>
              <Text className="text-blue-600 font-semibold">Regístrate</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
