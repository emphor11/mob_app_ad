import uuid
from datetime import date, timedelta
import pytest


@pytest.fixture
def workflow_quotation_setup(client):
    """Set up user, business, customer, and a draft quotation."""
    suffix = uuid.uuid4().hex[:6]
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"contractor_{suffix}@smartquote.in",
            "password": "Password123!",
            "full_name": f"Workflow Contractor {suffix}",
        },
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    client.post(
        "/api/v1/business",
        json={
            "name": "Reliable Electricals",
            "owner_name": f"Workflow Contractor {suffix}",
            "phone": "+91 98765 12345",
            "email": f"contractor_{suffix}@smartquote.in",
            "address": "Sector 15, Faridabad, Haryana",
        },
        headers=headers,
    )

    cust = client.post(
        "/api/v1/customers",
        json={
            "name": "Kapurthala Mills",
            "phone": "+91 98111 88888",
        },
        headers=headers,
    ).json()

    # Create quotation (default status: DRAFT)
    quote = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust["id"],
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=15)),
            "items": [
                {
                    "description": "Industrial MCB 32A Triple Pole",
                    "quantity": "5.00",
                    "unit_price": "1800.00",
                    "tax_rate": "18.00",
                }
            ],
        },
        headers=headers,
    ).json()

    return {
        "headers": headers,
        "quote": quote,
    }


def test_quotation_mark_sent_accepted_workflow(client, workflow_quotation_setup):
    """Test full standard acceptance lifecycle: DRAFT -> SENT -> ACCEPTED."""
    headers = workflow_quotation_setup["headers"]
    quote_id = workflow_quotation_setup["quote"]["id"]

    # 1. DRAFT -> SENT
    res = client.patch(
        f"/api/v1/quotations/{quote_id}",
        json={"status": "SENT"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "SENT"

    # 2. SENT -> ACCEPTED
    res = client.patch(
        f"/api/v1/quotations/{quote_id}",
        json={"status": "ACCEPTED"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "ACCEPTED"


def test_quotation_mark_rejected_and_reopen(client, workflow_quotation_setup):
    """Test rejection lifecycle: DRAFT -> SENT -> REJECTED -> DRAFT (reopened)."""
    headers = workflow_quotation_setup["headers"]
    quote_id = workflow_quotation_setup["quote"]["id"]

    # DRAFT -> SENT
    client.patch(
        f"/api/v1/quotations/{quote_id}",
        json={"status": "SENT"},
        headers=headers,
    )

    # SENT -> REJECTED
    res = client.patch(
        f"/api/v1/quotations/{quote_id}",
        json={"status": "REJECTED"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "REJECTED"

    # Reopen back to DRAFT or SENT
    res = client.patch(
        f"/api/v1/quotations/{quote_id}",
        json={"status": "DRAFT"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "DRAFT"


def test_quotation_mark_expired_workflow(client, workflow_quotation_setup):
    """Test expiry lifecycle: DRAFT -> SENT -> EXPIRED."""
    headers = workflow_quotation_setup["headers"]
    quote_id = workflow_quotation_setup["quote"]["id"]

    # DRAFT -> SENT
    client.patch(
        f"/api/v1/quotations/{quote_id}",
        json={"status": "SENT"},
        headers=headers,
    )

    # SENT -> EXPIRED
    res = client.patch(
        f"/api/v1/quotations/{quote_id}",
        json={"status": "EXPIRED"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "EXPIRED"


def test_quotation_invalid_transition_rejected(client, workflow_quotation_setup):
    """Cannot jump directly from DRAFT to ACCEPTED or REJECTED without sending first."""
    headers = workflow_quotation_setup["headers"]
    quote_id = workflow_quotation_setup["quote"]["id"]

    # DRAFT -> ACCEPTED (Invalid)
    res = client.patch(
        f"/api/v1/quotations/{quote_id}",
        json={"status": "ACCEPTED"},
        headers=headers,
    )
    assert res.status_code == 400
    assert "Cannot transition quotation status from DRAFT to ACCEPTED" in res.json()["detail"]

    # DRAFT -> REJECTED (Invalid)
    res = client.patch(
        f"/api/v1/quotations/{quote_id}",
        json={"status": "REJECTED"},
        headers=headers,
    )
    assert res.status_code == 400
    assert "Cannot transition quotation status from DRAFT to REJECTED" in res.json()["detail"]
