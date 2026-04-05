from dataclasses import dataclass
from typing import Any


@dataclass
class ServiceHealth:
	"""Health status of a service."""
	name: str
	status: str

	def to_dict(self) -> dict[str, str]:
		return {"name": self.name, "status": self.status}


@dataclass
class HealthStatus:
	"""Overall health status of the API."""
	status: str
	services: dict[str, str]
	config: dict[str, Any]

	def to_dict(self) -> dict[str, Any]:
		return {
			"status": self.status,
			"services": self.services,
			"config": self.config,
		}
