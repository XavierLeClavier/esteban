from typing import Any, Generator

from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama.llms import OllamaLLM


class ChatService:
	"""Service for chat and LLM operations."""

	def __init__(self):
		self.template = """You are Esteban, an AI assistant powered by fully local LLM models that the user can self-host.
Your personality is by default factual and professional, but this can change based on user request.

Context for this request:
{context_block}

Recent conversation history:
{history_block}

Current user request: {question}"""
		self.prompt = ChatPromptTemplate.from_template(self.template)
		self.model = OllamaLLM(model="llama3.2:3b")
		self.chain = self.prompt | self.model

	def stream_response(
		self,
		question: str,
		context_block: str,
		history_block: str,
	) -> Generator[str, None, None]:
		"""Stream LLM response."""
		for chunk in self.chain.stream({
			"question": question,
			"context_block": context_block,
			"history_block": history_block,
		}):
			yield chunk

	def format_context(self, raw_context: Any) -> str:
		"""Format context data into a string."""
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

	def format_history(self, history: Any) -> str:
		"""Format conversation history into a string."""
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
