/**
 * OnboardingModal
 *
 * One-time feature tour shown right after account creation.
 * Replaces the old ImportOnboardingModal — includes all key features
 * plus an inline CTA to open the import tool.
 *
 * Storage key: onboarding_v2_shown_<userId>
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, Modal, TouchableOpacity,
  FlatList, Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useCollection } from "@/hooks/useCollection";
import { ImportModal } from "@/components/import/ImportModal";

// ── Design tokens ──────────────────────────────────────────────────────
const BG      = "#0B0B0E";
const SURFACE = "#15161B";
const CARD    = "#1C1D24";
const INK     = "#F5F4EE";
const DIM     = "rgba(245,244,238,0.45)";
const DIM3    = "rgba(245,244,238,0.08)";
const BRAND   = "#F4C430";
const ORANGE  = "#F2853A";

const { width: W } = Dimensions.get("window");
const STORAGE_KEY = (uid: string) => `onboarding_v2_shown_${uid}`;

// ── Slide data ─────────────────────────────────────────────────────────
type Slide = {
  icon: string;
  iconBg: string;
  iconColor: string;
  titleKey: string;
  bodyKey: string;
  isImport?: true;
};

const SLIDES: Slide[] = [
  {
    icon: "star-four-points",
    iconBg: "rgba(244,196,48,0.15)",
    iconColor: BRAND,
    titleKey: "onboarding.slide1Title",
    bodyKey: "onboarding.slide1Body",
  },
  {
    icon: "camera-outline",
    iconBg: "rgba(242,133,58,0.15)",
    iconColor: ORANGE,
    titleKey: "onboarding.slide2Title",
    bodyKey: "onboarding.slide2Body",
  },
  {
    icon: "swap-horizontal",
    iconBg: "rgba(43,111,227,0.15)",
    iconColor: "#2B6FE3",
    titleKey: "onboarding.slide3Title",
    bodyKey: "onboarding.slide3Body",
  },
  {
    icon: "file-import-outline",
    iconBg: "rgba(244,196,48,0.15)",
    iconColor: BRAND,
    titleKey: "onboarding.slide4Title",
    bodyKey: "onboarding.slide4Body",
    isImport: true,
  },
];

// ── Dot indicator ──────────────────────────────────────────────────────
function Dots({ count, active }: { count: number; active: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === active ? 18 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i === active ? BRAND : DIM3,
          }}
        />
      ))}
    </View>
  );
}

// ── Main component ─────────────────────────────────────────────────────
export function OnboardingModal() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { collectionLoaded } = useCollection();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);

  const [visible, setVisible]       = useState(false);
  const [step, setStep]             = useState(0);
  const [importOpen, setImportOpen] = useState(false);

  // Shared check — shows modal if key is absent, then marks it as seen
  const runCheck = useCallback(async () => {
    if (!user?.id || !collectionLoaded) return;
    const seen = await AsyncStorage.getItem(STORAGE_KEY(user.id));
    if (!seen) {
      setVisible(true);
      await AsyncStorage.setItem(STORAGE_KEY(user.id), "1");
    }
  }, [user?.id, collectionLoaded]);

  // Initial check: fires when collectionLoaded becomes true
  useEffect(() => {
    runCheck().catch(() => {});
  }, [runCheck]);

  // Focus check: fires whenever resumen comes into focus (e.g. after
  // the user removes the key from the account screen to replay the tour)
  useFocusEffect(useCallback(() => {
    runCheck().catch(() => {});
  }, [runCheck]));

  function goTo(index: number) {
    const next = Math.max(0, Math.min(index, SLIDES.length - 1));
    setStep(next);
    listRef.current?.scrollToIndex({ index: next, animated: true });
  }

  function handleClose() {
    setVisible(false);
    setStep(0);
  }

  function handleImport() {
    setVisible(false);
    setTimeout(() => setImportOpen(true), 350);
  }

  const isLast = step === SLIDES.length - 1;
  const slide  = SLIDES[step];

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <View style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.65)",
          justifyContent: "flex-end",
        }}>
          <View style={{
            backgroundColor: SURFACE,
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingBottom: Math.max(insets.bottom + 16, 32),
            overflow: "hidden",
          }}>
            {/* Header row */}
            <View style={{
              flexDirection: "row", alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 24, paddingTop: 20, paddingBottom: 4,
            }}>
              <Dots count={SLIDES.length} active={step} />
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="close" size={20} color={DIM} />
              </TouchableOpacity>
            </View>

            {/* Slides — horizontal scroll, pointer-driven via state */}
            <FlatList
              ref={listRef}
              data={SLIDES}
              horizontal
              pagingEnabled
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
              renderItem={({ item }) => (
                <View style={{ width: W, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 }}>
                  {/* Icon */}
                  <View style={{
                    width: 68, height: 68, borderRadius: 22,
                    backgroundColor: item.iconBg,
                    alignItems: "center", justifyContent: "center",
                    marginBottom: 20,
                  }}>
                    <MaterialCommunityIcons name={item.icon as any} size={32} color={item.iconColor} />
                  </View>

                  {/* Title */}
                  <Text style={{
                    color: INK, fontSize: 22, fontWeight: "800",
                    lineHeight: 28, marginBottom: 10,
                  }}>
                    {t(item.titleKey as any)}
                  </Text>

                  {/* Body */}
                  <Text style={{
                    color: DIM, fontSize: 15, lineHeight: 23, marginBottom: 28,
                  }}>
                    {t(item.bodyKey as any)}
                  </Text>

                  {/* Import CTA — only on last slide */}
                  {item.isImport && (
                    <TouchableOpacity
                      onPress={handleImport}
                      activeOpacity={0.85}
                      style={{
                        flexDirection: "row", alignItems: "center", justifyContent: "center",
                        gap: 8, backgroundColor: CARD,
                        borderRadius: 14, paddingVertical: 14,
                        borderWidth: 1, borderColor: "rgba(244,196,48,0.25)",
                        marginBottom: 12,
                      }}
                    >
                      <MaterialCommunityIcons name="file-import-outline" size={18} color={BRAND} />
                      <Text style={{ color: BRAND, fontSize: 15, fontWeight: "700" }}>
                        {t("onboarding.importCTA")}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />

            {/* Footer */}
            <View style={{ paddingHorizontal: 24, marginTop: 4 }}>
              {/* Last slide — prominent orange CTA */}
              {isLast && (
                <TouchableOpacity
                  onPress={handleClose}
                  activeOpacity={0.85}
                  style={{
                    borderRadius: 14, paddingVertical: 16,
                    alignItems: "center", backgroundColor: ORANGE,
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#fff" }}>
                    {t("onboarding.skipBtn")}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Arrow navigation row */}
              <View style={{
                flexDirection: "row",
                justifyContent: isLast ? "flex-start" : "space-between",
                alignItems: "center",
                paddingVertical: 4,
              }}>
                {/* Back arrow */}
                {step > 0 ? (
                  <TouchableOpacity
                    onPress={() => goTo(step - 1)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <MaterialCommunityIcons name="arrow-left" size={26} color={DIM} />
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: 26 }} />
                )}

                {/* Next arrow — hidden on last slide */}
                {!isLast && (
                  <TouchableOpacity
                    onPress={() => goTo(step + 1)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <MaterialCommunityIcons name="arrow-right" size={26} color={INK} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <ImportModal visible={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}
