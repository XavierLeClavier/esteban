import { Text, View } from "react-native";

export default function ChatHeader() {
  return (
    <View className="border-b border-slate-800 px-4 pb-4 pt-12">
      <Text className="text-xs tracking-[2px] text-cyan-400">SELF-HOSTED LLM</Text>
      <Text className="mt-1 text-2xl font-semibold text-slate-100">Esteban Chat</Text>
    </View>
  );
}
