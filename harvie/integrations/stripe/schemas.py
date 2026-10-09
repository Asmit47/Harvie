"""Pydantic input schemas for read-only Stripe tools."""

from typing import Literal

from pydantic import BaseModel, Field


class ListInvoicesInput(BaseModel):
    """Input for listing Stripe invoices."""

    status: Literal["draft", "open", "paid", "uncollectible", "void"] | None = Field(
        default=None, description="Invoice status. Use open for unpaid invoices that still need collection."
    )
    customer: str | None = Field(default=None, description="Stripe customer ID, starting with cus_.")
    limit: int = Field(default=10, description="Maximum invoices to return, from 1 to 25.")


class GetInvoiceInput(BaseModel):
    """Input for reading one Stripe invoice."""

    invoice: str = Field(description="Stripe invoice ID, starting with in_.")


class ListCustomersInput(BaseModel):
    """Input for listing Stripe customers."""

    email: str | None = Field(default=None, description="Case-sensitive customer email. Omit to list recent customers.")
    limit: int = Field(default=10, description="Maximum customers to return, from 1 to 25.")
