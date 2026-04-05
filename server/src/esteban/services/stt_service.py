import os
import tempfile
import wave
from typing import Any, Optional

from ..models.transcription import TranscriptionResult, TranscriptionSegment


class STTService:
	"""Service for Speech-To-Text transcription operations."""

	def __init__(self):
		self.model = None
		self.model_size = os.getenv("ESTEBAN_STT_MODEL", "base")
		self.device = os.getenv("ESTEBAN_STT_DEVICE", "cpu")
		self.compute_type = os.getenv("ESTEBAN_STT_COMPUTE_TYPE", "int8")

	def _load_model(self):
		"""Lazy-load the Whisper model."""
		if self.model is not None:
			return self.model

		try:
			from faster_whisper import WhisperModel
		except ImportError as exc:
			raise RuntimeError(
				"Voice transcription dependency missing. Install faster-whisper in server environment."
			) from exc

		self.model = WhisperModel(
			self.model_size,
			device=self.device,
			compute_type=self.compute_type,
		)
		return self.model

	def _extract_transcript(self, segments: Any) -> str:
		"""Extract text from transcription segments."""
		segment_list = list(segments)
		return " ".join(segment.text.strip() for segment in segment_list if segment.text.strip()).strip()

	def transcribe_pcm16_bytes(
		self,
		pcm_bytes: bytes,
		sample_rate: int,
		language_hint: Optional[str] = None,
	) -> str:
		"""Transcribe PCM16 audio bytes."""
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

			stt_model = self._load_model()
			segments, _ = stt_model.transcribe(
				tmp_path,
				language=language_hint,
				vad_filter=True,
			)
			return self._extract_transcript(segments)
		finally:
			if os.path.exists(tmp_path):
				os.remove(tmp_path)

	def transcribe_media_bytes(
		self,
		media_bytes: bytes,
		suffix: str,
		language_hint: Optional[str] = None,
	) -> str:
		"""Transcribe media file bytes."""
		if not media_bytes:
			return ""

		with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
			tmp_file.write(media_bytes)
			tmp_path = tmp_file.name

		try:
			stt_model = self._load_model()
			segments, _ = stt_model.transcribe(
				tmp_path,
				language=language_hint,
				vad_filter=True,
			)
			return self._extract_transcript(segments)
		finally:
			if os.path.exists(tmp_path):
				os.remove(tmp_path)

	def transcribe_file(
		self,
		file_path: str,
		language_hint: Optional[str] = None,
	) -> TranscriptionResult:
		"""Transcribe audio file and return structured result."""
		stt_model = self._load_model()
		segments, info = stt_model.transcribe(
			file_path,
			language=language_hint,
			vad_filter=True,
		)
		segment_list = list(segments)
		text = self._extract_transcript(segment_list)

		transcription_segments = [
			TranscriptionSegment(text=seg.text.strip(), start_time=seg.start, end_time=seg.end)
			for seg in segment_list
			if seg.text.strip()
		]

		duration_seconds = max((seg.end for seg in segment_list), default=0.0) if segment_list else 0.0

		return TranscriptionResult(
			text=text,
			language=getattr(info, "language", None),
			duration_ms=int(duration_seconds * 1000),
			segments=transcription_segments,
		)
