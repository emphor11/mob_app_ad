import uuid
from datetime import date, timedelta
from decimal import Decimal
import pytest


@pytest.fixture
def business_with_quotation(client):
    """Set up user, business, customer, and a quotation."""
    suffix = uuid.uuid4().hex[:6]
    user_payload = {
        "email": f"electrician_{suffix}@smartquote.in",
        "password": "Password123!",
        "full_name": f"Master Contractor {suffix}",
    }
    reg = client.post("/api/v1/auth/register", json=user_payload)
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    client.post(
        "/api/v1/business",
        json={
            "name": "Shree Ram Enterprises",
            "owner_name": user_payload["full_name"],
            "phone": "+91 98765 43210",
            "email": user_payload["email"],
            "address": "Okhla Phase 2, New Delhi",
        },
        headers=headers,
    )

    cust1 = client.post(
        "/api/v1/customers",
        json={
            "name": "Raj Traders",
            "phone": "+91 98111 22334",
            "email": "raj@rajtraders.in",
            "address": "Rohini Sector 7, Delhi",
        },
        headers=headers,
    ).json()

    cust2 = client.post(
        "/api/v1/customers",
        json={
            "name": "Gupta Hardware & Sanitary",
            "phone": "+91 98222 33445",
        },
        headers=headers,
    ).json()

    # Create quote for Raj Traders: PVC Pipe 20 × ₹500 @ 18% = ₹11,800
    q1 = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust1["id"],
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=15)),
            "items": [
                {"description": "PVC Pipe 25mm", "quantity": "20.00", "unit_price": "500.00", "tax_rate": "18.00"}
            ],
        },
        headers=headers,
    ).json()

    # Create quote for Gupta Hardware
    q2 = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust2["id"],
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=7)),
            "items": [
                {"description": "Switchboard 8-Module", "quantity": "10.00", "unit_price": "250.00", "tax_rate": "18.00"}
            ],
        },
        headers=headers,
    ).json()

    return headers, q1, q2


def test_quotation_search(client, business_with_quotation):
    """Test searching quotations by quotation number or customer name."""
    headers, q1, q2 = business_with_quotation

    # Search by customer name "Raj Traders"
    res = client.get("/api/v1/quotations?search=Raj", headers=headers)
    assert res.status_code == 200
    results = res.json()
    assert len(results) == 1
    assert results[0]["id"] == q1["id"]
    assert results[0]["customer_name"] == "Raj Traders"

    # Search by quotation number
    q2_num = q2["quotation_number"]
    res_num = client.get(f"/api/v1/quotations?search={q2_num}", headers=headers)
    assert res_num.status_code == 200
    assert len(res_num.json()) == 1
    assert res_num.json()[0]["id"] == q2["id"]


def test_quotation_status_filter(client, business_with_quotation):
    """Test filtering quotations by status."""
    headers, q1, q2 = business_with_quotation

    # Both are initially DRAFT
    res_draft = client.get("/api/v1/quotations?status=DRAFT", headers=headers)
    assert res_draft.status_code == 200
    assert len(res_draft.json()) == 2

    # Patch q1 to SENT
    patch_res = client.patch(f"/api/v1/quotations/{q1['id']}", json={"status": "SENT"}, headers=headers)
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "SENT"

    # Filter for SENT should return only q1
    res_sent = client.get("/api/v1/quotations?status=SENT", headers=headers)
    assert res_sent.status_code == 200
    assert len(res_sent.json()) == 1
    assert res_sent.json()[0]["id"] == q1["id"]


def test_get_quotation_by_id(client, business_with_quotation):
    """Test retrieving quotation details with full line items."""
    headers, q1, _ = business_with_quotation

    res = client.get(f"/api/v1/quotations/{q1['id']}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == q1["id"]
    assert data["customer_name"] == "Raj Traders"
    assert Decimal(str(data["total"])) == Decimal("11800.00")
    assert len(data["items"]) == 1
    assert data["items"][0]["description"] == "PVC Pipe 25mm"


def test_patch_quotation_recalculates_totals(client, business_with_quotation):
    """Updating discount or items on a quotation recalculates financial totals authoritatively."""
    headers, q1, _ = business_with_quotation

    # Add discount of ₹800 -> new total should be (₹10,000 - ₹800) + ₹1,800 = ₹11,000
    patch_res = client.patch(
        f"/api/v1/quotations/{q1['id']}",
        json={"discount": "800.00"},
        headers=headers,
    )
    assert patch_res.status_code == 200
    data = patch_res.json()
    assert Decimal(str(data["discount"])) == Decimal("800.00")
    assert Decimal(str(data["total"])) == Decimal("11000.00")
