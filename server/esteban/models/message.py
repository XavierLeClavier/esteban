from dataclasses import dataclass
from typing import Any


@dataclass
class ChatMessage:
	"""Represents a chat message."""
	role: str
	content: str

	def to_dict(self) -> dict[str, str]:
		return {"role": self.role, "content": self.content}

	@classmethod
	def from_dict(cls, data: dict[str, Any]) -> "ChatMessage":
		return cls(
			role=str(data.get("role", "user")).strip() or "user",
			content=str(data.get("content", "")).strip(),
		)
