import uuid
from datetime import date, timedelta
from decimal import Decimal
import pytest


@pytest.fixture
def business_and_customer(client):
    """Set up user, business, and customer, returning authorization headers and IDs."""
    suffix = uuid.uuid4().hex[:6]
    user_payload = {
        "email": f"electrician_{suffix}@smartquote.in",
        "password": "Password123!",
        "full_name": f"Master Contractor {suffix}",
    }
    reg = client.post("/api/v1/auth/register", json=user_payload)
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    biz_res = client.post(
        "/api/v1/business",
        json={
            "name": "Apex Electrical & Hardware",
            "owner_name": user_payload["full_name"],
            "phone": "+91 98765 43210",
            "email": user_payload["email"],
            "address": "Plot 42, Industrial Area Phase II, New Delhi",
            "currency": "₹",
        },
        headers=headers,
    )
    assert biz_res.status_code == 201
    business_id = biz_res.json()["id"]

    cust_res = client.post(
        "/api/v1/customers",
        json={
            "name": "Raj Traders & Hardware",
            "phone": "+91 98111 22334",
            "email": "raj@rajtraders.in",
            "address": "Shop 14, Main Market, Rohini Sector 7, Delhi",
        },
        headers=headers,
    )
    assert cust_res.status_code == 201
    customer_id = cust_res.json()["id"]

    return headers, business_id, customer_id


def test_create_quotation_authoritative_calculation(client, business_and_customer):
    """
    CRITICAL USER TEST CASE:
    PVC Pipe: 20 × ₹500 = ₹10,000
    GST: 18% = ₹1,800
    Total: ₹11,800
    Verifies that backend authoritative calculation matches exact specification.
    """
    headers, _, customer_id = business_and_customer

    payload = {
        "customer_id": customer_id,
        "issue_date": str(date.today()),
        "valid_until": str(date.today() + timedelta(days=15)),
        "discount": "0.00",
        "items": [
            {
                "description": "PVC Pipe 25mm Heavy Duty",
                "quantity": "20.00",
                "unit_price": "500.00",
                "tax_rate": "18.00",
            }
        ],
        "notes": "Standard commercial terms apply.",
    }

    res = client.post("/api/v1/quotations", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()

    # Verify exact financial calculations
    assert Decimal(str(data["subtotal"])) == Decimal("10000.00")
    assert Decimal(str(data["tax"])) == Decimal("1800.00")
    assert Decimal(str(data["discount"])) == Decimal("0.00")
    assert Decimal(str(data["total"])) == Decimal("11800.00")
    assert data["status"] == "DRAFT"
    assert data["customer_name"] == "Raj Traders & Hardware"
    assert data["quotation_number"].startswith("QT-")

    # Verify line items
    assert len(data["items"]) == 1
    item = data["items"][0]
    assert item["description"] == "PVC Pipe 25mm Heavy Duty"
    assert Decimal(str(item["quantity"])) == Decimal("20.00")
    assert Decimal(str(item["unit_price"])) == Decimal("500.00")
    assert Decimal(str(item["tax_rate"])) == Decimal("18.00")
    assert Decimal(str(item["tax_amount"])) == Decimal("1800.00")
    assert Decimal(str(item["line_total"])) == Decimal("11800.00")


def test_sequential_quotation_numbering(client, business_and_customer):
    """Verify consecutive quotations receive sequential QT-YYYY-XXXX numbers."""
    headers, _, customer_id = business_and_customer
    year = date.today().year

    p1 = {
        "customer_id": customer_id,
        "issue_date": str(date.today()),
        "valid_until": str(date.today() + timedelta(days=7)),
        "items": [{"description": "Item 1", "quantity": "1.00", "unit_price": "100.00", "tax_rate": "0.00"}],
    }
    r1 = client.post("/api/v1/quotations", json=p1, headers=headers)
    assert r1.status_code == 201
    assert r1.json()["quotation_number"] == f"QT-{year}-0001"

    p2 = {
        "customer_id": customer_id,
        "issue_date": str(date.today()),
        "valid_until": str(date.today() + timedelta(days=7)),
        "items": [{"description": "Item 2", "quantity": "2.00", "unit_price": "50.00", "tax_rate": "0.00"}],
    }
    r2 = client.post("/api/v1/quotations", json=p2, headers=headers)
    assert r2.status_code == 201
    assert r2.json()["quotation_number"] == f"QT-{year}-0002"


def test_create_quotation_with_discount_and_multiple_items(client, business_and_customer):
    """
    Test multi-item calculation with discount:
    Item 1: 10 × ₹100 @ 18% GST -> Subtotal: ₹1,000, Tax: ₹180, Total: ₹1,180
    Item 2: 5 × ₹200 @ 12% GST  -> Subtotal: ₹1,000, Tax: ₹120, Total: ₹1,120
    Discount: ₹200
    Subtotal: ₹2,000
    Discounted Subtotal: ₹1,800
    Total Tax: ₹300
    Grand Total: ₹2,100
    """
    headers, _, customer_id = business_and_customer

    payload = {
        "customer_id": customer_id,
        "issue_date": str(date.today()),
        "valid_until": str(date.today() + timedelta(days=10)),
        "discount": "200.00",
        "items": [
            {"description": "Item 1", "quantity": "10.00", "unit_price": "100.00", "tax_rate": "18.00"},
            {"description": "Item 2", "quantity": "5.00", "unit_price": "200.00", "tax_rate": "12.00"},
        ],
    }
    res = client.post("/api/v1/quotations", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert Decimal(str(data["subtotal"])) == Decimal("2000.00")
    assert Decimal(str(data["discount"])) == Decimal("200.00")
    assert Decimal(str(data["tax"])) == Decimal("300.00")
    assert Decimal(str(data["total"])) == Decimal("2100.00")


def test_quotation_tenant_isolation(client):
    """Business B cannot see or manipulate Business A's quotations."""
    # Setup Business A
    user_a = {"email": f"biz_a_{uuid.uuid4().hex[:6]}@smartquote.in", "password": "Password123!", "full_name": "Owner A"}
    token_a = client.post("/api/v1/auth/register", json=user_a).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    biz_a_res = client.post("/api/v1/business", json={"name": "Biz A", "owner_name": "Owner A", "phone": "+91 90000 11111", "email": user_a["email"], "address": "Address A Street"}, headers=headers_a)
    assert biz_a_res.status_code == 201

    cust_a = client.post("/api/v1/customers", json={"name": "Cust A", "phone": "9876543210"}, headers=headers_a).json()["id"]

    q_a = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust_a,
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=7)),
            "items": [{"description": "Item A", "quantity": "1.00", "unit_price": "500.00", "tax_rate": "18.00"}],
        },
        headers=headers_a,
    ).json()

    # Setup Business B
    user_b = {"email": f"biz_b_{uuid.uuid4().hex[:6]}@smartquote.in", "password": "Password123!", "full_name": "Owner B"}
    token_b = client.post("/api/v1/auth/register", json=user_b).json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    biz_b_res = client.post("/api/v1/business", json={"name": "Biz B", "owner_name": "Owner B", "phone": "+91 90000 22222", "email": user_b["email"], "address": "Address B Street"}, headers=headers_b)
    assert biz_b_res.status_code == 201


    # Business B listing quotations should see 0
    list_b = client.get("/api/v1/quotations", headers=headers_b)
    assert list_b.status_code == 200
    assert len(list_b.json()) == 0

    # Business B fetching Business A's quotation by ID should return 404
    get_b = client.get(f"/api/v1/quotations/{q_a['id']}", headers=headers_b)
    assert get_b.status_code == 404
