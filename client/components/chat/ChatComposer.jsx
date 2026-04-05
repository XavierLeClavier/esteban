import { Text, TextInput, TouchableOpacity, View } from "react-native";

export default function ChatComposer({
  value,
  onChangeText,
  onSend,
  onVoiceToggle,
  onInputFocus,
  loading,
  recording,
  transcribing,
}) {
  return (
    <View className="border-t border-slate-800 bg-slate-900/95 p-4 pb-6">
      <View className="flex-row items-end gap-2">
        <TouchableOpacity
          className={`rounded-2xl px-4 py-3 ${recording ? "bg-rose-500" : "bg-slate-700"}`}
          onPress={onVoiceToggle}
          disabled={transcribing}
        >
          <Text className="font-bold text-slate-100">{recording ? "Stop" : "Mic"}</Text>
        </TouchableOpacity>

        <TextInput
          className="max-h-32 flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100"
          placeholder={transcribing ? "Transcribing..." : "Message Esteban..."}
          placeholderTextColor="#64748B"
          value={value}
          onChangeText={onChangeText}
          onFocus={onInputFocus}
          multiline
          textAlignVertical="top"
          editable={!transcribing}
        />

        <TouchableOpacity
          className={`rounded-2xl px-4 py-3 ${loading ? "bg-amber-500" : "bg-cyan-500"}`}
          onPress={onSend}
          disabled={transcribing}
        >
          <Text className="font-bold text-slate-950">{loading ? "Stop" : "Send"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
