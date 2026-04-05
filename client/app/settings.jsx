import "../global.css";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Link } from "expo-router";
import AppAccessPanel from "../components/chat/AppAccessPanel";
import useOpenableApps from "../hooks/useOpenableApps";

export default function Settings() {
  const { appEntries, setAppEnabled, loaded } = useOpenableApps();

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
          <AppAccessPanel appEntries={appEntries} onToggle={setAppEnabled} />
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
