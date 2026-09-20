import uuid
from datetime import date, timedelta
from decimal import Decimal
import pytest


@pytest.fixture
def setup_invoice_for_payment(client):
    """Set up user, business, customer, quotation, and converted invoice for payment tests."""
    suffix = uuid.uuid4().hex[:6]
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"contractor_{suffix}@smartquote.in",
            "password": "Password123!",
            "full_name": f"Contractor {suffix}",
        },
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    client.post(
        "/api/v1/business",
        json={
            "name": f"Prime Contractors {suffix}",
            "owner_name": f"Contractor {suffix}",
            "phone": "+91 98765 44444",
            "email": f"contractor_{suffix}@smartquote.in",
            "address": "Connaught Place, New Delhi",
            "gstin": "07AAAAA1234A1Z1",
        },
        headers=headers,
    )

    cust = client.post(
        "/api/v1/customers",
        json={
            "name": f"Delhi Metro Infra {suffix}",
            "phone": "+91 98111 33333",
            "email": f"dmsg_{suffix}@domain.com",
            "address": "Barakhamba Road, New Delhi",
        },
        headers=headers,
    ).json()

    # Create quotation: ₹10,000 + 18% GST (₹1,800) = ₹11,800 Total
    quote = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust["id"],
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=15)),
            "discount": "0.00",
            "items": [
                {
                    "description": "Standard Electrical Wiring Package",
                    "quantity": "1.00",
                    "unit_price": "10000.00",
                    "tax_rate": "18.00",
                }
            ],
        },
        headers=headers,
    ).json()

    # Transition to ACCEPTED
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

    # Convert to invoice
    conv_res = client.post(
        f"/api/v1/quotations/{quote['id']}/convert",
        json={"due_days": 15},
        headers=headers,
    )
    assert conv_res.status_code == 201
    invoice = conv_res.json()
    assert Decimal(invoice["total"]) == Decimal("11800.00")
    assert invoice["status"] == "UNPAID"

    return {
        "headers": headers,
        "customer": cust,
        "invoice": invoice,
        "suffix": suffix,
    }


def test_partial_and_full_payment_state_machine(client, setup_invoice_for_payment):
    """
    Test example from Phase 17 prompt:
    Invoice = ₹11,800
    ₹0 paid → UNPAID
    ₹5,000 paid → PARTIALLY_PAID
    ₹11,800 paid → PAID
    """
    headers = setup_invoice_for_payment["headers"]
    invoice = setup_invoice_for_payment["invoice"]
    inv_id = invoice["id"]

    # 1. Initially UNPAID
    res_init = client.get(f"/api/v1/invoices/{inv_id}", headers=headers)
    assert res_init.json()["status"] == "UNPAID"
    assert Decimal(res_init.json()["paid_amount"]) == Decimal("0.00")

    # 2. Record Partial Payment: ₹5,000 via UPI
    pay1_res = client.post(
        f"/api/v1/invoices/{inv_id}/payments",
        json={
            "amount": "5000.00",
            "payment_date": str(date.today()),
            "method": "UPI",
            "reference": "UPI9876543210",
            "notes": "Advance payment via PhonePe",
        },
        headers=headers,
    )
    assert pay1_res.status_code == 201
    pay1_data = pay1_res.json()
    assert Decimal(pay1_data["amount"]) == Decimal("5000.00")
    assert pay1_data["method"] == "UPI"
    assert pay1_data["reference"] == "UPI9876543210"

    # Verify Invoice is now PARTIALLY_PAID with ₹5,000 paid
    res_part = client.get(f"/api/v1/invoices/{inv_id}", headers=headers)
    inv_part = res_part.json()
    assert inv_part["status"] == "PARTIALLY_PAID"
    assert Decimal(inv_part["paid_amount"]) == Decimal("5000.00")
    assert len(inv_part["payments"]) == 1

    # 3. Record Second Payment: ₹6,800 via BANK_TRANSFER (Remaining Balance)
    pay2_res = client.post(
        f"/api/v1/invoices/{inv_id}/payments",
        json={
            "amount": "6800.00",
            "payment_date": str(date.today()),
            "method": "BANK_TRANSFER",
            "reference": "NEFT1122334455",
            "notes": "Final settlement",
        },
        headers=headers,
    )
    assert pay2_res.status_code == 201

    # Verify Invoice is now PAID with ₹11,800 paid
    res_paid = client.get(f"/api/v1/invoices/{inv_id}", headers=headers)
    inv_paid = res_paid.json()
    assert inv_paid["status"] == "PAID"
    assert Decimal(inv_paid["paid_amount"]) == Decimal("11800.00")
    assert len(inv_paid["payments"]) == 2


def test_overpayment_strictly_rejected(client, setup_invoice_for_payment):
    """
    Test critical validation:
    Invoice = ₹11,800
    Payment = ₹15,000 -> Must reject!
    """
    headers = setup_invoice_for_payment["headers"]
    invoice = setup_invoice_for_payment["invoice"]
    inv_id = invoice["id"]

    # Attempt to pay ₹15,000 on an ₹11,800 invoice
    overpay_res = client.post(
        f"/api/v1/invoices/{inv_id}/payments",
        json={
            "amount": "15000.00",
            "payment_date": str(date.today()),
            "method": "CASH",
        },
        headers=headers,
    )
    assert overpay_res.status_code == 400
    detail = overpay_res.json()["detail"]
    assert "exceeds remaining balance" in detail

    # Invoice remains unchanged
    res = client.get(f"/api/v1/invoices/{inv_id}", headers=headers)
    assert res.json()["status"] == "UNPAID"
    assert Decimal(res.json()["paid_amount"]) == Decimal("0.00")

    # Pay ₹10,000 (valid partial)
    client.post(
        f"/api/v1/invoices/{inv_id}/payments",
        json={
            "amount": "10000.00",
            "payment_date": str(date.today()),
            "method": "CASH",
        },
        headers=headers,
    )

    # Remaining is now ₹1,800. Attempt to pay ₹2,000 -> Must reject!
    overpay2_res = client.post(
        f"/api/v1/invoices/{inv_id}/payments",
        json={
            "amount": "2000.00",
            "payment_date": str(date.today()),
            "method": "CASH",
        },
        headers=headers,
    )
    assert overpay2_res.status_code == 400
    assert "exceeds remaining balance" in overpay2_res.json()["detail"]


def test_payment_on_cancelled_invoice_rejected(client, setup_invoice_for_payment):
    """Ensure payments cannot be recorded against a cancelled invoice."""
    headers = setup_invoice_for_payment["headers"]
    invoice = setup_invoice_for_payment["invoice"]
    inv_id = invoice["id"]

    # Cancel invoice
    client.patch(
        f"/api/v1/invoices/{inv_id}",
        json={"status": "CANCELLED"},
        headers=headers,
    )

    # Attempt payment
    res = client.post(
        f"/api/v1/invoices/{inv_id}/payments",
        json={
            "amount": "1000.00",
            "payment_date": str(date.today()),
            "method": "UPI",
        },
        headers=headers,
    )
    assert res.status_code == 400
    assert "cancelled invoice" in res.json()["detail"].lower()


def test_payment_listing_and_filtering(client, setup_invoice_for_payment):
    """Test listing payments across invoices with filter by method and invoice."""
    headers = setup_invoice_for_payment["headers"]
    invoice = setup_invoice_for_payment["invoice"]
    inv_id = invoice["id"]

    # Record 1 UPI payment and 1 CASH payment
    client.post(
        f"/api/v1/invoices/{inv_id}/payments",
        json={"amount": "2000.00", "payment_date": str(date.today()), "method": "UPI"},
        headers=headers,
    )
    client.post(
        f"/api/v1/invoices/{inv_id}/payments",
        json={"amount": "3000.00", "payment_date": str(date.today()), "method": "CASH"},
        headers=headers,
    )

    # 1. List invoice payments
    inv_payments_res = client.get(f"/api/v1/invoices/{inv_id}/payments", headers=headers)
    assert inv_payments_res.status_code == 200
    assert len(inv_payments_res.json()) == 2

    # 2. List all business payments
    all_res = client.get("/api/v1/payments", headers=headers)
    assert all_res.status_code == 200
    assert len(all_res.json()) >= 2

    # 3. Filter by method
    upi_res = client.get("/api/v1/payments?method=UPI", headers=headers)
    assert upi_res.status_code == 200
    assert all(p["method"] == "UPI" for p in upi_res.json())


def test_payment_tenant_isolation(client, setup_invoice_for_payment):
    """Ensure another registered business cannot record or view payments on this invoice."""
    invoice = setup_invoice_for_payment["invoice"]
    inv_id = invoice["id"]

    # Register rival business
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
            "name": f"Rival Co {suffix}",
            "owner_name": "Rival",
            "phone": "+91 90000 00000",
            "email": f"rival_{suffix}@other.com",
            "address": "Mumbai",
        },
        headers=headers2,
    )

    # Rival cannot record payment on target invoice
    record_res = client.post(
        f"/api/v1/invoices/{inv_id}/payments",
        json={"amount": "1000.00", "payment_date": str(date.today()), "method": "UPI"},
        headers=headers2,
    )
    assert record_res.status_code == 404

    # Rival cannot see payments on target invoice
    view_res = client.get(f"/api/v1/invoices/{inv_id}/payments", headers=headers2)
    assert view_res.status_code == 404
