import "../global.css";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Link } from "expo-router";

export default function Home() {
  return (
    <ScrollView className="flex-1 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <View className="px-6 pt-12 pb-8">
        <Text className="text-sm font-semibold tracking-widest text-blue-400">
          SELF-HOSTED AI
        </Text>
        <Text className="mt-2 text-4xl font-bold text-white">Esteban</Text>
        <Text className="mt-1 text-base text-slate-400">
          Your personal AI, fully in your control
        </Text>
      </View>

      {/* Hero Section */}
      <View className="mx-6 mb-8 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 p-6 shadow-lg">
        <Text className="text-2xl font-bold text-white">
          100% Private Intelligence
        </Text>
        <Text className="mt-3 text-base leading-6 text-blue-50">
          No data leaves your device. Your conversations stay private. Your AI stays honest.
        </Text>
      </View>

      {/* Process Steps */}
      <View className="px-6 pb-6">
        <Text className="mb-4 text-lg font-bold text-white">How It Works</Text>

        {/* Step 1 */}
        <View className="mb-4 flex-row items-start rounded-xl bg-slate-700 p-4">
          <View className="mr-4 flex h-9 w-9 items-center justify-center rounded-full bg-blue-500">
            <Text className="font-bold text-white">1</Text>
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-white">Local LLM</Text>
            <Text className="mt-1 text-sm text-slate-300">
              Llama 3.2 runs locally on your device, powered by Ollama
            </Text>
          </View>
        </View>

        {/* Step 2 */}
        <View className="mb-4 flex-row items-start rounded-xl bg-slate-700 p-4">
          <View className="mr-4 flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500">
            <Text className="font-bold text-white">2</Text>
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-white">Smart API</Text>
            <Text className="mt-1 text-sm text-slate-300">
              Flask backend streams responses in real-time with token-by-token output
            </Text>
          </View>
        </View>

        {/* Step 3 */}
        <View className="mb-4 flex-row items-start rounded-xl bg-slate-700 p-4">
          <View className="mr-4 flex h-9 w-9 items-center justify-center rounded-full bg-purple-500">
            <Text className="font-bold text-white">3</Text>
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-white">React Native Mobile</Text>
            <Text className="mt-1 text-sm text-slate-300">
              Beautiful, responsive UI powered by Expo and NativeWind
            </Text>
          </View>
        </View>

        {/* Step 4 */}
        <View className="flex-row items-start rounded-xl bg-slate-700 p-4">
          <View className="mr-4 flex h-9 w-9 items-center justify-center rounded-full bg-green-500">
            <Text className="font-bold text-white">4</Text>
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-white">Talk to Your AI</Text>
            <Text className="mt-1 text-sm text-slate-300">
              Ask questions, get instant answers, evolve your assistant
            </Text>
          </View>
        </View>
      </View>

      {/* Features Grid */}
      <View className="px-6 pb-8">
        <Text className="mb-4 text-lg font-bold text-white">Features</Text>
        <View className="flex-row gap-3">
          <View className="flex-1 rounded-lg bg-slate-700 p-3">
            <Text className="text-xs uppercase tracking-wider text-blue-400">
              🔒 Private
            </Text>
            <Text className="mt-1 text-sm font-medium text-white">
              No tracking
            </Text>
          </View>
          <View className="flex-1 rounded-lg bg-slate-700 p-3">
            <Text className="text-xs uppercase tracking-wider text-cyan-400">
              ⚡ Fast
            </Text>
            <Text className="mt-1 text-sm font-medium text-white">
              Instant responses
            </Text>
          </View>
          <View className="flex-1 rounded-lg bg-slate-700 p-3">
            <Text className="text-xs uppercase tracking-wider text-purple-400">
              🎯 Yours
            </Text>
            <Text className="mt-1 text-sm font-medium text-white">
              You control it
            </Text>
          </View>
        </View>
      </View>

      {/* CTA Button */}
      <View className="mx-6 pb-12">
        <Link href="/chat" asChild>
          <TouchableOpacity className="flex-row items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-8 py-4 shadow-xl active:opacity-90">
            <Text className="mr-2 text-lg font-bold text-white">
              Start Chatting
            </Text>
            <Text className="text-xl">→</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Footer */}
      <View className="border-t border-slate-700 px-6 py-6">
        <Text className="text-center text-xs text-slate-500">
          v1.0.0 • Fully self-hosted • Open source ethos
        </Text>
      </View>
    </ScrollView>
  );
}