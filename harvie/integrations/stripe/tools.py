"""LangChain tool wrappers for read-only Stripe lookups."""

from langchain_core.tools import tool

from harvie.integrations.stripe.provider import stripe_provider
from harvie.integrations.stripe.schemas import GetInvoiceInput, ListCustomersInput, ListInvoicesInput


@tool(args_schema=ListInvoicesInput)
def stripe_list_invoices(status: str | None = None, customer: str | None = None, limit: int = 10) -> str:
    """List Stripe invoices. Use status open when looking for unpaid invoices. This cannot charge a customer."""
    return stripe_provider.list_invoices(status, customer, limit)


@tool(args_schema=GetInvoiceInput)
def stripe_get_invoice(invoice: str) -> str:
    """Read one Stripe invoice by its in_ ID."""
    return stripe_provider.get_invoice(invoice)


@tool(args_schema=ListCustomersInput)
def stripe_list_customers(email: str | None = None, limit: int = 10) -> str:
    """List Stripe customers, optionally filtered by an exact email address."""
    return stripe_provider.list_customers(email, limit)


stripe_tools = [
    stripe_list_invoices,
    stripe_get_invoice,
    stripe_list_customers,
]
