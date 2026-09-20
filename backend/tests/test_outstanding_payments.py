import uuid
from datetime import date, timedelta
from decimal import Decimal
import pytest


@pytest.fixture
def setup_outstanding_scenario(client):
    """
    Set up scenario matching Phase 18 specifications:
    - Customer 1 (Raj Traders): ₹11,800 total, ₹5,000 paid, ₹6,800 outstanding, due in 5 days (PENDING).
    - Customer 2 (Apex Infra): ₹5,000 total, ₹0 paid, ₹5,000 outstanding, due 10 days ago (OVERDUE).
    - Customer 3 (Zenith Corp): ₹8,000 total, ₹8,000 paid, ₹0 outstanding, due today (PAID).
    """
    suffix = uuid.uuid4().hex[:6]
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"merchant_{suffix}@smartquote.in",
            "password": "Password123!",
            "full_name": f"Merchant {suffix}",
        },
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    client.post(
        "/api/v1/business",
        json={
            "name": f"Enterprise Trades {suffix}",
            "owner_name": f"Merchant {suffix}",
            "phone": "+91 98765 22222",
            "email": f"merchant_{suffix}@smartquote.in",
            "address": "Ahmedabad, Gujarat",
        },
        headers=headers,
    )

    # 1. Customer: Raj Traders
    cust_raj = client.post(
        "/api/v1/customers",
        json={"name": f"Raj Traders {suffix}", "phone": "+91 98222 11111", "email": "raj@traders.in"},
        headers=headers,
    ).json()

    # Quote 1 -> Accept -> Convert
    q1 = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust_raj["id"],
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=15)),
            "items": [{"description": "Hardware Supplies", "quantity": "1.00", "unit_price": "10000.00", "tax_rate": "18.00"}],
        },
        headers=headers,
    ).json()
    client.patch(f"/api/v1/quotations/{q1['id']}", json={"status": "SENT"}, headers=headers)
    client.patch(f"/api/v1/quotations/{q1['id']}", json={"status": "ACCEPTED"}, headers=headers)
    inv1 = client.post(f"/api/v1/quotations/{q1['id']}/convert", json={"due_days": 5}, headers=headers).json()

    # Record partial payment of ₹5,000
    client.post(
        f"/api/v1/invoices/{inv1['id']}/payments",
        json={"amount": "5000.00", "payment_date": str(date.today()), "method": "UPI"},
        headers=headers,
    )

    # 2. Customer: Apex Infra (Overdue)
    cust_apex = client.post(
        "/api/v1/customers",
        json={"name": f"Apex Infra {suffix}", "phone": "+91 98333 22222", "email": "apex@infra.in"},
        headers=headers,
    ).json()
    q2 = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust_apex["id"],
            "issue_date": str(date.today() - timedelta(days=20)),
            "valid_until": str(date.today() + timedelta(days=10)),
            "items": [{"description": "Plumbing Pipes", "quantity": "5.00", "unit_price": "1000.00", "tax_rate": "0.00"}],
        },
        headers=headers,
    ).json()
    client.patch(f"/api/v1/quotations/{q2['id']}", json={"status": "SENT"}, headers=headers)
    client.patch(f"/api/v1/quotations/{q2['id']}", json={"status": "ACCEPTED"}, headers=headers)
    inv2 = client.post(
        f"/api/v1/quotations/{q2['id']}/convert",
        json={"due_days": 1, "issue_date": str(date.today() - timedelta(days=15))},
        headers=headers,
    ).json()
    # Explicitly set due date to 10 days in the past
    client.patch(
        f"/api/v1/invoices/{inv2['id']}",
        json={"due_date": str(date.today() - timedelta(days=10))},
        headers=headers,
    )

    # 3. Customer: Zenith Corp (Fully Paid)
    cust_zenith = client.post(
        "/api/v1/customers",
        json={"name": f"Zenith Corp {suffix}", "phone": "+91 98444 33333", "email": "zenith@corp.in"},
        headers=headers,
    ).json()
    q3 = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust_zenith["id"],
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=10)),
            "items": [{"description": "Electrical Panel", "quantity": "1.00", "unit_price": "8000.00", "tax_rate": "0.00"}],
        },
        headers=headers,
    ).json()
    client.patch(f"/api/v1/quotations/{q3['id']}", json={"status": "SENT"}, headers=headers)
    client.patch(f"/api/v1/quotations/{q3['id']}", json={"status": "ACCEPTED"}, headers=headers)
    inv3 = client.post(f"/api/v1/quotations/{q3['id']}/convert", json={"due_days": 0}, headers=headers).json()
    # Fully pay ₹8,000
    client.post(
        f"/api/v1/invoices/{inv3['id']}/payments",
        json={"amount": "8000.00", "payment_date": str(date.today()), "method": "BANK_TRANSFER"},
        headers=headers,
    )

    return {
        "headers": headers,
        "suffix": suffix,
        "inv1": inv1,
        "inv2": inv2,
        "inv3": inv3,
    }


def test_outstanding_summary_metrics(client, setup_outstanding_scenario):
    """Test aggregated metrics: Total Outstanding, Overdue, Partially Paid, and Paid."""
    headers = setup_outstanding_scenario["headers"]
    res = client.get("/api/v1/payments/outstanding", headers=headers)
    assert res.status_code == 200
    data = res.json()

    metrics = data["metrics"]
    # Total Outstanding = ₹6,800 (Raj) + ₹5,000 (Apex) = ₹11,800
    assert Decimal(metrics["total_outstanding"]) == Decimal("11800.00")
    # Total Overdue = ₹5,000 (Apex)
    assert Decimal(metrics["total_overdue"]) == Decimal("5000.00")
    # Total Partially Paid = ₹6,800
    assert Decimal(metrics["total_partially_paid"]) == Decimal("6800.00")
    # Total Paid = ₹8,000 + ₹5,000 = ₹13,000
    assert Decimal(metrics["total_paid"]) == Decimal("13000.00")

    assert metrics["outstanding_count"] == 2
    assert metrics["overdue_count"] == 1
    assert metrics["partially_paid_count"] == 1
    assert metrics["paid_count"] == 1

    # Total items in "ALL"
    assert len(data["items"]) == 3


def test_outstanding_category_filters(client, setup_outstanding_scenario):
    """Test filtering by PENDING, OVERDUE, and PAID."""
    headers = setup_outstanding_scenario["headers"]

    # 1. PENDING (Raj Traders: ₹6,800 outstanding, future due date)
    res_pending = client.get("/api/v1/payments/outstanding?filter=PENDING", headers=headers)
    assert res_pending.status_code == 200
    items_pending = res_pending.json()["items"]
    assert len(items_pending) == 1
    assert "Raj Traders" in items_pending[0]["customer_name"]
    assert Decimal(items_pending[0]["outstanding_balance"]) == Decimal("6800.00")
    assert items_pending[0]["payment_category"] == "PENDING"
    assert not items_pending[0]["is_overdue"]

    # 2. OVERDUE (Apex Infra: ₹5,000 outstanding, past due date)
    res_overdue = client.get("/api/v1/payments/outstanding?filter=OVERDUE", headers=headers)
    assert res_overdue.status_code == 200
    items_overdue = res_overdue.json()["items"]
    assert len(items_overdue) == 1
    assert "Apex Infra" in items_overdue[0]["customer_name"]
    assert Decimal(items_overdue[0]["outstanding_balance"]) == Decimal("5000.00")
    assert items_overdue[0]["payment_category"] == "OVERDUE"
    assert items_overdue[0]["is_overdue"]

    # 3. PAID (Zenith Corp: ₹0 outstanding)
    res_paid = client.get("/api/v1/payments/outstanding?filter=PAID", headers=headers)
    assert res_paid.status_code == 200
    items_paid = res_paid.json()["items"]
    assert len(items_paid) == 1
    assert "Zenith Corp" in items_paid[0]["customer_name"]
    assert Decimal(items_paid[0]["outstanding_balance"]) == Decimal("0.00")
    assert items_paid[0]["payment_category"] == "PAID"


def test_outstanding_search_filter(client, setup_outstanding_scenario):
    """Test searching by customer name or invoice number."""
    headers = setup_outstanding_scenario["headers"]

    res_search = client.get("/api/v1/payments/outstanding?search=Raj", headers=headers)
    assert res_search.status_code == 200
    items = res_search.json()["items"]
    assert len(items) == 1
    assert "Raj Traders" in items[0]["customer_name"]


def test_outstanding_tenant_isolation(client, setup_outstanding_scenario):
    """Ensure another registered business sees its own empty or separate outstanding metrics."""
    suffix = uuid.uuid4().hex[:6]
    reg2 = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"rival_{suffix}@other.com",
            "password": "Password123!",
            "full_name": f"Rival {suffix}",
        },
    )
    token2 = reg2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}
    client.post(
        "/api/v1/business",
        json={
            "name": f"Rival Trades {suffix}",
            "owner_name": "Rival",
            "phone": "+91 91111 00000",
            "email": f"rival_{suffix}@other.com",
            "address": "Pune",
        },
        headers=headers2,
    )

    res = client.get("/api/v1/payments/outstanding", headers=headers2)
    assert res.status_code == 200
    data = res.json()
    assert Decimal(data["metrics"]["total_outstanding"]) == Decimal("0.00")
    assert len(data["items"]) == 0
