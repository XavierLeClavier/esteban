import json
import re
from typing import Any, Generator

from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama.llms import OllamaLLM


class ChatService:
	"""Service for chat and LLM operations."""

	def __init__(self):
		self.template = """You are Esteban, an AI assistant developed by Super Sympa Industries.
		You are powered by fully local LLM models that the user can self-host.
		Your personality is by default factual and professional, but this can change based on user request.

		Tools available to you:
		{tools_block}

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
		tools_block: str,
	) -> Generator[str, None, None]:
		"""Stream LLM response."""
		for chunk in self.chain.stream({
			"question": question,
			"context_block": context_block,
			"history_block": history_block,
			"tools_block": tools_block,
		}):
			yield chunk

	def format_tools(self, allowed_apps: list[str] | None = None) -> str:
		"""Return a compact list of tools that the assistant can use."""
		normalized_allowed = [
			app.strip().lower()
			for app in (allowed_apps or [])
			if isinstance(app, str) and app.strip()
		]

		if normalized_allowed:
			apps_text = ", ".join(normalized_allowed)
			return (
				"- open_app(app_key): opens an installed mobile app from an allowlist. "
				f"Allowed app_key values right now: {apps_text}."
			)

		return (
			"- open_app(app_key): available, but no allowed apps are configured for this request; "
			"do not attempt to use it."
		)

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

	def decide_action(
		self,
		question: str,
		context_block: str,
		history_block: str,
		allowed_apps: list[str],
	) -> dict[str, Any]:
		"""Ask the LLM if an app should be opened.

		Returns a dict with:
		- action: "open_app" or "none"
		- app: lowercase app key or None
		- reason: short text reason
		"""
		normalized_allowed = [app.strip().lower() for app in allowed_apps if app and app.strip()]
		if not normalized_allowed:
			return {
				"action": "none",
				"app": None,
				"reason": "No allowed apps configured.",
			}

		tools_block = self.format_tools(normalized_allowed)

		decision_prompt = f"""You are an intent classifier for the Esteban assistant.

Tools available to the assistant:
{tools_block}

Allowed app keys: {", ".join(normalized_allowed)}

Rules:
1) Choose action \"open_app\" only when the user explicitly asks to open/launch/start an allowed app.
2) If the user is asking a question about an app (not asking to open it), choose \"none\".
3) Never output an app that is not in the allowed list.
4) Output JSON only, no markdown, no explanation outside JSON.

Required JSON schema:
{{"action":"open_app"|"none","app":string|null,"reason":string}}

Context:
{context_block}

History:
{history_block}

User request:
{question}
"""

		raw_response = str(self.model.invoke(decision_prompt) or "").strip()
		match = re.search(r"\{.*\}", raw_response, re.DOTALL)
		json_text = match.group(0) if match else raw_response

		try:
			parsed = json.loads(json_text)
		except json.JSONDecodeError:
			return {
				"action": "none",
				"app": None,
				"reason": "Failed to parse LLM action decision.",
			}

		action = str(parsed.get("action", "none")).strip().lower()
		app = parsed.get("app")
		app_key = str(app).strip().lower() if app is not None else None
		reason = str(parsed.get("reason", "No reason provided.")).strip() or "No reason provided."

		if action == "open_app" and app_key in normalized_allowed:
			return {
				"action": "open_app",
				"app": app_key,
				"reason": reason,
			}

		return {
			"action": "none",
			"app": None,
			"reason": reason,
		}
