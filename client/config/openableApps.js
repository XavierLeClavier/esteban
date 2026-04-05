export const OPENABLE_APPS_CATALOG = {
  deezer: {
    key: "deezer",
    name: "Deezer",
    appUrls: ["deezer://", "deezer://www.deezer.com"],
    fallbackUrl: "https://www.deezer.com",
    enabledByDefault: true,
  },
  spotify: {
    key: "spotify",
    name: "Spotify",
    appUrls: ["spotify://"],
    fallbackUrl: "https://open.spotify.com",
    enabledByDefault: false,
  },
  youtube: {
    key: "youtube",
    name: "YouTube",
    appUrls: ["vnd.youtube://", "youtube://"],
    fallbackUrl: "https://www.youtube.com",
    enabledByDefault: true,
  },
  phone: {
    key: "phone",
    name: "Phone",
    appUrls: ["tel:"],
    enabledByDefault: true,
  },
  contacts: {
    key: "contacts",
    name: "Contacts",
    appUrls: ["contacts://"],
    enabledByDefault: true,
  },
  messages: {
    key: "messages",
    name: "Messages",
    appUrls: ["sms:"],
    enabledByDefault: true,
  },
  navigator: {
    key: "navigator",
    name: "Navigator",
    appUrls: [],
    fallbackUrl: "https://www.qwant.com",
    enabledByDefault: true,
  },
};

export function getDefaultAppToggles() {
  return Object.fromEntries(
    Object.entries(OPENABLE_APPS_CATALOG).map(([key, app]) => [key, Boolean(app.enabledByDefault)])
  );
}
