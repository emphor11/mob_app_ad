import uuid
from datetime import date, timedelta
from decimal import Decimal
import pytest


@pytest.fixture
def setup_reminder_scenario(client):
    """
    Sets up a business with an invoice matching the prompt example:
    - Customer: Raj
    - Invoice: Total ₹11,800, Paid ₹5,000, Remaining ₹6,800
    """
    suffix = uuid.uuid4().hex[:6]
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"trader_{suffix}@smartquote.in",
            "password": "Password123!",
            "full_name": f"Trader {suffix}",
        },
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    client.post(
        "/api/v1/business",
        json={
            "name": f"Trades {suffix}",
            "owner_name": f"Trader {suffix}",
            "phone": "+91 98765 43210",
            "email": f"trader_{suffix}@smartquote.in",
            "address": "Mumbai, Maharashtra",
        },
        headers=headers,
    )

    # Customer: Raj
    cust_res = client.post(
        "/api/v1/customers",
        json={"name": "Raj", "phone": "+91 98765 00001", "email": "raj@example.com"},
        headers=headers,
    )
    customer = cust_res.json()

    # Create Quotation -> Accept -> Convert to Invoice
    q_res = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": customer["id"],
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=15)),
            "items": [
                {
                    "description": "Electrical Installation",
                    "quantity": "1.00",
                    "unit_price": "10000.00",
                    "tax_rate": "18.00",
                }
            ],
        },
        headers=headers,
    )
    quotation = q_res.json()

    client.patch(f"/api/v1/quotations/{quotation['id']}", json={"status": "SENT"}, headers=headers)
    client.patch(f"/api/v1/quotations/{quotation['id']}", json={"status": "ACCEPTED"}, headers=headers)
    inv_res = client.post(
        f"/api/v1/quotations/{quotation['id']}/convert",
        json={"due_days": 5},
        headers=headers,
    )
    assert inv_res.status_code == 201
    invoice = inv_res.json()

    # Record partial payment of ₹5,000 so remaining is exactly ₹6,800
    client.post(
        f"/api/v1/invoices/{invoice['id']}/payments",
        json={
            "amount": "5000.00",
            "payment_date": str(date.today()),
            "method": "UPI",
            "reference": "UPI-PART-1",
        },
        headers=headers,
    )

    # Fetch updated invoice
    updated_inv = client.get(f"/api/v1/invoices/{invoice['id']}", headers=headers).json()

    return {
        "headers": headers,
        "customer": customer,
        "invoice": updated_inv,
        "suffix": suffix,
    }


def test_reminder_template_exact_prompt_text(client, setup_reminder_scenario):
    """
    Verify generated message matches the exact user specification:
    'Hi Raj, this is a reminder regarding invoice INV-0042 for ₹6,800, which is currently pending. Please let us know once the payment is completed.'
    """
    headers = setup_reminder_scenario["headers"]
    invoice = setup_reminder_scenario["invoice"]

    res = client.get(f"/api/v1/invoices/{invoice['id']}/reminder-template", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["customer_name"] == "Raj"
    assert Decimal(str(data["total_amount"])) == Decimal("11800.00")
    assert Decimal(str(data["paid_amount"])) == Decimal("5000.00")
    assert Decimal(str(data["remaining_amount"])) == Decimal("6800.00")

    # Verify standard message format
    standard_msg = data["standard_message"]
    expected_part = f"Hi Raj, this is a reminder regarding invoice {invoice['invoice_number']} for ₹6,800, which is currently pending. Please let us know once the payment is completed."
    assert standard_msg == expected_part

    # WhatsApp deep-link exists and targets Raj's phone
    assert data["whatsapp_url"] is not None
    assert "919876500001" in data["whatsapp_url"]
    assert "Hi+Raj" in data["whatsapp_url"] or "Hi%20Raj" in data["whatsapp_url"]


def test_record_reminder_dispatch_and_audit(client, setup_reminder_scenario):
    """
    Verify recording a sent reminder logs the channel, message, and updates invoice last_reminded_at.
    """
    headers = setup_reminder_scenario["headers"]
    invoice = setup_reminder_scenario["invoice"]

    # Before reminder: last_reminded_at is None
    assert invoice.get("last_reminded_at") is None

    # Dispatch reminder
    send_payload = {
        "channel": "WHATSAPP",
        "recipient_name": "Raj",
        "recipient_phone": "+91 98765 00001",
        "message": f"Hi Raj, this is a reminder regarding invoice {invoice['invoice_number']} for ₹6,800.",
    }
    create_res = client.post(
        f"/api/v1/invoices/{invoice['id']}/reminders",
        json=send_payload,
        headers=headers,
    )
    assert create_res.status_code == 201
    log = create_res.json()
    assert log["channel"] == "WHATSAPP"
    assert log["recipient_name"] == "Raj"
    assert log["sent_at"] is not None

    # Check invoice has updated last_reminded_at
    inv_check = client.get(f"/api/v1/invoices/{invoice['id']}", headers=headers).json()
    assert inv_check["last_reminded_at"] is not None

    # Check reminder history audit list
    history_res = client.get(f"/api/v1/invoices/{invoice['id']}/reminders", headers=headers)
    assert history_res.status_code == 200
    history = history_res.json()
    assert len(history) == 1
    assert history[0]["id"] == log["id"]


def test_reminder_tenant_isolation(client, setup_reminder_scenario):
    """
    Verify another business cannot fetch reminder templates or post reminder logs
    for an invoice belonging to a different business.
    """
    invoice = setup_reminder_scenario["invoice"]

    # Register second merchant
    suffix = uuid.uuid4().hex[:6]
    reg2 = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"intruder_{suffix}@smartquote.in",
            "password": "Password123!",
            "full_name": f"Intruder {suffix}",
        },
    )
    token2 = reg2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}
    client.post(
        "/api/v1/business",
        json={
            "name": f"Intruder Firm {suffix}",
            "owner_name": f"Intruder {suffix}",
            "phone": "+91 99999 88888",
            "email": f"intruder_{suffix}@smartquote.in",
            "address": "Delhi",
        },
        headers=headers2,
    )

    # Attempt to read template from other business
    tpl_res = client.get(f"/api/v1/invoices/{invoice['id']}/reminder-template", headers=headers2)
    assert tpl_res.status_code == 404

    # Attempt to post reminder to other business
    send_res = client.post(
        f"/api/v1/invoices/{invoice['id']}/reminders",
        json={"channel": "WHATSAPP", "message": "Test"},
        headers=headers2,
    )
    assert send_res.status_code == 404


def test_due_alerts_categorization(client):
    """
    Verify automated due alerts categorizes:
    - Invoices due tomorrow -> DUE_TOMORROW
    - Invoices overdue -> OVERDUE
    - Invoices fully paid -> excluded
    """
    suffix = uuid.uuid4().hex[:6]
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"alerts_{suffix}@smartquote.in",
            "password": "Password123!",
            "full_name": f"Alerts Owner {suffix}",
        },
    )
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    client.post(
        "/api/v1/business",
        json={
            "name": f"Alerts Co {suffix}",
            "owner_name": f"Alerts Owner {suffix}",
            "phone": "+91 98765 99999",
            "email": f"alerts_{suffix}@smartquote.in",
            "address": "Chennai, Tamil Nadu",
        },
        headers=headers,
    )

    cust = client.post(
        "/api/v1/customers",
        json={"name": "Kiran", "phone": "+91 97777 66666", "email": "kiran@example.com"},
        headers=headers,
    ).json()

    # 1. Invoice due tomorrow
    q_tomorrow = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust["id"],
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=15)),
            "items": [{"description": "Repair", "quantity": "1.00", "unit_price": "2000.00", "tax_rate": "0.00"}],
        },
        headers=headers,
    ).json()
    client.patch(f"/api/v1/quotations/{q_tomorrow['id']}", json={"status": "SENT"}, headers=headers)
    client.patch(f"/api/v1/quotations/{q_tomorrow['id']}", json={"status": "ACCEPTED"}, headers=headers)
    inv_tomorrow = client.post(
        f"/api/v1/quotations/{q_tomorrow['id']}/convert",
        json={"due_days": 1},
        headers=headers,
    ).json()

    # 2. Invoice overdue (due 3 days ago)
    q_overdue = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust["id"],
            "issue_date": str(date.today() - timedelta(days=10)),
            "valid_until": str(date.today()),
            "items": [{"description": "Wiring", "quantity": "1.00", "unit_price": "5000.00", "tax_rate": "0.00"}],
        },
        headers=headers,
    ).json()
    client.patch(f"/api/v1/quotations/{q_overdue['id']}", json={"status": "SENT"}, headers=headers)
    client.patch(f"/api/v1/quotations/{q_overdue['id']}", json={"status": "ACCEPTED"}, headers=headers)
    inv_overdue = client.post(
        f"/api/v1/quotations/{q_overdue['id']}/convert",
        json={"due_days": 0},
        headers=headers,
    ).json()
    # Manually update invoice due_date to 3 days ago
    client.patch(
        f"/api/v1/invoices/{inv_overdue['id']}",
        json={"due_date": str(date.today() - timedelta(days=3))},
        headers=headers,
    )

    # 3. Invoice fully paid
    q_paid = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust["id"],
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=15)),
            "items": [{"description": "Inspection", "quantity": "1.00", "unit_price": "1000.00", "tax_rate": "0.00"}],
        },
        headers=headers,
    ).json()
    client.patch(f"/api/v1/quotations/{q_paid['id']}", json={"status": "SENT"}, headers=headers)
    client.patch(f"/api/v1/quotations/{q_paid['id']}", json={"status": "ACCEPTED"}, headers=headers)
    inv_paid = client.post(
        f"/api/v1/quotations/{q_paid['id']}/convert",
        json={"due_days": 1},
        headers=headers,
    ).json()
    client.post(
        f"/api/v1/invoices/{inv_paid['id']}/payments",
        json={"amount": "1000.00", "payment_date": str(date.today()), "method": "CASH"},
        headers=headers,
    )

    # Check alerts endpoint
    alerts_res = client.get("/api/v1/invoices/reminders/due-alerts", headers=headers)
    assert alerts_res.status_code == 200
    data = alerts_res.json()

    assert data["due_tomorrow_count"] >= 1
    assert data["overdue_count"] >= 1

    alert_inv_ids = [a["invoice_id"] for a in data["alerts"]]
    assert inv_tomorrow["id"] in alert_inv_ids
    assert inv_overdue["id"] in alert_inv_ids
    assert inv_paid["id"] not in alert_inv_ids
