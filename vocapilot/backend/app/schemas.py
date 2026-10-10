from __future__ import annotations

from typing import Literal
from pydantic import SecretStr, HttpUrl

from pydantic import BaseModel, Field


TaskStatus = Literal["queued", "running", "awaiting_selection", "awaiting_options", "completed", "failed", "cancelled", "inconclusive"]


class SiteProfile(BaseModel):
    url: HttpUrl
    email: str = Field(default="", max_length=320)
    password: SecretStr = SecretStr("")


class TaskCreate(BaseModel):
    input_text: str = Field(min_length=1, max_length=1000)
    source: Literal["text", "voice"] = "text"
    intent: dict | None = None
    site: SiteProfile | None = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=20)


class ChatResponse(BaseModel):
    message: str
    task: "TaskView | None" = None
    shopping_intent: dict | None = None
    store_query: Literal["cart"] | None = None


class CartItem(BaseModel):
    name: str
    quantity: int = 1


class CartSummary(BaseModel):
    item_count: int | None = None
    items: list[CartItem] = Field(default_factory=list)
    is_current: bool = False
    message: str


class TranscriptionResponse(BaseModel):
    text: str


class SpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class Product(BaseModel):
    name: str
    displayed_price: str
    price_value: float
    description: str = ""
    image_url: str | None = None
    details_url: str | None = None
    store_ref: str | None = None


class ProductSelection(BaseModel):
    store_ref: str = Field(min_length=1, max_length=100)


class ProductOptions(BaseModel):
    size: str | None = Field(default=None, max_length=100)
    color: str | None = Field(default=None, max_length=100)


class ActivityEvent(BaseModel):
    id: int
    type: str
    message: str
    timestamp: str
    data: dict = Field(default_factory=dict)


class TaskResult(BaseModel):
    selected_product: Product | None = None
    quantity: int | None = None
    displayed_price: str | None = None
    subtotal: str | None = None
    cart_count: int | None = None
    verification_status: Literal["verified", "inconclusive"]
    evidence: list[str] = Field(default_factory=list)


class TaskView(BaseModel):
    task_id: str
    status: TaskStatus
    input_text: str
    site_url: str | None = None
    intent: dict | None = None
    products: list[Product] = Field(default_factory=list)
    suggested_products: list[Product] = Field(default_factory=list)
    selected_product: Product | None = None
    available_options: dict[str, list[str]] = Field(default_factory=dict)
    chosen_options: dict[str, str] = Field(default_factory=dict)
    events: list[ActivityEvent] = Field(default_factory=list)
    page_title: str | None = None
    page_url: str | None = None
    checkout_opened: bool = False
    checkout_url: str | None = None
    result: TaskResult | None = None
    error: str | None = None
