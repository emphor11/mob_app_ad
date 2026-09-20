import uuid
from datetime import date, timedelta
from decimal import Decimal
import pytest


@pytest.fixture
def setup_business_with_invoice(client):
    """Set up user, business, customer, quotation, and converted invoice."""
    suffix = uuid.uuid4().hex[:6]
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"electrician_{suffix}@smartquote.in",
            "password": "Password123!",
            "full_name": f"Electrician Pro {suffix}",
        },
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    client.post(
        "/api/v1/business",
        json={
            "name": f"Spark Electricals {suffix}",
            "owner_name": f"Electrician Pro {suffix}",
            "phone": "+91 98765 11111",
            "email": f"spark_{suffix}@smartquote.in",
            "address": "Sector 18, Noida, UP",
            "gstin": "09ABCDE1234F1Z5",
        },
        headers=headers,
    )

    cust = client.post(
        "/api/v1/customers",
        json={
            "name": f"Apex Towers {suffix}",
            "phone": "+91 98111 22222",
            "email": f"apex_{suffix}@domain.com",
            "address": "Tower B, Phase 2, Noida",
        },
        headers=headers,
    ).json()

    # Create quotation and accept it
    quote = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust["id"],
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=15)),
            "discount": "500.00",
            "notes": "Supply and installation of MCBs and distribution boards.",
            "terms": "Warranty 1 year on wiring.",
            "items": [
                {
                    "description": "32A 4-Pole MCB",
                    "quantity": "5.00",
                    "unit_price": "1200.00",
                    "tax_rate": "18.00",
                },
                {
                    "description": "Copper Cable 4 sq mm (90m coil)",
                    "quantity": "2.00",
                    "unit_price": "4500.00",
                    "tax_rate": "18.00",
                },
            ],
        },
        headers=headers,
    ).json()

    # Move status: DRAFT -> SENT -> ACCEPTED
    client.patch(
        f"/api/v1/quotations/{quote['id']}",
        json={"status": "SENT"},
        headers=headers,
    )
    client.patch(
        f"/api/v1/quotations/{quote['id']}",
        json={"status": "ACCEPTED"},
        headers=headers,
    )

    conv_res = client.post(
        f"/api/v1/quotations/{quote['id']}/convert",
        json={"due_days": 30},
        headers=headers,
    )
    assert conv_res.status_code == 201
    invoice = conv_res.json()

    return {
        "token": token,
        "headers": headers,
        "customer": cust,
        "quotation": quote,
        "invoice": invoice,
        "suffix": suffix,
    }


def test_list_invoices(client, setup_business_with_invoice):
    """Test listing invoices with filtering and searching."""
    headers = setup_business_with_invoice["headers"]
    invoice = setup_business_with_invoice["invoice"]
    customer = setup_business_with_invoice["customer"]

    # 1. Unfiltered list
    res = client.get("/api/v1/invoices", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    found = next((inv for inv in data if inv["id"] == invoice["id"]), None)
    assert found is not None
    assert found["invoice_number"] == invoice["invoice_number"]
    assert found["customer_name"] == customer["name"]
    assert found["status"] == "UNPAID"

    # 2. Filter by status matching
    res = client.get("/api/v1/invoices?status=UNPAID", headers=headers)
    assert res.status_code == 200
    assert any(inv["id"] == invoice["id"] for inv in res.json())

    # 3. Filter by non-matching status
    res = client.get("/api/v1/invoices?status=PAID", headers=headers)
    assert res.status_code == 200
    assert not any(inv["id"] == invoice["id"] for inv in res.json())

    # 4. Search by invoice number
    res = client.get(f"/api/v1/invoices?search={invoice['invoice_number']}", headers=headers)
    assert res.status_code == 200
    assert any(inv["id"] == invoice["id"] for inv in res.json())

    # 5. Search by customer name
    res = client.get(f"/api/v1/invoices?search={customer['name'][:6]}", headers=headers)
    assert res.status_code == 200
    assert any(inv["id"] == invoice["id"] for inv in res.json())


def test_get_invoice_details(client, setup_business_with_invoice):
    """Test retrieving full invoice details and line items."""
    headers = setup_business_with_invoice["headers"]
    invoice = setup_business_with_invoice["invoice"]

    res = client.get(f"/api/v1/invoices/{invoice['id']}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == invoice["id"]
    assert data["invoice_number"] == invoice["invoice_number"]
    assert len(data["items"]) == 2
    assert Decimal(data["subtotal"]) == Decimal("15000.00")
    assert Decimal(data["discount"]) == Decimal("500.00")
    assert Decimal(data["total"]) > Decimal("0")


def test_download_invoice_pdf(client, setup_business_with_invoice):
    """Test downloading generated Tax Invoice PDF."""
    headers = setup_business_with_invoice["headers"]
    invoice = setup_business_with_invoice["invoice"]

    res = client.get(f"/api/v1/invoices/{invoice['id']}/pdf", headers=headers)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert f'filename="{invoice["invoice_number"]}.pdf"' in res.headers["content-disposition"]
    assert res.content.startswith(b"%PDF")
    assert len(res.content) > 1000


def test_update_invoice(client, setup_business_with_invoice):
    """Test updating invoice status, due date, and notes."""
    headers = setup_business_with_invoice["headers"]
    invoice = setup_business_with_invoice["invoice"]

    new_due_date = str(date.today() + timedelta(days=45))
    update_res = client.patch(
        f"/api/v1/invoices/{invoice['id']}",
        json={
            "status": "PAID",
            "due_date": new_due_date,
            "notes": "Paid in full via NEFT reference #UTR987654321.",
        },
        headers=headers,
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["status"] == "PAID"
    assert updated["due_date"] == new_due_date
    assert "UTR987654321" in updated["notes"]

    # Verify persistent state via get
    get_res = client.get(f"/api/v1/invoices/{invoice['id']}", headers=headers)
    assert get_res.json()["status"] == "PAID"


def test_invoice_multi_tenant_isolation(client, setup_business_with_invoice):
    """Ensure another registered business cannot view, download, or edit the invoice."""
    invoice = setup_business_with_invoice["invoice"]

    # Create another user and business
    suffix = uuid.uuid4().hex[:6]
    reg2 = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"attacker_{suffix}@otherbusiness.com",
            "password": "Password123!",
            "full_name": f"Attacker {suffix}",
        },
    )
    token2 = reg2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    client.post(
        "/api/v1/business",
        json={
            "name": f"Other Business {suffix}",
            "owner_name": "Rival",
            "phone": "+91 99999 88888",
            "email": f"rival_{suffix}@other.com",
            "address": "Delhi",
            "gstin": "07AAAAA0000A1Z5",
        },
        headers=headers2,
    )

    # 1. Rival cannot see in list
    res_list = client.get("/api/v1/invoices", headers=headers2)
    assert res_list.status_code == 200
    assert not any(inv["id"] == invoice["id"] for inv in res_list.json())

    # 2. Rival cannot get invoice by ID
    res_get = client.get(f"/api/v1/invoices/{invoice['id']}", headers=headers2)
    assert res_get.status_code == 404

    # 3. Rival cannot download PDF
    res_pdf = client.get(f"/api/v1/invoices/{invoice['id']}/pdf", headers=headers2)
    assert res_pdf.status_code == 404

    # 4. Rival cannot patch invoice
    res_patch = client.patch(
        f"/api/v1/invoices/{invoice['id']}",
        json={"status": "CANCELLED"},
        headers=headers2,
    )
    assert res_patch.status_code == 404
