from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama.llms import OllamaLLM
from flask import Flask, Response, jsonify, request, stream_with_context
from flask_cors import CORS
from flasgger import Swagger
from typing import Any
import os
import tempfile
import base64
import json
import wave
from flask_sock import Sock

app = Flask(__name__)
app.config["SWAGGER"] = {
    "title": "Esteban API",
    "uiversion": 3,
}
CORS(app, resources={r"/*": {"origins": "*"}})
swagger = Swagger(app)
sock = Sock(app)

template = """You are Esteban, an AI assistant powered by fully local LLM models that the user can self-host.
Your personality is by default factual and professional, but this can change based on user request.

Context for this request:
{context_block}

Recent conversation history:
{history_block}

Current user request: {question}"""

prompt = ChatPromptTemplate.from_template(template)

model = OllamaLLM(model="llama3.2:3b")

chain = prompt | model
STT_MODEL = None
STT_MODEL_SIZE = os.getenv("ESTEBAN_STT_MODEL", "base")
STT_DEVICE = os.getenv("ESTEBAN_STT_DEVICE", "cpu")
STT_COMPUTE_TYPE = os.getenv("ESTEBAN_STT_COMPUTE_TYPE", "int8")


def _format_context(raw_context: Any) -> str:
	if raw_context is None:
		return "No additional context provided."
	if isinstance(raw_context, str):
		stripped = raw_context.strip()
		return stripped if stripped else "No additional context provided."
	if isinstance(raw_context, list):
		entries = [str(item).strip() for item in raw_context if str(item).strip()]
		return "\n".join(f"- {entry}" for entry in entries) if entries else "No additional context provided."
	if isinstance(raw_context, dict):
		entries = [f"{key}: {value}" for key, value in raw_context.items()]
		return "\n".join(entries) if entries else "No additional context provided."
	return str(raw_context)


def _format_history(history: Any) -> str:
	if not isinstance(history, list) or not history:
		return "No prior conversation history."

	lines = []
	for item in history:
		if not isinstance(item, dict):
			continue
		role = str(item.get("role", "user")).strip() or "user"
		content = str(item.get("content", "")).strip()
		if not content:
			continue
		lines.append(f"{role}: {content}")

	return "\n".join(lines) if lines else "No prior conversation history."


def _load_stt_model():
	global STT_MODEL
	if STT_MODEL is not None:
		return STT_MODEL

	try:
		from faster_whisper import WhisperModel
	except ImportError as exc:
		raise RuntimeError(
			"Voice transcription dependency missing. Install faster-whisper in server environment."
		) from exc

	STT_MODEL = WhisperModel(
		STT_MODEL_SIZE,
		device=STT_DEVICE,
		compute_type=STT_COMPUTE_TYPE,
	)
	return STT_MODEL


def _extract_transcript(segments) -> str:
	segment_list = list(segments)
	return " ".join(segment.text.strip() for segment in segment_list if segment.text.strip()).strip()


def _transcribe_pcm16_bytes(pcm_bytes: bytes, sample_rate: int, language_hint: str | None) -> str:
	if not pcm_bytes:
		return ""

	with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
		tmp_path = tmp_file.name

	try:
		with wave.open(tmp_path, "wb") as wav_file:
			wav_file.setnchannels(1)
			wav_file.setsampwidth(2)
			wav_file.setframerate(sample_rate)
			wav_file.writeframes(pcm_bytes)

		stt_model = _load_stt_model()
		segments, _ = stt_model.transcribe(
			tmp_path,
			language=language_hint,
			vad_filter=True,
		)
		return _extract_transcript(segments)
	finally:
		if os.path.exists(tmp_path):
			os.remove(tmp_path)


def _transcribe_media_bytes(media_bytes: bytes, suffix: str, language_hint: str | None) -> str:
	if not media_bytes:
		return ""

	with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
		tmp_file.write(media_bytes)
		tmp_path = tmp_file.name

	try:
		stt_model = _load_stt_model()
		segments, _ = stt_model.transcribe(
			tmp_path,
			language=language_hint,
			vad_filter=True,
		)
		return _extract_transcript(segments)
	finally:
		if os.path.exists(tmp_path):
			os.remove(tmp_path)


def _suffix_delta(previous: str, current: str) -> str:
	if not current:
		return ""
	if not previous:
		return current
	if current.startswith(previous):
		return current[len(previous):]
	return current


@app.get("/")
def hello_world():
	return jsonify({"status": "ok", "message": "Use POST /chat/stream"})


@app.get("/voice/realtime-info")
def voice_realtime_info():
	"""Realtime voice protocol info
	---
	produces:
	  - application/json
	responses:
	  200:
	    description: Protocol description for websocket realtime voice endpoint
	"""
	return jsonify(
		{
			"websocket_route": "/voice/realtime",
			"client_events": {
				"start": {
					"type": "start",
					"sample_rate": 16000,
					"encoding": "m4a_chunk",
					"language": "en",
					"context": {"assistant": "Esteban"},
					"history": [{"role": "user", "content": "..."}],
				},
				"audio_chunk": {
					"type": "audio_chunk",
					"audio_b64": "base64_audio_chunk",
					"encoding": "m4a_chunk",
				},
				"stop": {"type": "stop"},
			},
			"server_events": {
				"transcript_chunk": {
					"type": "transcript_chunk",
					"text": "incremental transcript delta",
				},
				"transcript_final": {
					"type": "transcript_final",
					"text": "final transcript",
				},
				"answer_chunk": {
					"type": "answer_chunk",
					"text": "assistant delta chunk",
				},
				"answer_done": {"type": "answer_done"},
				"error": {"type": "error", "message": "description"},
			},
		}
	)


@app.get("/health")
def health():
	"""Health check
	---
	produces:
	  - application/json
	responses:
	  200:
	    description: Health status of API services
	"""
	return jsonify(
		{
			"status": "ok",
			"services": {
				"llm": "ready",
				"stt": "configured",
			},
			"config": {
				"stt_model": STT_MODEL_SIZE,
				"stt_device": STT_DEVICE,
				"stt_compute_type": STT_COMPUTE_TYPE,
			},
		}
	)


@app.post("/chat/stream")
def chat_stream():
	"""Stream model output
	---
	consumes:
	  - application/json
	produces:
	  - text/plain
	parameters:
	  - in: body
	    name: body
	    required: false
	    schema:
	      type: object
	      properties:
	        question:
	          type: string
	          example: What is Australia's national anthem ?
	        context:
	          oneOf:
	            - type: string
	            - type: array
	              items:
	                type: string
	            - type: object
	          example: User is preparing a travel plan to Sydney and prefers concise answers.
	        history:
	          type: array
	          items:
	            type: object
	            properties:
	              role:
	                type: string
	                example: user
	              content:
	                type: string
	                example: Give me key landmarks in Sydney.
	responses:
	  200:
	    description: Streamed plain-text model output
	"""
	payload = request.get_json(silent=True) or {}
	question = payload.get("question", "What is Australia's national anthem ?")
	context_block = _format_context(payload.get("context"))
	history_block = _format_history(payload.get("history"))

	def generate():
		for chunk in chain.stream(
			{
				"question": question,
				"context_block": context_block,
				"history_block": history_block,
			}
		):
			yield chunk

	return Response(stream_with_context(generate()), mimetype="text/plain")


@app.post("/voice/transcribe")
def voice_transcribe():
	"""Transcribe user voice to text
	---
	consumes:
	  - multipart/form-data
	produces:
	  - application/json
	parameters:
	  - in: formData
	    name: audio
	    type: file
	    required: true
	    description: Audio file recorded from client microphone (wav, m4a, mp3, webm)
	  - in: formData
	    name: language
	    type: string
	    required: false
	    description: Optional language code hint (for example en, fr)
	responses:
	  200:
	    description: Transcription result
	  400:
	    description: Invalid request
	  500:
	    description: Transcription failed
	"""
	if "audio" not in request.files:
		return jsonify({"error": "Missing audio file in form-data field 'audio'."}), 400

	audio_file = request.files["audio"]
	if not audio_file or not audio_file.filename:
		return jsonify({"error": "Empty audio file."}), 400

	language_hint = (request.form.get("language") or "").strip() or None

	with tempfile.NamedTemporaryFile(delete=False, suffix=".audio") as tmp_file:
		audio_file.save(tmp_file.name)
		tmp_path = tmp_file.name

	try:
		stt_model = _load_stt_model()
		segments, info = stt_model.transcribe(
			tmp_path,
			language=language_hint,
			vad_filter=True,
		)
		segment_list = list(segments)
		text = " ".join(segment.text.strip() for segment in segment_list if segment.text.strip()).strip()

		if not text:
			return jsonify({"text": "", "language": getattr(info, "language", None), "duration_ms": 0}), 200

		duration_seconds = 0.0
		if segment_list:
			duration_seconds = max((seg.end for seg in segment_list), default=0.0)

		return jsonify(
			{
				"text": text,
				"language": getattr(info, "language", language_hint),
				"duration_ms": int(duration_seconds * 1000),
				"segments": [
					{
						"start": float(seg.start),
						"end": float(seg.end),
						"text": seg.text.strip(),
					}
					for seg in segment_list
				],
			}
		)
	except Exception as exc:
		return jsonify({"error": f"Transcription failed: {exc}"}), 500
	finally:
		if os.path.exists(tmp_path):
			os.remove(tmp_path)


@sock.route("/voice/realtime")
def voice_realtime(ws):
	"""Bidirectional realtime voice endpoint over WebSocket.

	Client sends base64-encoded audio chunks. Server emits transcript deltas
	as they are understood and, after stop, streams LLM answer chunks.
	"""
	sample_rate = 16000
	encoding = "pcm16"
	language_hint = None
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
					partial_text = _transcribe_pcm16_bytes(bytes(audio_buffer), sample_rate, language_hint)
					delta = _suffix_delta(last_partial, partial_text)
					if delta:
						send_event({"type": "transcript_chunk", "text": delta})
					last_partial = partial_text
					continue

				# For mobile-friendly container chunks (m4a/webm/ogg), transcribe each chunk independently.
				suffix_map = {
					"m4a_chunk": ".m4a",
					"webm_chunk": ".webm",
					"ogg_chunk": ".ogg",
					"wav_chunk": ".wav",
				}
				suffix = suffix_map.get(incoming_encoding)
				if not suffix:
					send_event({"type": "error", "message": f"Unsupported chunk encoding: {incoming_encoding}"})
					continue

				chunk_text = _transcribe_media_bytes(audio_bytes, suffix, language_hint).strip()
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
					final_text = _transcribe_pcm16_bytes(bytes(audio_buffer), sample_rate, language_hint)
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

			context_block = _format_context(context_payload)
			history_block = _format_history(history_payload)

			try:
				for chunk in chain.stream(
					{
						"question": question,
						"context_block": context_block,
						"history_block": history_block,
					}
				):
					send_event({"type": "answer_chunk", "text": chunk})
			except Exception as exc:
				send_event({"type": "error", "message": f"Answer generation failed: {exc}"})
				return

			send_event({"type": "answer_done"})
			return

		send_event({"type": "error", "message": f"Unsupported event type: {event_type}"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)