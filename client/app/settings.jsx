import "../global.css";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Link } from "expo-router";
import AppAccessPanel from "../components/chat/AppAccessPanel";
import useOpenableApps from "../hooks/useOpenableApps";

export default function Settings() {
  const { appEntries, saveAppSettings, loaded } = useOpenableApps();
  const [draftToggles, setDraftToggles] = useState({});
  const [saveState, setSaveState] = useState("idle");

  useEffect(() => {
    if (!loaded) {
      return;
    }
    setDraftToggles(
      Object.fromEntries(appEntries.map((app) => [app.key, Boolean(app.enabled)]))
    );
    setSaveState("idle");
  }, [appEntries, loaded]);

  const draftEntries = useMemo(
    () =>
      appEntries.map((app) => ({
        ...app,
        enabled: draftToggles[app.key] ?? app.enabled,
      })),
    [appEntries, draftToggles]
  );

  const hasUnsavedChanges = useMemo(
    () => appEntries.some((app) => (draftToggles[app.key] ?? app.enabled) !== app.enabled),
    [appEntries, draftToggles]
  );

  const handleToggle = (appKey, enabled) => {
    setDraftToggles((prev) => ({ ...prev, [appKey]: Boolean(enabled) }));
    setSaveState("idle");
  };

  const handleSave = async () => {
    const next = Object.fromEntries(
      appEntries.map((app) => [app.key, Boolean(draftToggles[app.key] ?? app.enabled)])
    );
    setSaveState("saving");
    const ok = await saveAppSettings(next);
    setSaveState(ok ? "saved" : "error");
  };

  return (
    <ScrollView className="flex-1 bg-slate-950" contentContainerStyle={{ paddingBottom: 28 }}>
      <View className="px-6 pb-4 pt-14">
        <Text className="text-xs tracking-[2px] text-cyan-400">LOCAL SETTINGS</Text>
        <Text className="mt-2 text-3xl font-bold text-slate-100">App Access</Text>
        <Text className="mt-2 text-slate-300">
          Control which apps Esteban is allowed to open on this device.
        </Text>
      </View>

      <View className="px-6">
        {!loaded ? (
          <View className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
            <Text className="text-slate-400">Loading your local preferences...</Text>
          </View>
        ) : (
          <>
            <AppAccessPanel appEntries={draftEntries} onToggle={handleToggle} />

            <TouchableOpacity
              className={`mb-3 rounded-xl px-4 py-3 active:opacity-90 ${
                hasUnsavedChanges
                  ? "border border-cyan-400 bg-cyan-500"
                  : "border border-slate-700 bg-slate-800"
              }`}
              onPress={handleSave}
              disabled={!hasUnsavedChanges || saveState === "saving"}
            >
              <Text
                className={`text-center font-semibold ${
                  hasUnsavedChanges ? "text-slate-950" : "text-slate-300"
                }`}
              >
                {saveState === "saving"
                  ? "Saving..."
                  : saveState === "saved"
                    ? "Saved"
                    : "Save Changes"}
              </Text>
            </TouchableOpacity>

            {saveState === "error" ? (
              <View className="mb-3 rounded-lg border border-red-800 bg-red-950/60 px-3 py-2">
                <Text className="text-sm text-red-300">
                  Could not save preferences. Please try again.
                </Text>
              </View>
            ) : null}
          </>
        )}
      </View>

      <View className="px-6 pt-2">
        <Link href="/chat" asChild>
          <TouchableOpacity className="rounded-xl border border-cyan-500 bg-cyan-500/20 px-4 py-3 active:opacity-90">
            <Text className="text-center font-semibold text-cyan-200">Return to Chat</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  );
}
