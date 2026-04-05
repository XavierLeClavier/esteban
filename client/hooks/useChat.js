import { useState } from "react";
import { chatAPI } from "../services/api";

export function useChat() {
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = async (question) => {
    setLoading(true);
    setError(null);
    setResponse("");

    try {
      const result = await chatAPI.streamChat(question);
      setResponse(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { response, loading, error, sendMessage };
}
