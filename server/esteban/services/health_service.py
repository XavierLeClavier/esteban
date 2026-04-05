from typing import Any

from ..models.health import HealthStatus


class HealthService:
	"""Service for health checks and system information."""

	def __init__(self, stt_device: str, stt_model_size: str, stt_compute_type: str):
		self.stt_device = stt_device
		self.stt_model_size = stt_model_size
		self.stt_compute_type = stt_compute_type

	def get_health_status(self) -> HealthStatus:
		"""Get overall health status."""
		return HealthStatus(
			status="ok",
			services={
				"llm": "ready",
				"stt": "configured",
			},
			config={
				"stt_model": self.stt_model_size,
				"stt_device": self.stt_device,
				"stt_compute_type": self.stt_compute_type,
			},
		)

	def get_voice_protocol_info(self) -> dict[str, Any]:
		"""Get WebSocket realtime voice protocol information."""
		return {
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
