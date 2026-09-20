import uuid
from datetime import date, timedelta
from decimal import Decimal
import pytest


@pytest.fixture
def setup_accepted_quotation(client):
    """Set up user, business, customer, and an ACCEPTED quotation."""
    suffix = uuid.uuid4().hex[:6]
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"fabricator_{suffix}@smartquote.in",
            "password": "Password123!",
            "full_name": f"Fabricator Pro {suffix}",
        },
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    client.post(
        "/api/v1/business",
        json={
            "name": "Steel & Iron Works",
            "owner_name": f"Fabricator Pro {suffix}",
            "phone": "+91 98765 99999",
            "email": f"fabricator_{suffix}@smartquote.in",
            "address": "Industrial Area, Ghaziabad, UP",
            "gstin": "09AAAAA9999A1Z9",
        },
        headers=headers,
    )

    cust = client.post(
        "/api/v1/customers",
        json={
            "name": "Metro Infra Ltd",
            "phone": "+91 98111 55555",
            "email": "site@metroinfra.in",
            "address": "Expressway Site Office, Noida",
        },
        headers=headers,
    ).json()

    quote = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust["id"],
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=20)),
            "discount": "1000.00",
            "notes": "Includes on-site welding and fabrication.",
            "terms": "Net 15 days upon billing.",
            "items": [
                {
                    "description": "MS Angle 50x50x6mm",
                    "quantity": "40.00",
                    "unit_price": "850.00",
                    "tax_rate": "18.00",
                },
                {
                    "description": "Welding Electrodes E6013",
                    "quantity": "10.00",
                    "unit_price": "450.00",
                    "tax_rate": "18.00",
                },
            ],
        },
        headers=headers,
    ).json()

    # Move status: DRAFT -> SENT -> ACCEPTED
    client.patch(f"/api/v1/quotations/{quote['id']}", json={"status": "SENT"}, headers=headers)
    accepted_quote = client.patch(f"/api/v1/quotations/{quote['id']}", json={"status": "ACCEPTED"}, headers=headers).json()

    # Rival user / business
    rival_suffix = uuid.uuid4().hex[:6]
    rival_reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"rival_{rival_suffix}@smartquote.in",
            "password": "Password123!",
            "full_name": f"Rival Fabricator {rival_suffix}",
        },
    )
    rival_token = rival_reg.json()["access_token"]
    rival_headers = {"Authorization": f"Bearer {rival_token}"}
    client.post(
        "/api/v1/business",
        json={
            "name": "Rival Fabrications",
            "owner_name": f"Rival Fabricator {rival_suffix}",
            "phone": "+91 98765 00000",
            "email": f"rival_{rival_suffix}@smartquote.in",
            "address": "Delhi",
        },
        headers=rival_headers,
    )

    return {
        "headers": headers,
        "rival_headers": rival_headers,
        "quote": accepted_quote,
        "cust": cust,
    }


def test_convert_accepted_quotation_to_invoice(client, setup_accepted_quotation):
    """Test converting an ACCEPTED quotation to a formal tax invoice."""
    headers = setup_accepted_quotation["headers"]
    quote = setup_accepted_quotation["quote"]

    res = client.post(
        f"/api/v1/quotations/{quote['id']}/convert",
        json={"due_days": 15},
        headers=headers,
    )
    assert res.status_code == 201
    invoice = res.json()

    # Check Invoice Header details
    assert invoice["invoice_number"].startswith(f"INV-{date.today().year}-")
    assert invoice["quotation_id"] == quote["id"]
    assert invoice["customer_id"] == quote["customer_id"]
    assert invoice["customer_name"] == "Metro Infra Ltd"
    assert invoice["status"] == "UNPAID"
    assert Decimal(str(invoice["subtotal"])) == Decimal(str(quote["subtotal"]))
    assert Decimal(str(invoice["discount"])) == Decimal(str(quote["discount"]))
    assert Decimal(str(invoice["tax"])) == Decimal(str(quote["tax"]))
    assert Decimal(str(invoice["total"])) == Decimal(str(quote["total"]))
    assert Decimal(str(invoice["paid_amount"])) == Decimal("0.00")

    # Critical Rule: Check independent copy of line items
    assert len(invoice["items"]) == len(quote["items"])
    inv_items = invoice["items"]
    q_items = quote["items"]
    for i in range(len(inv_items)):
        assert inv_items[i]["id"] != q_items[i]["id"]
        assert inv_items[i]["description"] == q_items[i]["description"]
        assert Decimal(str(inv_items[i]["quantity"])) == Decimal(str(q_items[i]["quantity"]))
        assert Decimal(str(inv_items[i]["unit_price"])) == Decimal(str(q_items[i]["unit_price"]))
        assert Decimal(str(inv_items[i]["tax_rate"])) == Decimal(str(q_items[i]["tax_rate"]))
        assert Decimal(str(inv_items[i]["line_total"])) == Decimal(str(q_items[i]["line_total"]))

    # Check Quotation status transitioned to CONVERTED
    q_res = client.get(f"/api/v1/quotations/{quote['id']}", headers=headers)
    assert q_res.status_code == 200
    assert q_res.json()["status"] == "CONVERTED"

    # Verify query via GET /api/v1/invoices and GET /api/v1/invoices/{id}
    invoices_list = client.get("/api/v1/invoices", headers=headers).json()
    assert len(invoices_list) == 1
    assert invoices_list[0]["id"] == invoice["id"]

    invoice_get = client.get(f"/api/v1/invoices/{invoice['id']}", headers=headers).json()
    assert invoice_get["invoice_number"] == invoice["invoice_number"]


def test_convert_non_accepted_quotation_rejected(client, setup_accepted_quotation):
    """Attempting to convert a quotation that is not ACCEPTED must fail."""
    headers = setup_accepted_quotation["headers"]
    cust = setup_accepted_quotation["cust"]

    # Create a draft quotation
    draft_quote = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust["id"],
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=10)),
            "items": [{"description": "Sample Item", "quantity": "1.00", "unit_price": "100.00", "tax_rate": "18.00"}],
        },
        headers=headers,
    ).json()

    res = client.post(
        f"/api/v1/quotations/{draft_quote['id']}/convert",
        json={},
        headers=headers,
    )
    assert res.status_code == 400
    assert "Only ACCEPTED quotations can be converted" in res.json()["detail"]


def test_cannot_convert_already_converted_quotation(client, setup_accepted_quotation):
    """Converting an already converted quotation must fail with 400."""
    headers = setup_accepted_quotation["headers"]
    quote = setup_accepted_quotation["quote"]

    # First conversion succeeds
    res1 = client.post(f"/api/v1/quotations/{quote['id']}/convert", json={}, headers=headers)
    assert res1.status_code == 201

    # Second conversion fails
    res2 = client.post(f"/api/v1/quotations/{quote['id']}/convert", json={}, headers=headers)
    assert res2.status_code == 400
    assert "Only ACCEPTED quotations can be converted" in res2.json()["detail"]


def test_convert_quotation_tenant_isolation(client, setup_accepted_quotation):
    """Another business cannot convert someone else's quotation."""
    rival_headers = setup_accepted_quotation["rival_headers"]
    quote = setup_accepted_quotation["quote"]

    res = client.post(
        f"/api/v1/quotations/{quote['id']}/convert",
        json={},
        headers=rival_headers,
    )
    assert res.status_code == 404
    assert "Quotation not found" in res.json()["detail"]
