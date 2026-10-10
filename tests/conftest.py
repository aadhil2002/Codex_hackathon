"""Shared pytest options for visibly paced browser tests."""
import pytest


def pytest_addoption(parser) -> None:
    parser.addoption(
        "--slow-mo",
        type=int,
        default=300,
        help="Delay each Playwright browser action by this many milliseconds (default: 300).",
    )
