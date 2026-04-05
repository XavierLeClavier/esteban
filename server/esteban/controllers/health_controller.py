from flask import jsonify

from ..services.health_service import HealthService


class HealthController:
	"""Controller for health check endpoints."""

	def __init__(self, health_service: HealthService):
		self.health_service = health_service

	def hello_world(self):
		"""Welcome message."""
		return jsonify({"status": "ok", "message": "Use POST /chat/stream"})

	def health(self):
		"""Health check.
		---
		produces:
		  - application/json
		responses:
		  200:
		    description: Health status of API services
		"""
		health_status = self.health_service.get_health_status()
		return jsonify(health_status.to_dict())

	def voice_realtime_info(self):
		"""Realtime voice protocol info.
		---
		produces:
		  - application/json
		responses:
		  200:
		    description: Protocol description for websocket realtime voice endpoint
		"""
		return jsonify(self.health_service.get_voice_protocol_info())
