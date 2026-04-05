"""Helpers for working with the Deezer API."""

from __future__ import annotations

import os
from typing import Any

import requests
from dotenv import load_dotenv


load_dotenv()


DEEZER_API_BASE_URL = os.getenv("DEEZER_API_BASE_URL", "https://api.deezer.com")
DEEZER_APP_ID = os.getenv("DEEZER_APP_ID", "")
DEEZER_APP_SECRET = os.getenv("DEEZER_APP_SECRET", "")
DEEZER_REDIRECT_URI = os.getenv("DEEZER_REDIRECT_URI", "")
DEEZER_ACCESS_TOKEN = os.getenv("DEEZER_ACCESS_TOKEN", "")


def search_tracks(query: str, limit: int = 10) -> dict[str, Any]:
	"""Search Deezer tracks by keyword.

	This is an example tool function that can be reused by the chat service or
	by a future tool registry.
	"""
	clean_query = query.strip()
	if not clean_query:
		raise ValueError("query must not be empty")

	params: dict[str, Any] = {"q": clean_query, "limit": limit}
	if DEEZER_ACCESS_TOKEN:
		params["access_token"] = DEEZER_ACCESS_TOKEN

	response = requests.get(
		f"{DEEZER_API_BASE_URL.rstrip('/')}/search",
		params=params,
		timeout=15,
	)
	response.raise_for_status()

	return {
		"query": clean_query,
		"limit": limit,
		"data": response.json(),
		"config": {
			"api_base_url": DEEZER_API_BASE_URL,
			"has_app_id": bool(DEEZER_APP_ID),
			"has_app_secret": bool(DEEZER_APP_SECRET),
			"has_redirect_uri": bool(DEEZER_REDIRECT_URI),
			"has_access_token": bool(DEEZER_ACCESS_TOKEN),
		},
	}
