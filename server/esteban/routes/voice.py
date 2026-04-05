from ..services.chat_service import ChatService
from ..services.stt_service import STTService
from ..services.voice_websocket_service import VoiceWebSocketService


def register_voice_routes(sock) -> None:
	# Initialize services
	chat_service = ChatService()
	stt_service = STTService()
	websocket_service = VoiceWebSocketService(chat_service, stt_service)

	@sock.route("/voice/realtime")
	def voice_realtime(ws):
		"""Bidirectional realtime voice endpoint over WebSocket.

		Client sends base64-encoded audio chunks. Server emits transcript deltas
		as they are understood and, after stop, streams LLM answer chunks.
		"""
		websocket_service.handle_voice_session(ws)
