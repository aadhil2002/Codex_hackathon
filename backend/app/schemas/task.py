from typing import Literal
from urllib.parse import parse_qsl, urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TaskRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    input_text: str = Field(min_length=3, max_length=1000)
    source: Literal["text", "voice"] = "text"
    site_url: str = Field(default="https://www.saucedemo.com/", min_length=8, max_length=2000)

    @field_validator("site_url")
    @classmethod
    def validate_site_url(cls, value: str) -> str:
        value = value.strip()
        parts = urlsplit(value)
        sensitive = {"token", "access_token", "auth", "code", "session", "key", "password"}
        if parts.scheme != "https" or not parts.hostname or parts.username or parts.password:
            raise ValueError("Enter a public HTTPS website URL without embedded credentials")
        if any(key.casefold() in sensitive for key, _ in parse_qsl(parts.query)):
            raise ValueError("Remove access tokens or credentials from the URL; sign in manually if needed")
        return value.split("#", 1)[0]


class TaskResult(BaseModel):
    summary: str
    verification_status: Literal["model_observed", "inconclusive"]
    evidence: list[str] = Field(default_factory=list)


class ApprovalDecision(BaseModel):
    approved: bool


class UserHandoffResponse(BaseModel):
    message: str = Field(min_length=1, max_length=1000)


class TaskEvent(BaseModel):
    id: int
    type: Literal[
        "task_created", "task_started", "browser_navigated", "screenshot_updated",
        "task_completed", "task_failed", "task_cancelled", "task_inconclusive", "error",
        "approval_required", "approval_granted", "approval_denied", "origin_approval_required",
        "user_handoff_required", "user_handoff_resumed",
    ]
    message: str
    created_at: str
    payload: dict = Field(default_factory=dict)


class TaskResponse(BaseModel):
    task_id: str
    status: Literal["queued", "running", "waiting_approval", "waiting_for_user", "completed", "failed", "cancelled", "inconclusive"]
    input_text: str
    source: Literal["text", "voice"]
    site_url: str
    result: TaskResult | None = None
    pending_action: dict | None = None
    handoff_message: str | None = None
    screenshot_data_url: str | None = None
    page_title: str | None = None
    page_url: str | None = None
    error: str | None = None
    events: list[TaskEvent] = Field(default_factory=list)
