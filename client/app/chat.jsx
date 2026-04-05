import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { File } from "expo-file-system";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import ChatComposer from "../components/chat/ChatComposer";
import ChatHeader from "../components/chat/ChatHeader";
import MessageBubble from "../components/chat/MessageBubble";
import TypingIndicator from "../components/chat/TypingIndicator";
import useOpenableApps from "../hooks/useOpenableApps";
import { decideChatAction, getRealtimeVoiceWebSocketUrl, streamChat } from "../services/api";

async function openAppByKey(appKey, appConfigsByKey) {
  const appConfig = appConfigsByKey[appKey];
  if (!appConfig) {
    throw new Error("Unsupported app.");
  }

  for (const appUrl of appConfig.appUrls || []) {
    try {
      await Linking.openURL(appUrl);
      return { opened: true, appName: appConfig.name };
    } catch {
      // Try the next deeplink variant.
    }
  }

  if (appConfig.fallbackUrl) {
    await Linking.openURL(appConfig.fallbackUrl);
    return { opened: false, appName: appConfig.name };
  }

  throw new Error(`${appConfig.name} is not installed on this device.`);
}

const Chat = () => {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi, I am Esteban. Ask me anything and I will answer with your self-hosted local model.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isVoiceFinalizing, setIsVoiceFinalizing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [error, setError] = useState("");
  const xhrRef = useRef(null);
  const wsRef = useRef(null);
  const chunkIntervalRef = useRef(null);
  const isFlushingRef = useRef(false);
  const isVoiceActiveRef = useRef(false);
  const voiceAssistantMessageIdRef = useRef(null);
  const scrollRef = useRef(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const { enabledAppKeys, enabledAppConfigsByKey, reloadAppSettings } = useOpenableApps();

  const wsUrl = useMemo(() => getRealtimeVoiceWebSocketUrl(), []);

  const requestContext = useMemo(
    () => ({
      assistant: "Esteban",
      deployment: "self-hosted",
      client: "react-native",
      style: "helpful and concise",
    }),
    []
  );

  useEffect(() => {
    return () => {
      if (xhrRef.current) {
        xhrRef.current.abort();
      }
      if (chunkIntervalRef.current) {
        clearInterval(chunkIntervalRef.current);
      }
      try {
        recorder?.stop?.().catch(() => {});
      } catch {
        // Ignore teardown race where the native recorder has already been released.
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [recorder]);

  useFocusEffect(
    useCallback(() => {
      reloadAppSettings();
      return undefined;
    }, [reloadAppSettings])
  );

  const handleComposerFocus = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const setVoiceActiveState = useCallback((value) => {
    isVoiceActiveRef.current = value;
    setIsVoiceActive(value);
  }, []);

  const startChunkRecording = useCallback(async () => {
    await recorder.prepareToRecordAsync();
    recorder.record();
  }, [recorder]);

  const flushCurrentChunk = useCallback(
    async (restartAfterFlush) => {
      if (isFlushingRef.current) {
        return;
      }
      if (!recorder?.isRecording) {
        if (restartAfterFlush && isVoiceActiveRef.current) {
          await startChunkRecording();
        }
        return;
      }

      isFlushingRef.current = true;

      try {
        let uri = recorder.uri;
        try {
          await recorder.stop();
          uri = recorder.uri;
        } catch (err) {
          const message = String(err?.message || err || "").toLowerCase();
          // Some Android devices throw "stop failed" when stopping very short chunks.
          if (!message.includes("stop failed")) {
            throw err;
          }
          uri = recorder.uri;
        }

        if (uri && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const audioFile = new File(uri);
          const audioB64 = await audioFile.base64();
          wsRef.current.send(
            JSON.stringify({
              type: "audio_chunk",
              encoding: "m4a_chunk",
              audio_b64: audioB64,
            })
          );

          try {
            audioFile.delete();
          } catch {
            // Ignore cleanup errors for temporary chunk files.
          }
        }
      } finally {
        isFlushingRef.current = false;
      }

      if (restartAfterFlush && isVoiceActiveRef.current) {
        await startChunkRecording();
      }
    },
    [recorder, startChunkRecording]
  );

  const startVoiceSession = useCallback(async () => {
    try {
      setError("");
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError("Microphone permission is required for voice input.");
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      const historyPayload = messages
        .filter((item) => item.content.trim())
        .map((item) => ({ role: item.role, content: item.content }));

      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;
      setLiveTranscript("");
      setIsVoiceFinalizing(false);
      voiceAssistantMessageIdRef.current = null;

      socket.onopen = async () => {
        socket.send(
          JSON.stringify({
            type: "start",
            encoding: "m4a_chunk",
            language: "en",
            context: requestContext,
            history: historyPayload,
          })
        );

        setVoiceActiveState(true);
        await startChunkRecording();

        chunkIntervalRef.current = setInterval(() => {
          flushCurrentChunk(true).catch((err) => {
            setError(err?.message || "Failed while sending audio chunks.");
          });
        }, 1700);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === "transcript_chunk") {
            const delta = payload.text || "";
            if (!delta) {
              return;
            }
            setLiveTranscript((prev) => `${prev}${delta}`);
            return;
          }

          if (payload.type === "transcript_final") {
            const finalText = (payload.text || "").trim();
            setIsVoiceFinalizing(false);
            setLiveTranscript("");

            if (!finalText) {
              setLoading(false);
              return;
            }

            const userMessage = {
              id: `voice-user-${Date.now()}`,
              role: "user",
              content: finalText,
            };
            const assistantId = `voice-assistant-${Date.now()}`;
            voiceAssistantMessageIdRef.current = assistantId;

            setMessages((prev) => [
              ...prev,
              userMessage,
              { id: assistantId, role: "assistant", content: "" },
            ]);
            setLoading(true);
            return;
          }

          if (payload.type === "answer_chunk") {
            const chunk = payload.text || "";
            if (!chunk || !voiceAssistantMessageIdRef.current) {
              return;
            }

            setMessages((prev) =>
              prev.map((item) =>
                item.id === voiceAssistantMessageIdRef.current
                  ? { ...item, content: `${item.content}${chunk}` }
                  : item
              )
            );
            return;
          }

          if (payload.type === "answer_done") {
            setLoading(false);
            voiceAssistantMessageIdRef.current = null;
            wsRef.current?.close();
            return;
          }

          if (payload.type === "error") {
            setError(payload.message || "Voice realtime error.");
            setLoading(false);
            setIsVoiceFinalizing(false);
            wsRef.current?.close();
          }
        } catch {
          setError("Failed to parse realtime message.");
        }
      };

      socket.onerror = () => {
        setError("WebSocket connection failed.");
      };

      socket.onclose = () => {
        setVoiceActiveState(false);
        setIsVoiceFinalizing(false);
        if (chunkIntervalRef.current) {
          clearInterval(chunkIntervalRef.current);
          chunkIntervalRef.current = null;
        }
      };
    } catch (err) {
      setError(err?.message || "Unable to start voice recording.");
    }
  }, [flushCurrentChunk, messages, requestContext, setVoiceActiveState, startChunkRecording, wsUrl]);

  const stopVoiceSession = useCallback(async () => {
    if (!isVoiceActiveRef.current) {
      return;
    }

    try {
      setVoiceActiveState(false);
      setIsVoiceFinalizing(true);
      if (chunkIntervalRef.current) {
        clearInterval(chunkIntervalRef.current);
        chunkIntervalRef.current = null;
      }

      await flushCurrentChunk(false);

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "stop" }));
      }
    } catch (err) {
      setError(err?.message || "Unable to stop voice session cleanly.");
      setIsVoiceFinalizing(false);
    } finally {
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    }
  }, [flushCurrentChunk, setVoiceActiveState]);

  const handleVoiceToggle = useCallback(() => {
    if (isVoiceFinalizing) {
      return;
    }
    if (isVoiceActive) {
      stopVoiceSession();
      return;
    }
    startVoiceSession();
  }, [isVoiceActive, isVoiceFinalizing, startVoiceSession, stopVoiceSession]);

  const handleSend = () => {
    const trimmed = question.trim();
    if (!trimmed || loading || isVoiceActive || isVoiceFinalizing) {
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    const historyPayload = messages
      .filter((item) => item.content.trim())
      .map((item) => ({ role: item.role, content: item.content }));

    setQuestion("");
    setError("");
    setLoading(true);
    setMessages((prev) => [...prev, userMessage]);

    const startStreamingReply = () => {
      const assistantMessageId = `assistant-${Date.now()}`;
      setMessages((prev) => [...prev, { id: assistantMessageId, role: "assistant", content: "" }]);

      xhrRef.current = streamChat({
        question: trimmed,
        context: requestContext,
        history: historyPayload,
        allowedApps: enabledAppKeys,
        onChunk: (nextChunk) => {
          setMessages((prev) =>
            prev.map((item) =>
              item.id === assistantMessageId
                ? { ...item, content: `${item.content}${nextChunk}` }
                : item
            )
          );
        },
        onError: (message) => {
          setLoading(false);
          setError(message);
        },
        onDone: () => {
          setLoading(false);
        },
      });
    };

    decideChatAction({
      question: trimmed,
      context: requestContext,
      history: historyPayload,
      allowedApps: enabledAppKeys,
    })
      .then((decision) => {
        const shouldOpen =
          decision?.action === "open_app" && decision?.app && enabledAppConfigsByKey[decision.app];
        if (!shouldOpen) {
          startStreamingReply();
          return;
        }

        openAppByKey(decision.app, enabledAppConfigsByKey)
          .then(({ opened, appName }) => {
            const assistantMessage = {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: opened
                ? `Opening ${appName}.`
                : `${appName} is not installed. I opened the web version instead.`,
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setLoading(false);
          })
          .catch((err) => {
            const assistantMessage = {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: `I could not open that app: ${err?.message || "unknown error"}`,
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setLoading(false);
          });
      })
      .catch(() => {
        startStreamingReply();
      });
  };

  const handlePrimaryAction = () => {
    if (loading && xhrRef.current) {
      xhrRef.current.abort();
      return;
    }
    if (loading && wsRef.current) {
      wsRef.current.close();
      setLoading(false);
      return;
    }
    handleSend();
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-950"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 82 : 0}
    >
      <ChatHeader />

      <ScrollView
        ref={scrollRef}
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 14, paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((item) => (
          <MessageBubble
            key={item.id}
            role={item.role}
            content={item.content || (loading ? "..." : "")}
          />
        ))}

        {liveTranscript ? (
          <View className="mb-3 max-w-[86%] self-end rounded-2xl border border-cyan-500/40 bg-slate-900 px-4 py-3">
            <Text className="text-cyan-300">{liveTranscript}</Text>
          </View>
        ) : null}

        {loading && <TypingIndicator />}

        {error && (
          <View className="mb-4 self-center rounded-lg border border-red-900 bg-red-950/80 px-3 py-2">
            <Text className="text-red-300">{error}</Text>
          </View>
        )}
      </ScrollView>

      <ChatComposer
        value={question}
        onChangeText={setQuestion}
        onSend={handlePrimaryAction}
        onVoiceToggle={handleVoiceToggle}
        onInputFocus={handleComposerFocus}
        loading={loading}
        recording={isVoiceActive}
        transcribing={isVoiceFinalizing}
      />
    </KeyboardAvoidingView>
  );
};

export default Chat;