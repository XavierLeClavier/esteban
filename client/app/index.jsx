import "../global.css";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Link } from "expo-router";

export default function Home() {
  return (
    <ScrollView className="flex-1 bg-slate-950" contentContainerStyle={{ paddingBottom: 30 }}>
      <View className="px-6 pb-8 pt-14">
        <Text className="text-xs font-semibold tracking-[3px] text-cyan-400">PRIVATE LOCAL ASSISTANT</Text>
        <Text className="mt-3 text-5xl font-extrabold text-slate-100">Esteban</Text>
        <Text className="mt-2 text-base leading-6 text-slate-300">
          A self-hosted AI that can answer, transcribe, and open only the apps you allow.
        </Text>
      </View>

      <View className="mx-6 mb-8 rounded-3xl border border-cyan-700/40 bg-slate-900 p-6">
        <Text className="text-xl font-bold text-slate-100">Everything stays under your control</Text>
        <Text className="mt-2 text-slate-300">
          Local model. Local voice handling. Local app permissions.
        </Text>

        <View className="mt-5 gap-3">
          <Link href="/chat" asChild>
            <TouchableOpacity className="rounded-2xl border-2 border-cyan-400 bg-cyan-400 px-5 py-4 active:opacity-90">
              <Text className="text-center text-lg font-extrabold text-slate-950">Open Chat</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/settings" asChild>
            <TouchableOpacity className="rounded-2xl border-2 border-slate-500 bg-slate-800 px-5 py-4 active:opacity-90">
              <Text className="text-center text-lg font-extrabold text-slate-100">App Access Settings</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      <View className="px-6">
        <Text className="mb-3 text-lg font-bold text-slate-100">Quick Overview</Text>

        <View className="mb-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <Text className="font-semibold text-cyan-300">1. Local LLM</Text>
          <Text className="mt-1 text-slate-300">Your model runs on your own infrastructure.</Text>
        </View>

        <View className="mb-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <Text className="font-semibold text-cyan-300">2. Realtime Voice</Text>
          <Text className="mt-1 text-slate-300">Speak naturally and get instant streamed answers.</Text>
        </View>

        <View className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <Text className="font-semibold text-cyan-300">3. App Permissions</Text>
          <Text className="mt-1 text-slate-300">Only enabled apps can be opened by Esteban.</Text>
        </View>
      </View>
    </ScrollView>
  );
}