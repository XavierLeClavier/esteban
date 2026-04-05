import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { OPENABLE_APPS_CATALOG, getDefaultAppToggles } from "../config/openableApps";

const STORAGE_KEY = "esteban.openableApps.v1";

export default function useOpenableApps() {
  const [toggles, setToggles] = useState(getDefaultAppToggles);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) {
          return;
        }

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") {
          return;
        }

        const defaults = getDefaultAppToggles();
        const next = { ...defaults };

        Object.keys(defaults).forEach((key) => {
          if (typeof parsed[key] === "boolean") {
            next[key] = parsed[key];
          }
        });

        if (mounted) {
          setToggles(next);
        }
      } catch {
        // Keep defaults if storage is corrupted/unavailable.
      } finally {
        if (mounted) {
          setLoaded(true);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const saveToggles = useCallback(async (next) => {
    setToggles(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Keep runtime state even if persistence fails.
    }
  }, []);

  const setAppEnabled = useCallback(
    (appKey, enabled) => {
      if (!(appKey in OPENABLE_APPS_CATALOG)) {
        return;
      }
      const next = { ...toggles, [appKey]: Boolean(enabled) };
      saveToggles(next);
    },
    [saveToggles, toggles]
  );

  const appEntries = useMemo(
    () =>
      Object.entries(OPENABLE_APPS_CATALOG).map(([key, app]) => ({
        ...app,
        key,
        enabled: Boolean(toggles[key]),
      })),
    [toggles]
  );

  const enabledAppKeys = useMemo(
    () => appEntries.filter((app) => app.enabled).map((app) => app.key),
    [appEntries]
  );

  const enabledAppConfigsByKey = useMemo(
    () =>
      Object.fromEntries(
        appEntries.filter((app) => app.enabled).map((app) => [app.key, app])
      ),
    [appEntries]
  );

  return {
    appEntries,
    enabledAppKeys,
    enabledAppConfigsByKey,
    setAppEnabled,
    loaded,
  };
}
