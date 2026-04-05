import { Text, View } from "react-native";

export default function MessageBubble({ role, content }) {
  const user = role === "user";

  return (
    <View
      className={`mb-3 max-w-[86%] rounded-2xl px-4 py-3 ${
        user ? "self-end bg-cyan-500" : "self-start border border-slate-700 bg-slate-800"
      }`}
    >
      <Text className={user ? "text-slate-950" : "text-slate-100"}>{content}</Text>
    </View>
  );
}
