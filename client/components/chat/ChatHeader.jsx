import { Link, useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export default function ChatHeader() {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/");
  };

  return (
    <View className="border-b border-slate-800 px-4 pb-4 pt-12">
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
          onPress={handleBack}
        >
          <Text className="text-xs font-semibold text-slate-100">Back</Text>
        </TouchableOpacity>

        <Link href="/settings" asChild>
          <TouchableOpacity className="rounded-lg border border-cyan-600 bg-cyan-500/20 px-3 py-2">
            <Text className="text-xs font-semibold text-cyan-200">Settings</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <Text className="mt-3 text-xs tracking-[2px] text-cyan-400">SELF-HOSTED LLM</Text>
      <Text className="mt-1 text-2xl font-semibold text-slate-100">Esteban Chat</Text>
    </View>
  );
}
