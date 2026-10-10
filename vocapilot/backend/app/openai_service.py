import json
import os
from functools import lru_cache

from openai import AsyncOpenAI


SYSTEM_INSTRUCTIONS = """You are VocaPilot, a friendly shopping assistant for the SauceDemo test store.
Answer ordinary questions naturally and briefly. Ask a concise follow-up when the shopping request is ambiguous.
Set action to shop only when the user clearly wants help finding or adding a product. Do not claim to have browsed,
selected, or changed a cart; the browser workflow will do that after your reply. Never offer or perform checkout,
payment, or order placement. This demo can add exactly one item to a SauceDemo cart and verify the rendered cart.
If the user asks for unrelated actions, explain what this shopping assistant can do."""


class OpenAIConfigurationError(RuntimeError):
    pass


@lru_cache(maxsize=1)
def _client() -> AsyncOpenAI:
    key = os.getenv("OPENAI_API_KEY") or os.getenv("OPEN_API_KEY")
    if not key:
        raise OpenAIConfigurationError("Add OPENAI_API_KEY to the backend environment to enable AI chat and voice.")
    return AsyncOpenAI(api_key=key)


async def route_chat(messages: list[dict[str, str]]) -> dict:
    response = await _client().responses.create(
        model=os.getenv("OPENAI_TEXT_MODEL", "gpt-4.1-mini"),
        instructions=SYSTEM_INSTRUCTIONS,
        input=messages,
        max_output_tokens=300,
        text={
            "format": {
                "type": "json_schema",
                "name": "vocapilot_chat_turn",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "message": {"type": "string"},
                        "action": {"type": "string", "enum": ["chat", "shop"]},
                        "product_query": {"type": ["string", "null"]},
                        "max_price": {"type": ["number", "null"]},
                    },
                    "required": ["message", "action", "product_query", "max_price"],
                    "additionalProperties": False,
                },
            }
        },
    )
    return json.loads(response.output_text)


async def choose_product(request: str, products: list[dict]) -> int | None:
    response = await _client().responses.create(
        model=os.getenv("OPENAI_TEXT_MODEL", "gpt-4.1-mini"),
        instructions=(
            "Match the user's shopping intent to one product from the provided live SauceDemo inventory. "
            "Only select a product if it satisfies the user's request and budget. Never invent inventory or prices. "
            "Return the inventory index, or null if nothing is a reasonable match."
        ),
        input=json.dumps({"request": request, "products": products}),
        max_output_tokens=100,
        text={
            "format": {
                "type": "json_schema",
                "name": "product_match",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {"product_index": {"type": ["integer", "null"]}},
                    "required": ["product_index"],
                    "additionalProperties": False,
                },
            }
        },
    )
    return json.loads(response.output_text)["product_index"]


async def transcribe_audio(filename: str, content_type: str, audio: bytes) -> str:
    response = await _client().audio.transcriptions.create(
        model=os.getenv("OPENAI_AUDIO_MODEL", "gpt-4o-mini-transcribe"),
        file=(filename, audio, content_type),
    )
    text = response.text.strip()
    if not text:
        raise ValueError("I couldn’t hear a request in that recording. Please try again or type it.")
    return text


async def synthesize_speech(text: str) -> bytes:
    response = await _client().audio.speech.create(
        model=os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts"),
        voice=os.getenv("OPENAI_TTS_VOICE", "alloy"),
        input=text,
        response_format="mp3",
    )
    return response.content
