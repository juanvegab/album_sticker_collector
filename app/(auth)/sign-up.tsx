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
import { useSignUp, useOAuth } from "@clerk/clerk-expo";
import { Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTranslation } from "react-i18next";

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const { t } = useTranslation();
  const { signUp, setActive, isLoaded } = useSignUp();
  const { startOAuthFlow: startGoogleFlow } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startAppleFlow } = useOAuth({ strategy: "oauth_apple" });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  useEffect(() => {
    WebBrowser.warmUpAsync();
    return () => { WebBrowser.coolDownAsync(); };
  }, []);

  async function handleSignUp() {
    if (!isLoaded) return;
    setLoading(true);
    try {
      await signUp.create({ emailAddress: email, password, firstName: name });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      Alert.alert(t("common.error"), err.errors?.[0]?.message ?? t("auth.errorRegister"));
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
      Alert.alert(t("auth.errorCode"), err.errors?.[0]?.message ?? t("auth.tryAgain"));
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
      Alert.alert(t("common.error"), err.errors?.[0]?.message ?? t("auth.errorGoogle"));
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
      Alert.alert(t("common.error"), err.errors?.[0]?.message ?? t("auth.errorApple"));
    } finally {
      setAppleLoading(false);
    }
  }

  const anyLoading = loading || googleLoading || appleLoading;

  if (pendingVerification) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-white"
      >
        <View className="flex-1 justify-center px-8">
          <Text className="text-4xl mb-2">📬</Text>
          <Text className="text-3xl font-bold text-gray-900 mb-1">{t("auth.verifyEmail")}</Text>
          <Text className="text-gray-500 mb-8">{t("auth.verifyCode", { email })}</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-4 mb-6 text-gray-900 text-2xl text-center tracking-widest"
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
              <Text className="text-white font-semibold text-base">{t("auth.verify")}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <View className="flex-1 justify-center px-8">
        <Text className="text-4xl mb-2">🎴</Text>
        <Text className="text-3xl font-bold text-gray-900 mb-1">{t("auth.createAccount")}</Text>
        <Text className="text-gray-500 mb-8">{t("auth.taglineSignUp")}</Text>

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
                {t("auth.continueGoogle")}
              </Text>
            </>
          )}
        </TouchableOpacity>

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
                {t("auth.continueApple")}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View className="flex-row items-center mb-6">
          <View className="flex-1 h-px bg-gray-200" />
          <Text className="mx-3 text-gray-400 text-sm">{t("auth.orEmail")}</Text>
          <View className="flex-1 h-px bg-gray-200" />
        </View>

        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-900 text-base"
          placeholder={t("auth.yourName")}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-900 text-base"
          placeholder={t("auth.email")}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-6 text-gray-900 text-base"
          placeholder={t("auth.password")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          onPress={handleSignUp}
          disabled={anyLoading}
          className="bg-blue-600 rounded-xl py-4 items-center mb-6"
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">{t("auth.createAccount")}</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center">
          <Text className="text-gray-500">{t("auth.haveAccount")}</Text>
          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity>
              <Text className="text-blue-600 font-semibold">{t("auth.signInLink")}</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
