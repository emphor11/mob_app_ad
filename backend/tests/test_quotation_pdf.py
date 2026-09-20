import uuid
from datetime import date, timedelta
import pytest


@pytest.fixture
def sample_quotation_setup(client):
    """Set up two businesses and a quotation in business 1."""
    # User 1 & Business 1
    suffix1 = uuid.uuid4().hex[:6]
    reg1 = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"electrician_{suffix1}@smartquote.in",
            "password": "Password123!",
            "full_name": f"Master Electrician {suffix1}",
        },
    )
    token1 = reg1.json()["access_token"]
    headers1 = {"Authorization": f"Bearer {token1}"}

    client.post(
        "/api/v1/business",
        json={
            "name": "Super Power Electricals",
            "owner_name": f"Master Electrician {suffix1}",
            "phone": "+91 99999 11111",
            "email": f"electrician_{suffix1}@smartquote.in",
            "address": "Lajpat Nagar, New Delhi",
            "gstin": "07AAAAA1234A1Z1",
        },
        headers=headers1,
    )

    cust1 = client.post(
        "/api/v1/customers",
        json={
            "name": "Apex Builders",
            "phone": "+91 98888 22222",
            "email": "procurement@apexbuilders.com",
            "address": "Sector 18, Noida",
            "gstin": "09BBBBB5678B1Z2",
        },
        headers=headers1,
    ).json()

    # Create quotation in Business 1
    quote = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust1["id"],
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=14)),
            "discount": "500.00",
            "notes": "Prices inclusive of transport to site.",
            "terms": "100% payment on invoice submission.",
            "items": [
                {
                    "description": "Copper Cable 2.5 sq mm",
                    "quantity": "10.00",
                    "unit_price": "1200.00",
                    "tax_rate": "18.00",
                },
                {
                    "description": "Modular Switches 6A",
                    "quantity": "50.00",
                    "unit_price": "80.00",
                    "tax_rate": "18.00",
                },
            ],
        },
        headers=headers1,
    ).json()

    # User 2 & Business 2 (Attacker / Different Business)
    suffix2 = uuid.uuid4().hex[:6]
    reg2 = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"rival_{suffix2}@smartquote.in",
            "password": "Password123!",
            "full_name": f"Rival Contractor {suffix2}",
        },
    )
    token2 = reg2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    client.post(
        "/api/v1/business",
        json={
            "name": "Rival Hardware",
            "owner_name": f"Rival Contractor {suffix2}",
            "phone": "+91 97777 33333",
            "email": f"rival_{suffix2}@smartquote.in",
            "address": "Chandni Chowk, Delhi",
        },
        headers=headers2,
    )

    return {
        "headers1": headers1,
        "headers2": headers2,
        "quote": quote,
    }


def test_download_quotation_pdf_success(client, sample_quotation_setup):
    """Business owner can download their quotation as a valid PDF stream."""
    headers = sample_quotation_setup["headers1"]
    quote = sample_quotation_setup["quote"]

    res = client.get(f"/api/v1/quotations/{quote['id']}/pdf", headers=headers)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert f'inline; filename="{quote["quotation_number"]}.pdf"' in res.headers["content-disposition"]
    assert res.content.startswith(b"%PDF")
    assert len(res.content) > 1000


def test_download_quotation_pdf_cross_business_isolation(client, sample_quotation_setup):
    """User from another business cannot access or download quotation PDF."""
    headers2 = sample_quotation_setup["headers2"]
    quote = sample_quotation_setup["quote"]

    res = client.get(f"/api/v1/quotations/{quote['id']}/pdf", headers=headers2)
    assert res.status_code == 404
    assert res.json()["detail"] == "Quotation not found."


def test_download_quotation_pdf_not_found(client, sample_quotation_setup):
    """Attempting to download nonexistent quotation PDF returns 404."""
    headers = sample_quotation_setup["headers1"]
    non_existent_id = str(uuid.uuid4())

    res = client.get(f"/api/v1/quotations/{non_existent_id}/pdf", headers=headers)
    assert res.status_code == 404
    assert res.json()["detail"] == "Quotation not found."
