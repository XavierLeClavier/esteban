import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { OPENABLE_APPS_CATALOG, getDefaultAppToggles } from "../config/openableApps";

const STORAGE_KEY = "esteban.openableApps.v1";
let inMemoryRawCache = null;

function readFromLocalStorage() {
  if (typeof globalThis === "undefined" || !globalThis.localStorage) {
    return null;
  }

  try {
    return globalThis.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeToLocalStorage(value) {
  if (typeof globalThis === "undefined" || !globalThis.localStorage) {
    return false;
  }

  try {
    globalThis.localStorage.setItem(STORAGE_KEY, value);
    return true;
  } catch {
    return false;
  }
}

async function readStoredTogglesRaw() {
  if (typeof inMemoryRawCache === "string") {
    return inMemoryRawCache;
  }

  try {
    if (AsyncStorage?.getItem) {
      const value = await AsyncStorage.getItem(STORAGE_KEY);
      if (typeof value === "string") {
        inMemoryRawCache = value;
      }
      return value;
    }
  } catch {
    // Fall back to localStorage below.
  }

  const local = readFromLocalStorage();
  if (typeof local === "string") {
    inMemoryRawCache = local;
  }
  return local;
}

async function writeStoredTogglesRaw(value) {
  inMemoryRawCache = value;

  let wrote = false;

  try {
    if (AsyncStorage?.setItem) {
      await AsyncStorage.setItem(STORAGE_KEY, value);
      wrote = true;
    }
  } catch {
    // Fall back to localStorage below if native write failed.
  }

  if (writeToLocalStorage(value)) {
    wrote = true;
  }

  // If persistent backends are unavailable, keep memory cache as a usable fallback.
  return wrote || typeof inMemoryRawCache === "string";
}

function normalizeToggles(raw) {
  const defaults = getDefaultAppToggles();
  if (!raw) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return defaults;
    }

    const next = { ...defaults };
    Object.keys(defaults).forEach((key) => {
      if (typeof parsed[key] === "boolean") {
        next[key] = parsed[key];
      }
    });
    return next;
  } catch {
    return defaults;
  }
}

export default function useOpenableApps() {
  const [toggles, setToggles] = useState(getDefaultAppToggles);
  const [loaded, setLoaded] = useState(false);

  const reloadAppSettings = useCallback(async () => {
    const raw = await readStoredTogglesRaw();
    const next = normalizeToggles(raw);
    setToggles(next);
    return next;
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const raw = await readStoredTogglesRaw();
        const next = normalizeToggles(raw);

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

  const saveAppSettings = useCallback(async (next) => {
    setToggles(next);
    return writeStoredTogglesRaw(JSON.stringify(next));
  }, []);

  const setAppEnabled = useCallback(
    (appKey, enabled) => {
      if (!(appKey in OPENABLE_APPS_CATALOG)) {
        return;
      }
      setToggles((prev) => ({ ...prev, [appKey]: Boolean(enabled) }));
    },
    []
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
    saveAppSettings,
    reloadAppSettings,
    loaded,
  };
}
