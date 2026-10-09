"""Read-only Stripe operations backed by the shared Composio session."""

from harvie.integrations.composio.session import run_action


class StripeProvider:
    """Look up invoices and customers. Creating charges, refunds, and payouts is out of scope."""

    def list_invoices(self, status: str | None = None, customer: str | None = None, limit: int = 10) -> str:
        return run_action(
            "stripe",
            "STRIPE_LIST_INVOICES",
            {"status": status, "customer": customer, "limit": max(1, min(limit, 25))},
        )

    def get_invoice(self, invoice: str) -> str:
        return run_action("stripe", "STRIPE_GET_INVOICES_INVOICE", {"invoice": invoice})

    def list_customers(self, email: str | None = None, limit: int = 10) -> str:
        return run_action(
            "stripe",
            "STRIPE_LIST_CUSTOMERS",
            {"email": email, "limit": max(1, min(limit, 25))},
        )


stripe_provider = StripeProvider()
