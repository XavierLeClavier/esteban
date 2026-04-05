from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class TranscriptionSegment:
	"""Represents a segment of transcribed audio."""
	text: str
	start_time: float
	end_time: float


@dataclass
class TranscriptionResult:
	"""Represents the result of audio transcription."""
	text: str
	language: Optional[str] = None
	duration_ms: int = 0
	segments: list[TranscriptionSegment] = None

	def __post_init__(self):
		if self.segments is None:
			self.segments = []

	def to_dict(self) -> dict[str, Any]:
		return {
			"text": self.text,
			"language": self.language,
			"duration_ms": self.duration_ms,
			"segments": [
				{"text": seg.text, "start": seg.start_time, "end": seg.end_time}
				for seg in self.segments
			],
		}
