from flask import Response, jsonify, request, stream_with_context

from ..models.message import ChatMessage
from ..services.chat_service import ChatService


class ChatController:
	"""Controller for chat endpoints."""

	def __init__(self, chat_service: ChatService):
		self.chat_service = chat_service

	def chat_stream(self):
		"""Stream model output.
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
		context_block = self.chat_service.format_context(payload.get("context"))
		history_block = self.chat_service.format_history(payload.get("history"))
		allowed_apps = payload.get("allowed_apps")
		if not isinstance(allowed_apps, list):
			allowed_apps = []
		tools_block = self.chat_service.format_tools(allowed_apps)

		def generate():
			for chunk in self.chat_service.stream_response(
				question=question,
				context_block=context_block,
				history_block=history_block,
				tools_block=tools_block,
			):
				yield chunk

		return Response(stream_with_context(generate()), mimetype="text/plain")

	def chat_action_decision(self):
		"""Return LLM decision on whether to open an allowed app.
		---
		consumes:
		  - application/json
		produces:
		  - application/json
		parameters:
		  - in: body
		    name: body
		    required: true
		    schema:
		      type: object
		      properties:
		        question:
		          type: string
		        context:
		          oneOf:
		            - type: string
		            - type: array
		              items:
		                type: string
		            - type: object
		        history:
		          type: array
		          items:
		            type: object
		            properties:
		              role:
		                type: string
		              content:
		                type: string
		        allowed_apps:
		          type: array
		          items:
		            type: string
		responses:
		  200:
		    description: Decision object with action and app
		"""
		payload = request.get_json(silent=True) or {}
		question = str(payload.get("question", "")).strip()
		context_block = self.chat_service.format_context(payload.get("context"))
		history_block = self.chat_service.format_history(payload.get("history"))
		allowed_apps = payload.get("allowed_apps")

		if not isinstance(allowed_apps, list):
			allowed_apps = []

		decision = self.chat_service.decide_action(
			question=question,
			context_block=context_block,
			history_block=history_block,
			allowed_apps=allowed_apps,
		)

		return jsonify(decision)
