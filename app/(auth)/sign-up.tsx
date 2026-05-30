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
  ScrollView,
  StatusBar,
  Image,
} from "react-native";
import { useSignUp, useSignIn } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useTranslation } from "react-i18next";

WebBrowser.maybeCompleteAuthSession();

// ── Shared input style ────────────────────────────────────────────────
const INPUT_STYLE = {
  backgroundColor: "#15161B",
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "rgba(245,244,238,0.18)",
  paddingHorizontal: 16,
  paddingVertical: 14,
  color: "#F5F4EE",
  fontSize: 16,
  marginBottom: 12,
} as const;

const PLACEHOLDER_COLOR = "rgba(245,244,238,0.35)";

type Mode = "signup" | "signin";

export default function SignUpScreen() {
  const { t } = useTranslation();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [pendingPasswordReset, setPendingPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    WebBrowser.warmUpAsync();
    return () => { WebBrowser.coolDownAsync(); };
  }, []);

  // ── Sign up with email ──────────────────────────────────────────────
  async function handleSignUp() {
    if (!signUpLoaded) return;
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
    if (!signUpLoaded) return;
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setSignUpActive({ session: result.createdSessionId });
      }
    } catch (err: any) {
      Alert.alert(t("auth.errorCode"), err.errors?.[0]?.message ?? t("auth.tryAgain"));
    } finally {
      setLoading(false);
    }
  }

  // ── Sign in with email ──────────────────────────────────────────────
  async function handleSignIn() {
    if (!signInLoaded) return;
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === "complete") {
        await setSignInActive({ session: result.createdSessionId });
      }
    } catch (err: any) {
      const code = err.errors?.[0]?.code ?? "";
      // Account has no password (migrated from Dev) — trigger password reset flow
      if (
        code === "strategy_for_user_invalid" ||
        code === "form_password_not_set" ||
        code === "form_identifier_not_found" ||
        err.errors?.[0]?.message?.toLowerCase().includes("verification strategy")
      ) {
        await startPasswordReset();
      } else {
        Alert.alert(t("common.error"), err.errors?.[0]?.message ?? t("auth.errorSignIn"));
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Password reset flow (for migrated users without a password) ─────
  async function startPasswordReset() {
    if (!signInLoaded) return;
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setPendingPasswordReset(true);
    } catch (err: any) {
      Alert.alert(t("common.error"), err.errors?.[0]?.message ?? t("auth.errorSignIn"));
    }
  }

  async function handlePasswordReset() {
    if (!signInLoaded) return;
    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password: newPassword,
      });
      if (result.status === "complete") {
        await setSignInActive({ session: result.createdSessionId });
      }
    } catch (err: any) {
      Alert.alert(t("auth.errorCode"), err.errors?.[0]?.message ?? t("auth.tryAgain"));
    } finally {
      setLoading(false);
    }
  }

  // ── Password reset screen (migrated users) ─────────────────────────
  if (pendingPasswordReset) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: "#0B0B0E" }}
      >
        <StatusBar barStyle="light-content" backgroundColor="#0B0B0E" />
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>🔑</Text>
          <Text style={{ color: "#F5F4EE", fontSize: 26, fontWeight: "800", marginBottom: 8 }}>
            {t("auth.resetPassword")}
          </Text>
          <Text style={{ color: "rgba(245,244,238,0.55)", fontSize: 14, lineHeight: 20, marginBottom: 32 }}>
            {t("auth.resetPasswordDesc", { email })}
          </Text>

          <TextInput
            style={{ ...INPUT_STYLE, fontSize: 28, textAlign: "center", letterSpacing: 10, marginBottom: 16 }}
            placeholder="000000"
            placeholderTextColor={PLACEHOLDER_COLOR}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />

          <TextInput
            style={{ ...INPUT_STYLE, marginBottom: 24 }}
            placeholder={t("auth.newPassword")}
            placeholderTextColor={PLACEHOLDER_COLOR}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />

          <TouchableOpacity
            onPress={handlePasswordReset}
            disabled={loading}
            style={{ backgroundColor: "#F4C430", borderRadius: 999, height: 54, alignItems: "center", justifyContent: "center" }}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#0B0B0E" />
            ) : (
              <Text style={{ color: "#0B0B0E", fontWeight: "800", fontSize: 17 }}>
                {t("auth.setNewPassword")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── Verification screen ─────────────────────────────────────────────
  if (pendingVerification) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: "#0B0B0E" }}
      >
        <StatusBar barStyle="light-content" backgroundColor="#0B0B0E" />
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>📬</Text>
          <Text
            style={{
              color: "#F5F4EE",
              fontSize: 26,
              fontWeight: "800",
              marginBottom: 8,
            }}
          >
            {t("auth.verifyEmail")}
          </Text>
          <Text
            style={{
              color: "rgba(245,244,238,0.55)",
              fontSize: 14,
              lineHeight: 20,
              marginBottom: 32,
            }}
          >
            {t("auth.verifyCode", { email })}
          </Text>

          <TextInput
            style={{
              ...INPUT_STYLE,
              fontSize: 28,
              textAlign: "center",
              letterSpacing: 10,
              marginBottom: 24,
            }}
            placeholder="000000"
            placeholderTextColor={PLACEHOLDER_COLOR}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />

          <TouchableOpacity
            onPress={handleVerify}
            disabled={loading}
            style={{
              backgroundColor: "#F4C430",
              borderRadius: 999,
              height: 54,
              alignItems: "center",
              justifyContent: "center",
            }}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#0B0B0E" />
            ) : (
              <Text style={{ color: "#0B0B0E", fontWeight: "800", fontSize: 17 }}>
                {t("auth.verify")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  const isSignUp = mode === "signup";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#0B0B0E" }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0E" />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          paddingTop: Platform.OS === "ios" ? 60 : 40,
          paddingBottom: 40,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back to landing */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginBottom: 28, alignSelf: "flex-start", flexDirection: "row", alignItems: "center" }}
          activeOpacity={0.7}
        >
          <Text style={{ color: "rgba(245,244,238,0.55)", fontSize: 15 }}>‹ </Text>
          <Text style={{ color: "rgba(245,244,238,0.55)", fontSize: 15 }}>{t("common.back")}</Text>
        </TouchableOpacity>

        {/* App icon */}
        <Image
          source={require("../../assets/icon.png")}
          style={{ width: 64, height: 64, borderRadius: 14, marginBottom: 24 }}
        />

        {/* Mode toggle */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "#15161B",
            borderRadius: 12,
            padding: 4,
            marginBottom: 32,
          }}
        >
          <TouchableOpacity
            onPress={() => setMode("signup")}
            style={{
              flex: 1,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
              backgroundColor: isSignUp ? "#1C1D24" : "transparent",
            }}
            activeOpacity={0.8}
          >
            <Text
              style={{
                color: isSignUp ? "#F5F4EE" : "rgba(245,244,238,0.4)",
                fontWeight: isSignUp ? "700" : "500",
                fontSize: 15,
              }}
            >
              {t("auth.createAccount")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode("signin")}
            style={{
              flex: 1,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
              backgroundColor: !isSignUp ? "#1C1D24" : "transparent",
            }}
            activeOpacity={0.8}
          >
            <Text
              style={{
                color: !isSignUp ? "#F5F4EE" : "rgba(245,244,238,0.4)",
                fontWeight: !isSignUp ? "700" : "500",
                fontSize: 15,
              }}
            >
              {t("auth.signIn")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Heading */}
        <Text
          style={{
            color: "#F5F4EE",
            fontSize: 28,
            fontWeight: "800",
            marginBottom: 28,
          }}
        >
          {isSignUp ? t("auth.createAccount") : t("auth.signIn")}
        </Text>

        {/* Name (sign-up only) */}
        {isSignUp && (
          <TextInput
            style={INPUT_STYLE}
            placeholder={t("auth.yourName")}
            placeholderTextColor={PLACEHOLDER_COLOR}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        )}

        {/* Email */}
        <TextInput
          style={INPUT_STYLE}
          placeholder={t("auth.email")}
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        {/* Password */}
        <TextInput
          style={{ ...INPUT_STYLE, marginBottom: !isSignUp ? 10 : 28 }}
          placeholder={t("auth.password")}
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Forgot password (sign-in only) */}
        {!isSignUp && (
          <TouchableOpacity
            onPress={startPasswordReset}
            disabled={!email.trim() || loading}
            style={{ alignSelf: "flex-end", marginBottom: 22 }}
            activeOpacity={0.7}
          >
            <Text style={{
              color: email.trim() ? "#F4C430" : "rgba(245,244,238,0.3)",
              fontSize: 13,
              fontWeight: "600",
            }}>
              ¿Olvidaste tu contraseña?
            </Text>
          </TouchableOpacity>
        )}

        {/* Submit */}
        <TouchableOpacity
          onPress={isSignUp ? handleSignUp : handleSignIn}
          disabled={loading}
          style={{
            backgroundColor: "#F4C430",
            borderRadius: 999,
            height: 54,
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#0B0B0E" />
          ) : (
            <Text style={{ color: "#0B0B0E", fontWeight: "800", fontSize: 17 }}>
              {isSignUp ? t("auth.createAccount") : t("auth.signIn")}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
