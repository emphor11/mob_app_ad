import uuid
from datetime import date, timedelta
from decimal import Decimal
import pytest
from app.models.invoice import InvoiceStatus
from app.models.quotation import QuotationStatus


@pytest.fixture
def setup_hardening_env(client):
    """Set up two distinct businesses with customer and quotation records."""
    suffix = uuid.uuid4().hex[:6]

    # Register Biz 1
    reg1 = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"merchant_{suffix}@smartquote.in",
            "password": "Password123!",
            "full_name": f"Merchant {suffix}",
        },
    )
    assert reg1.status_code == 201
    token1 = reg1.json()["access_token"]
    headers1 = {"Authorization": f"Bearer {token1}"}

    client.post(
        "/api/v1/business",
        json={
            "name": f"Merchant Enterprises {suffix}",
            "owner_name": f"Merchant {suffix}",
            "phone": "+91 98765 00001",
            "email": f"merchant_{suffix}@smartquote.in",
            "address": "Bangalore, Karnataka",
            "gstin": "29AAAAA0000A1Z5",
            "quotation_prefix": "QT",
            "invoice_prefix": "INV",
        },
        headers=headers1,
    )

    cust1 = client.post(
        "/api/v1/customers",
        json={"name": "Client One", "phone": "+91 91111 00001", "email": "client1@example.com"},
        headers=headers1,
    ).json()

    # Register Biz 2 (Competitor/Other Business)
    reg2 = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"rival_{suffix}@smartquote.in",
            "password": "Password123!",
            "full_name": f"Rival {suffix}",
        },
    )
    assert reg2.status_code == 201
    token2 = reg2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    client.post(
        "/api/v1/business",
        json={
            "name": f"Rival Trading {suffix}",
            "owner_name": f"Rival {suffix}",
            "phone": "+91 98765 00002",
            "email": f"rival_{suffix}@smartquote.in",
            "address": "Delhi",
            "gstin": "07AAAAA0000A1Z5",
        },
        headers=headers2,
    )

    cust2 = client.post(
        "/api/v1/customers",
        json={"name": "Client Two", "phone": "+91 92222 00002", "email": "client2@example.com"},
        headers=headers2,
    ).json()

    return {
        "suffix": suffix,
        "biz1": {"headers": headers1, "customer": cust1, "email": f"merchant_{suffix}@smartquote.in"},
        "biz2": {"headers": headers2, "customer": cust2, "email": f"rival_{suffix}@smartquote.in"},
    }


# ==============================================================================
# 1. AUTHENTICATION VALIDATION HARDENING
# ==============================================================================

def test_duplicate_email_registration_rejected(client, setup_hardening_env):
    """Verify duplicate email registration is rejected with HTTP 400."""
    existing_email = setup_hardening_env["biz1"]["email"]
    res = client.post(
        "/api/v1/auth/register",
        json={
            "email": existing_email,
            "password": "Password123!",
            "full_name": "Intruder User",
        },
    )
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"].lower()


def test_invalid_login_credentials_rejected(client, setup_hardening_env):
    """Verify non-existent user or invalid password returns HTTP 401."""
    existing_email = setup_hardening_env["biz1"]["email"]

    # Wrong password
    res1 = client.post(
        "/api/v1/auth/login",
        json={"email": existing_email, "password": "WrongPassword999!"},
    )
    assert res1.status_code == 401
    assert "incorrect email or password" in res1.json()["detail"].lower()

    # Non-existent user
    res2 = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody_exists_12345@smartquote.in", "password": "Password123!"},
    )
    assert res2.status_code == 401
    assert "incorrect email or password" in res2.json()["detail"].lower()


# ==============================================================================
# 2. CUSTOMER & TENANT ISOLATION HARDENING
# ==============================================================================

def test_invalid_customer_id_rejected(client, setup_hardening_env):
    """Verify creating quotation with random UUID customer ID returns HTTP 404."""
    headers = setup_hardening_env["biz1"]["headers"]
    random_customer_id = str(uuid.uuid4())

    res = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": random_customer_id,
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=15)),
            "items": [{"description": "Repair", "quantity": "1.00", "unit_price": "1000.00"}],
        },
        headers=headers,
    )
    assert res.status_code == 404
    assert "customer not found" in res.json()["detail"].lower()


def test_customer_belonging_to_another_business_rejected(client, setup_hardening_env):
    """Verify merchant cannot create quotation referencing another business's customer."""
    headers1 = setup_hardening_env["biz1"]["headers"]
    cust2_id = setup_hardening_env["biz2"]["customer"]["id"]

    res = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust2_id,
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=15)),
            "items": [{"description": "Wiring", "quantity": "1.00", "unit_price": "2500.00"}],
        },
        headers=headers1,
    )
    assert res.status_code == 404
    assert "does not belong to your business" in res.json()["detail"].lower()


# ==============================================================================
# 3. FINANCIAL NUMERIC & QUANTITY INPUT HARDENING
# ==============================================================================

def test_negative_price_rejected(client, setup_hardening_env):
    """Verify negative unit price is rejected with HTTP 422 Unprocessable Entity."""
    headers = setup_hardening_env["biz1"]["headers"]
    cust_id = setup_hardening_env["biz1"]["customer"]["id"]

    res = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust_id,
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=15)),
            "items": [{"description": "Faulty Item", "quantity": "1.00", "unit_price": "-500.00"}],
        },
        headers=headers,
    )
    assert res.status_code == 422


def test_negative_quantity_rejected(client, setup_hardening_env):
    """Verify negative quantity is rejected with HTTP 422."""
    headers = setup_hardening_env["biz1"]["headers"]
    cust_id = setup_hardening_env["biz1"]["customer"]["id"]

    res = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust_id,
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=15)),
            "items": [{"description": "Negative Box", "quantity": "-2.00", "unit_price": "100.00"}],
        },
        headers=headers,
    )
    assert res.status_code == 422


def test_zero_quantity_rejected(client, setup_hardening_env):
    """Verify zero quantity is rejected with HTTP 422."""
    headers = setup_hardening_env["biz1"]["headers"]
    cust_id = setup_hardening_env["biz1"]["customer"]["id"]

    res = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust_id,
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=15)),
            "items": [{"description": "Zero Items", "quantity": "0.00", "unit_price": "100.00"}],
        },
        headers=headers,
    )
    assert res.status_code == 422


# ==============================================================================
# 4. INVOICE CONVERSION, EXPIRATION, & NUMBERING HARDENING
# ==============================================================================

def test_invoice_from_nonexistent_quotation_rejected(client, setup_hardening_env):
    """Verify converting a non-existent quotation returns HTTP 404."""
    headers = setup_hardening_env["biz1"]["headers"]
    random_id = str(uuid.uuid4())

    res = client.post(f"/api/v1/quotations/{random_id}/convert", headers=headers)
    assert res.status_code == 404
    assert "quotation not found" in res.json()["detail"].lower()


def test_expired_quotation_conversion_rejected(client, setup_hardening_env):
    """Verify converting an expired quotation is strictly rejected with HTTP 400."""
    headers = setup_hardening_env["biz1"]["headers"]
    cust_id = setup_hardening_env["biz1"]["customer"]["id"]

    # Create quotation valid in the past
    q = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust_id,
            "issue_date": str(date.today() - timedelta(days=30)),
            "valid_until": str(date.today() - timedelta(days=1)),  # Expired yesterday
            "items": [{"description": "Expired Service", "quantity": "1.00", "unit_price": "3000.00"}],
        },
        headers=headers,
    ).json()

    client.patch(f"/api/v1/quotations/{q['id']}", json={"status": "SENT"}, headers=headers)
    client.patch(f"/api/v1/quotations/{q['id']}", json={"status": "ACCEPTED"}, headers=headers)

    # Conversion attempt
    res = client.post(f"/api/v1/quotations/{q['id']}/convert", headers=headers)
    assert res.status_code == 400
    assert "expired" in res.json()["detail"].lower()


# ==============================================================================
# 5. PAYMENT OVERPAYMENT & ACCOUNTING IMMUTABILITY HARDENING
# ==============================================================================

def test_payment_greater_than_invoice_rejected(client, setup_hardening_env):
    """
    Critical validation:
    Never allow Invoice = ₹11,800 and Payment = ₹15,000.
    """
    headers = setup_hardening_env["biz1"]["headers"]
    cust_id = setup_hardening_env["biz1"]["customer"]["id"]

    q = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust_id,
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=30)),
            "items": [{"description": "Service A", "quantity": "1.00", "unit_price": "10000.00", "tax_rate": "18.00"}],
        },
        headers=headers,
    ).json()
    client.patch(f"/api/v1/quotations/{q['id']}", json={"status": "SENT"}, headers=headers)
    client.patch(f"/api/v1/quotations/{q['id']}", json={"status": "ACCEPTED"}, headers=headers)

    inv = client.post(f"/api/v1/quotations/{q['id']}/convert", headers=headers).json()
    assert Decimal(str(inv["total"])) == Decimal("11800.00")

    # Attempt overpayment of ₹15,000
    res = client.post(
        f"/api/v1/invoices/{inv['id']}/payments",
        json={"amount": "15000.00", "method": "UPI"},
        headers=headers,
    )
    assert res.status_code == 400
    assert "exceeds remaining balance" in res.json()["detail"].lower()


def test_editing_paid_invoice_strictly_rejected(client, setup_hardening_env):
    """
    Important accounting rule:
    Once an invoice is PAID and settled, its details cannot be casually modified.
    """
    headers = setup_hardening_env["biz1"]["headers"]
    cust_id = setup_hardening_env["biz1"]["customer"]["id"]

    q = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust_id,
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=30)),
            "items": [{"description": "Repair Service", "quantity": "1.00", "unit_price": "2000.00", "tax_rate": "0.00"}],
        },
        headers=headers,
    ).json()
    client.patch(f"/api/v1/quotations/{q['id']}", json={"status": "SENT"}, headers=headers)
    client.patch(f"/api/v1/quotations/{q['id']}", json={"status": "ACCEPTED"}, headers=headers)

    inv = client.post(f"/api/v1/quotations/{q['id']}/convert", headers=headers).json()

    # Pay in full
    pay_res = client.post(
        f"/api/v1/invoices/{inv['id']}/payments",
        json={"amount": "2000.00", "method": "CASH"},
        headers=headers,
    )
    assert pay_res.status_code == 201

    # Verify status is PAID
    inv_check = client.get(f"/api/v1/invoices/{inv['id']}", headers=headers).json()
    assert inv_check["status"] == "PAID"

    # Attempt to edit paid invoice
    edit_res = client.patch(
        f"/api/v1/invoices/{inv['id']}",
        json={"notes": "Altering records after settlement", "terms": "Altered terms"},
        headers=headers,
    )
    assert edit_res.status_code == 400
    assert "paid invoices are finalized and cannot be modified" in edit_res.json()["detail"].lower()


def test_deleting_issued_invoice_strictly_rejected(client, setup_hardening_env):
    """
    Important accounting rule:
    Don't casually delete financial records. An issued invoice should generally be
    CANCELLED rather than physically deleted to preserve business history.
    """
    headers = setup_hardening_env["biz1"]["headers"]
    cust_id = setup_hardening_env["biz1"]["customer"]["id"]

    q = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust_id,
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=30)),
            "items": [{"description": "Consultation", "quantity": "1.00", "unit_price": "5000.00"}],
        },
        headers=headers,
    ).json()
    client.patch(f"/api/v1/quotations/{q['id']}", json={"status": "SENT"}, headers=headers)
    client.patch(f"/api/v1/quotations/{q['id']}", json={"status": "ACCEPTED"}, headers=headers)

    inv = client.post(f"/api/v1/quotations/{q['id']}/convert", headers=headers).json()

    # Attempt physical deletion
    del_res = client.delete(f"/api/v1/invoices/{inv['id']}", headers=headers)
    assert del_res.status_code == 400
    assert "issued invoices cannot be deleted" in del_res.json()["detail"].lower()
    assert "cancelled" in del_res.json()["detail"].lower()

    # Verify proper cancellation workflow works
    cancel_res = client.patch(
        f"/api/v1/invoices/{inv['id']}",
        json={"status": "CANCELLED"},
        headers=headers,
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"


# ==============================================================================
# 6. LARGE PAYLOAD STRESS & SCALE TESTING
# ==============================================================================

def test_large_customer_list_and_search(client, setup_hardening_env):
    """Verify performance and stability with 50+ registered customers."""
    headers = setup_hardening_env["biz1"]["headers"]

    for i in range(1, 51):
        client.post(
            "/api/v1/customers",
            json={
                "name": f"Bulk Contractor {i:03d}",
                "phone": f"+91 90000 {i:05d}",
                "email": f"bulk{i}@contractor.in",
            },
            headers=headers,
        )

    # Fetch list
    res = client.get("/api/v1/customers", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 51  # includes initial client

    # Search filter
    search_res = client.get("/api/v1/customers?search=Bulk Contractor 042", headers=headers)
    assert search_res.status_code == 200
    matched = search_res.json()
    assert len(matched) == 1
    assert matched[0]["name"] == "Bulk Contractor 042"


def test_large_quotation_precision(client, setup_hardening_env):
    """
    Verify large quotation with 50 items calculates accurate NUMERIC(12, 2)
    totals without precision drift or overflow.
    """
    headers = setup_hardening_env["biz1"]["headers"]
    cust_id = setup_hardening_env["biz1"]["customer"]["id"]

    large_items = [
        {
            "description": f"Trade Hardware Item #{i}",
            "quantity": "2.50",
            "unit_price": "149.99",
            "tax_rate": "18.00",
        }
        for i in range(1, 51)
    ]

    res = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust_id,
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=30)),
            "discount": "250.00",
            "items": large_items,
        },
        headers=headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert len(data["items"]) == 50

    # 50 items * (2.50 * 149.99 = 374.98 subtotal per item) = 18749.00
    # 50 items * (374.98 * 0.18 = 67.50 tax per item) = 3375.00
    # Grand total = (18749.00 - 250.00 discount) + 3375.00 = 21874.00
    assert Decimal(str(data["subtotal"])) == Decimal("18749.00")
    assert Decimal(str(data["tax"])) == Decimal("3375.00")
    assert Decimal(str(data["total"])) == Decimal("21874.00")
