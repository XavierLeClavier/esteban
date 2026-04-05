import { Text, View } from "react-native";

export default function TypingIndicator() {
  return (
    <View className="mb-3 self-start rounded-2xl border border-slate-700 bg-slate-800 px-4 py-2">
      <Text className="italic text-slate-400">Esteban is typing...</Text>
    </View>
  );
}
