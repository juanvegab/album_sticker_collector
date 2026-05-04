import { useState } from "react";
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
import { useSignUp } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!isLoaded) return;
    setLoading(true);
    try {
      await signUp.create({ emailAddress: email, password, firstName: name });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      Alert.alert("Error", err.errors?.[0]?.message ?? "No se pudo registrar");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
      }
    } catch (err: any) {
      Alert.alert("Código inválido", err.errors?.[0]?.message ?? "Intenta de nuevo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <View className="flex-1 justify-center px-8">
        <Text className="text-4xl mb-2">🎴</Text>
        <Text className="text-3xl font-bold text-gray-900 mb-1">
          {pendingVerification ? "Verifica tu email" : "Crear cuenta"}
        </Text>
        <Text className="text-gray-500 mb-8">
          {pendingVerification
            ? "Ingresa el código que enviamos a tu correo"
            : "Empieza a coleccionar stickers"}
        </Text>

        {!pendingVerification ? (
          <>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-900 text-base"
              placeholder="Tu nombre"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-900 text-base"
              placeholder="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 mb-6 text-gray-900 text-base"
              placeholder="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity
              onPress={handleSignUp}
              disabled={loading}
              className="bg-blue-600 rounded-xl py-4 items-center mb-4"
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-base">Crear cuenta</Text>
              )}
            </TouchableOpacity>
            <View className="flex-row justify-center">
              <Text className="text-gray-500">¿Ya tienes cuenta? </Text>
              <Link href="/(auth)/sign-in" asChild>
                <TouchableOpacity>
                  <Text className="text-blue-600 font-semibold">Inicia sesión</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </>
        ) : (
          <>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 mb-6 text-gray-900 text-base text-center text-2xl tracking-widest"
              placeholder="000000"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity
              onPress={handleVerify}
              disabled={loading}
              className="bg-blue-600 rounded-xl py-4 items-center"
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-base">Verificar</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
