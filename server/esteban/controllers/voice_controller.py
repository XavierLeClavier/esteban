import os
import tempfile

from flask import jsonify, request

from ..services.stt_service import STTService


class VoiceController:
	"""Controller for voice endpoints."""

	def __init__(self, stt_service: STTService):
		self.stt_service = stt_service

	def voice_transcribe(self):
		"""Transcribe user voice to text.
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
			result = self.stt_service.transcribe_file(tmp_path, language_hint)
			return jsonify(result.to_dict())
		except Exception as exc:
			return jsonify({"error": f"Transcription failed: {exc}"}), 500
		finally:
			if os.path.exists(tmp_path):
				os.remove(tmp_path)
