import uuid
from datetime import date, timedelta
from decimal import Decimal
import pytest


@pytest.fixture
def setup_dashboard_scenario(client):
    """
    Sets up a business with figures matching the user request:
    Total Sales = ₹1,84,500
    Collected   = ₹1,42,000
    Outstanding = ₹42,500
    Plus an overdue invoice and customer/quotation counts.
    """
    suffix = uuid.uuid4().hex[:6]
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"builder_{suffix}@smartquote.in",
            "password": "Password123!",
            "full_name": f"Master Builder {suffix}",
        },
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    client.post(
        "/api/v1/business",
        json={
            "name": f"Apex Builders {suffix}",
            "owner_name": f"Master Builder {suffix}",
            "phone": "+91 98765 11223",
            "email": f"builder_{suffix}@smartquote.in",
            "address": "Pune, Maharashtra",
        },
        headers=headers,
    )

    # 1. Customers
    cust1 = client.post(
        "/api/v1/customers",
        json={"name": "Rajesh Sharma", "phone": "+91 98000 11111", "email": "rajesh@sharma.in"},
        headers=headers,
    ).json()

    cust2 = client.post(
        "/api/v1/customers",
        json={"name": "Pooja Patel", "phone": "+91 98000 22222", "email": "pooja@patel.in"},
        headers=headers,
    ).json()

    # 2. Quotation 1 -> Accepted -> Converted to Invoice 1: ₹1,42,000 (Fully Paid)
    q1 = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust1["id"],
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=15)),
            "items": [{"description": "Structural Work", "quantity": "1.00", "unit_price": "142000.00", "tax_rate": "0.00"}],
        },
        headers=headers,
    ).json()
    client.patch(f"/api/v1/quotations/{q1['id']}", json={"status": "SENT"}, headers=headers)
    client.patch(f"/api/v1/quotations/{q1['id']}", json={"status": "ACCEPTED"}, headers=headers)
    inv1 = client.post(f"/api/v1/quotations/{q1['id']}/convert", json={"due_days": 10}, headers=headers).json()

    # Record payment for inv1: ₹1,42,000
    client.post(
        f"/api/v1/invoices/{inv1['id']}/payments",
        json={"amount": "142000.00", "payment_date": str(date.today()), "method": "BANK_TRANSFER", "reference": "NEFT-142K"},
        headers=headers,
    )

    # 3. Quotation 2 -> Accepted -> Converted to Invoice 2: ₹42,500 (Unpaid, Overdue)
    q2 = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust2["id"],
            "issue_date": str(date.today() - timedelta(days=10)),
            "valid_until": str(date.today()),
            "items": [{"description": "Interior Finishing", "quantity": "1.00", "unit_price": "42500.00", "tax_rate": "0.00"}],
        },
        headers=headers,
    ).json()
    client.patch(f"/api/v1/quotations/{q2['id']}", json={"status": "SENT"}, headers=headers)
    client.patch(f"/api/v1/quotations/{q2['id']}", json={"status": "ACCEPTED"}, headers=headers)
    inv2 = client.post(f"/api/v1/quotations/{q2['id']}/convert", json={"due_days": 0}, headers=headers).json()

    # Mark inv2 due 5 days ago so it is overdue
    client.patch(
        f"/api/v1/invoices/{inv2['id']}",
        json={"due_date": str(date.today() - timedelta(days=5))},
        headers=headers,
    )

    # 4. An additional open quotation (Draft)
    q3 = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust1["id"],
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=30)),
            "items": [{"description": "Upcoming Phase 2", "quantity": "1.00", "unit_price": "50000.00", "tax_rate": "0.00"}],
        },
        headers=headers,
    ).json()

    return {
        "headers": headers,
        "cust1": cust1,
        "cust2": cust2,
        "inv1": inv1,
        "inv2": inv2,
        "q1": q1,
        "q2": q2,
        "q3": q3,
        "suffix": suffix,
    }


def test_dashboard_metrics_and_feeds(client, setup_dashboard_scenario):
    """
    Verify dashboard produces exact required metrics:
    Total Sales = ₹1,84,500
    Collected   = ₹1,42,000
    Outstanding = ₹42,500
    Overdue     = ₹42,500
    Customers   = 2
    Quotations  = 3
    Invoices    = 2
    """
    headers = setup_dashboard_scenario["headers"]

    res = client.get("/api/v1/dashboard", headers=headers)
    assert res.status_code == 200
    data = res.json()

    metrics = data["metrics"]
    assert Decimal(str(metrics["total_sales"])) == Decimal("184500.00")
    assert Decimal(str(metrics["total_collected"])) == Decimal("142000.00")
    assert Decimal(str(metrics["outstanding"])) == Decimal("42500.00")
    assert Decimal(str(metrics["overdue"])) == Decimal("42500.00")

    assert metrics["customers_count"] == 2
    assert metrics["quotations_count"] == 3
    assert metrics["invoices_count"] == 2

    # Feeds
    assert len(data["recent_quotations"]) == 3
    assert len(data["recent_invoices"]) == 2
    assert len(data["recent_payments"]) == 1
    assert len(data["overdue_invoices"]) == 1

    overdue = data["overdue_invoices"][0]
    assert overdue["invoice_number"] == setup_dashboard_scenario["inv2"]["invoice_number"]
    assert Decimal(str(overdue["remaining_amount"])) == Decimal("42500.00")
    assert overdue["days_overdue"] == 5

    payment = data["recent_payments"][0]
    assert Decimal(str(payment["amount"])) == Decimal("142000.00")
    assert payment["method"] == "BANK_TRANSFER"


def test_dashboard_multi_tenant_isolation(client, setup_dashboard_scenario):
    """
    Verify another business has completely isolated dashboard numbers (0 sales, 0 collected).
    """
    suffix = uuid.uuid4().hex[:6]
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"other_{suffix}@smartquote.in",
            "password": "Password123!",
            "full_name": f"Other Trader {suffix}",
        },
    )
    headers2 = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    client.post(
        "/api/v1/business",
        json={
            "name": f"Other Trades {suffix}",
            "owner_name": f"Other Trader {suffix}",
            "phone": "+91 99999 77777",
            "email": f"other_{suffix}@smartquote.in",
            "address": "Bangalore",
        },
        headers=headers2,
    )

    res = client.get("/api/v1/dashboard", headers=headers2)
    assert res.status_code == 200
    data = res.json()

    metrics = data["metrics"]
    assert Decimal(str(metrics["total_sales"])) == Decimal("0.00")
    assert Decimal(str(metrics["total_collected"])) == Decimal("0.00")
    assert Decimal(str(metrics["outstanding"])) == Decimal("0.00")
    assert Decimal(str(metrics["overdue"])) == Decimal("0.00")
    assert metrics["customers_count"] == 0
    assert metrics["quotations_count"] == 0
    assert metrics["invoices_count"] == 0
    assert len(data["recent_quotations"]) == 0
    assert len(data["recent_invoices"]) == 0
    assert len(data["recent_payments"]) == 0
    assert len(data["overdue_invoices"]) == 0
