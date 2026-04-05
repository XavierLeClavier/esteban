import base64
import json
from typing import Optional

from ..services.chat_service import ChatService
from ..services.stt_service import STTService


class VoiceWebSocketService:
	"""Service for handling realtime voice WebSocket connections."""

	def __init__(self, chat_service: ChatService, stt_service: STTService):
		self.chat_service = chat_service
		self.stt_service = stt_service

	@staticmethod
	def suffix_delta(last_text: str, current_text: str) -> str:
		"""Extract the new text added since last_text."""
		if current_text.startswith(last_text):
			return current_text[len(last_text) :]
		return current_text

	def handle_voice_session(self, ws) -> None:
		"""Handle a WebSocket voice session."""
		sample_rate = 16000
		encoding = "pcm16"
		language_hint: Optional[str] = None
		context_payload = None
		history_payload = None
		audio_buffer = bytearray()
		transcript_chunks = []
		last_partial = ""
		started = False
		chunk_counter = 0

		def send_event(payload: dict):
			ws.send(json.dumps(payload))

		while True:
			raw_message = ws.receive()
			if raw_message is None:
				return

			try:
				message = json.loads(raw_message)
			except json.JSONDecodeError:
				send_event({"type": "error", "message": "Invalid JSON payload."})
				continue

			event_type = message.get("type")

			if event_type == "start":
				sample_rate = int(message.get("sample_rate", 16000))
				encoding = (message.get("encoding") or "pcm16").strip() or "pcm16"
				language_hint = (message.get("language") or "").strip() or None
				context_payload = message.get("context")
				history_payload = message.get("history")
				audio_buffer = bytearray()
				transcript_chunks = []
				last_partial = ""
				chunk_counter = 0
				started = True
				send_event({"type": "ack", "stage": "started", "encoding": encoding})
				continue

			if event_type == "audio_chunk":
				if not started:
					send_event({"type": "error", "message": "Send 'start' before audio chunks."})
					continue

				audio_b64 = message.get("audio_b64")
				if not audio_b64:
					send_event({"type": "error", "message": "Missing audio_b64 in audio_chunk event."})
					continue

				try:
					audio_bytes = base64.b64decode(audio_b64)
				except Exception:
					send_event({"type": "error", "message": "audio_b64 is not valid base64."})
					continue

				chunk_counter += 1
				incoming_encoding = (message.get("encoding") or encoding).strip() or encoding

				try:
					if incoming_encoding == "pcm16":
						audio_buffer.extend(audio_bytes)
						partial_text = self.stt_service.transcribe_pcm16_bytes(
							bytes(audio_buffer), sample_rate, language_hint
						)
						delta = self.suffix_delta(last_partial, partial_text)
						if delta:
							send_event({"type": "transcript_chunk", "text": delta})
						last_partial = partial_text
						continue

					suffix_map = {
						"m4a_chunk": ".m4a",
						"webm_chunk": ".webm",
						"ogg_chunk": ".ogg",
						"wav_chunk": ".wav",
					}
					suffix = suffix_map.get(incoming_encoding)
					if not suffix:
						send_event(
							{"type": "error", "message": f"Unsupported chunk encoding: {incoming_encoding}"}
						)
						continue

					chunk_text = self.stt_service.transcribe_media_bytes(audio_bytes, suffix, language_hint).strip()
					if chunk_text:
						transcript_chunks.append(chunk_text)
						send_event({"type": "transcript_chunk", "text": f"{chunk_text} "})
				except Exception as exc:
					send_event({"type": "error", "message": f"Realtime transcription failed: {exc}"})
				continue

			if event_type == "stop":
				if not started:
					send_event({"type": "error", "message": "Send 'start' before stop."})
					continue

				try:
					if encoding == "pcm16":
						final_text = self.stt_service.transcribe_pcm16_bytes(
							bytes(audio_buffer), sample_rate, language_hint
						)
					else:
						final_text = " ".join(transcript_chunks).strip()
				except Exception as exc:
					send_event({"type": "error", "message": f"Final transcription failed: {exc}"})
					continue

				send_event({"type": "transcript_final", "text": final_text})

				question = final_text.strip()
				if not question:
					send_event({"type": "answer_done"})
					return

				context_block = self.chat_service.format_context(context_payload)
				history_block = self.chat_service.format_history(history_payload)

				try:
					for chunk in self.chat_service.stream_response(
						question=question,
						context_block=context_block,
						history_block=history_block,
					):
						send_event({"type": "answer_chunk", "text": chunk})
				except Exception as exc:
					send_event({"type": "error", "message": f"Answer generation failed: {exc}"})
					return

				send_event({"type": "answer_done"})
				return

			send_event({"type": "error", "message": f"Unsupported event type: {event_type}"})
