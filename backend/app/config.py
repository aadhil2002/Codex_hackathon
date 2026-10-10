import os
from pathlib import Path

from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[1] / ".env")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") or None
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY") or None
HF_TOKEN = os.getenv("HF_TOKEN") or None
SAUCEDEMO_URL = os.getenv("SAUCEDEMO_URL", "https://www.saucedemo.com").rstrip("/")
SAUCEDEMO_USERNAME = os.getenv("SAUCEDEMO_USERNAME", "standard_user")
SAUCEDEMO_PASSWORD = os.getenv("SAUCEDEMO_PASSWORD", "secret_sauce")
SHOPPING_AUTOMATION = os.getenv("SHOPPING_AUTOMATION", "playwright").lower()
OPENAI_COMPUTER_MODEL = os.getenv("OPENAI_COMPUTER_MODEL", "gpt-6.1-sol")
MAX_AUDIO_BYTES = int(os.getenv("MAX_AUDIO_BYTES", "25000000"))
if MAX_AUDIO_BYTES < 1:
    raise RuntimeError("MAX_AUDIO_BYTES must be a positive integer")
