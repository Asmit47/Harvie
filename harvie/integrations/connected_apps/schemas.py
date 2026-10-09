"""Pydantic input schemas for tools that reach any connected app."""

from typing import Any

from pydantic import BaseModel, Field


class ListConnectedAppsInput(BaseModel):
    """Input for listing the apps this user has connected."""


class FindAppToolsInput(BaseModel):
    """Input for searching one app's available actions."""

    app: str = Field(description="App slug from the connected list, such as notion, github, or hubspot.")
    query: str = Field(description="What you want to do in that app, in a few words.")


class RunAppToolInput(BaseModel):
    """Input for running one action in a connected app."""

    app: str = Field(description="App slug the action belongs to.")
    tool_slug: str = Field(description="Exact action slug returned by connected_app_find_tools.")
    arguments: dict[str, Any] = Field(default_factory=dict, description="Arguments matching the action's parameters.")
