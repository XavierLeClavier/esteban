import { Switch, Text, View } from "react-native";

export default function AppAccessPanel({ appEntries, onToggle }) {
  return (
    <View className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
      <Text className="text-xs tracking-[1.5px] text-cyan-400">APP ACCESS</Text>
      <Text className="mt-1 text-sm text-slate-300">
        Enable the apps Esteban is allowed to open from this device.
      </Text>

      <View className="mt-3 gap-2">
        {appEntries.map((app) => (
          <View
            key={app.key}
            className="flex-row items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2"
          >
            <Text className="font-medium text-slate-100">{app.name}</Text>
            <Switch
              value={app.enabled}
              onValueChange={(nextValue) => onToggle(app.key, nextValue)}
              thumbColor={app.enabled ? "#22D3EE" : "#94A3B8"}
              trackColor={{ false: "#334155", true: "#155E75" }}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
