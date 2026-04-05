import os

from ..controllers.chat_controller import ChatController
from ..controllers.health_controller import HealthController
from ..controllers.voice_controller import VoiceController
from ..services.chat_service import ChatService
from ..services.health_service import HealthService
from ..services.stt_service import STTService


def register_http_routes(app) -> None:
	# Initialize services
	chat_service = ChatService()
	stt_service = STTService()
	health_service = HealthService(
		stt_device=os.getenv("ESTEBAN_STT_DEVICE", "cpu"),
		stt_model_size=os.getenv("ESTEBAN_STT_MODEL", "base"),
		stt_compute_type=os.getenv("ESTEBAN_STT_COMPUTE_TYPE", "int8"),
	)

	# Initialize controllers
	chat_controller = ChatController(chat_service)
	health_controller = HealthController(health_service)
	voice_controller = VoiceController(stt_service)

	# Register routes
	@app.get("/")
	def hello_world():
		return health_controller.hello_world()

	@app.get("/health")
	def health():
		return health_controller.health()

	@app.get("/voice/realtime-info")
	def voice_realtime_info():
		return health_controller.voice_realtime_info()

	@app.post("/chat/stream")
	def chat_stream():
		return chat_controller.chat_stream()

	@app.post("/voice/transcribe")
	def voice_transcribe():
		return voice_controller.voice_transcribe()
