import json
import os
from functools import lru_cache

from openai import AsyncOpenAI


SYSTEM_INSTRUCTIONS = """You are VocaPilot, a friendly shopping assistant for the store selected by the user.
Answer ordinary questions naturally and briefly. Ask a follow-up only when the product type or task is genuinely unclear.
When the user asks to list, show, search, compare, or find products, set action to browse. Browse requests must never add
anything to a cart. Set action to add_to_cart only when the user explicitly asks to add a product to their cart. If the
product is not clear, ask a follow-up before starting computer actions. Do not claim to have browsed or changed a cart;
the computer workflow does that after your reply. Never offer or perform checkout, payment, or order placement. A cart
task adds exactly one item and verifies it; it is available only after an explicit add-to-cart request.
Understand natural product descriptions, synonyms, colors, and intended use; do not require an exact match to a product title.
If a requested attribute such as color is absent from the store listing, do not claim it is confirmed.
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
                        "action": {"type": "string", "enum": ["chat", "browse", "add_to_cart"]},
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


async def choose_products(request: str, products: list[dict]) -> dict:
    response = await _client().responses.create(
        model=os.getenv("OPENAI_TEXT_MODEL", "gpt-4.1-mini"),
        instructions=(
            "Match the user's natural-language shopping intent to products in the provided live store listings. "
            "Understand synonyms and product categories (for example, tee, t-shirt, and shirt) "
            "instead of requiring exact title words. Weigh intended use and requested attributes. Avoid products whose "
            "listed attributes explicitly conflict with the request when a better option is available. Do not assume "
            "an unlisted attribute such as color is confirmed. Never invent products or prices. Return the best inventory "
            "index, or null if nothing is a reasonable match. Also return up to four indices for other products in the "
            "same requested category that a shopper may compare, even when an optional variant such as color differs. "
            "Do not include unrelated products. Include the selected product in the related indices when appropriate."
        ),
        input=json.dumps({"request": request, "products": products}),
        max_output_tokens=100,
        text={
            "format": {
                "type": "json_schema",
                "name": "product_matches",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "product_index": {"type": ["integer", "null"]},
                        "related_indices": {"type": "array", "items": {"type": "integer"}},
                    },
                    "required": ["product_index", "related_indices"],
                    "additionalProperties": False,
                },
            }
        },
    )
    return json.loads(response.output_text)


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
