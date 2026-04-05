const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://127.0.0.1:5000"
).replace(/\/$/, "");

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getRealtimeVoiceWebSocketUrl() {
  if (API_BASE_URL.startsWith("https://")) {
    return `${API_BASE_URL.replace("https://", "wss://")}/voice/realtime`;
  }
  return `${API_BASE_URL.replace("http://", "ws://")}/voice/realtime`;
}

export function streamChat({ question, context, history, onChunk, onError, onDone }) {
  const xhr = new XMLHttpRequest();
  let processedLength = 0;

  xhr.open("POST", `${API_BASE_URL}/chat/stream`);
  xhr.setRequestHeader("Content-Type", "application/json");

  xhr.onprogress = () => {
    const nextChunk = xhr.responseText.slice(processedLength);
    if (!nextChunk) {
      return;
    }
    processedLength = xhr.responseText.length;
    onChunk?.(nextChunk);
  };

  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      onDone?.();
      return;
    }
    onError?.(xhr.responseText || `API error: ${xhr.status}`);
  };

  xhr.onerror = () => {
    onError?.("Network error while streaming response.");
  };

  xhr.onabort = () => {
    onDone?.();
  };

  xhr.send(
    JSON.stringify({
      question,
      context,
      history,
    })
  );

  return xhr;
}

export async function transcribeAudio({ uri, mimeType = "audio/m4a", language = "en" }) {
  const formData = new FormData();
  formData.append("audio", {
    uri,
    name: "recording.m4a",
    type: mimeType,
  });
  formData.append("language", language);

  const response = await fetch(`${API_BASE_URL}/voice/transcribe`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Transcription failed (${response.status})`);
  }

  return data;
}
