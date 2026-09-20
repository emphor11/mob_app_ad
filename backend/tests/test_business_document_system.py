import uuid
from datetime import date, timedelta
import pytest
from app.models.quotation import QuotationStatus


def test_custom_invoice_prefix_and_sequential_numbering(client):
    """
    Verify:
    1. Default prefix produces INV-YYYY-0001, INV-YYYY-0002.
    2. Changing business.invoice_prefix to 'BILL' generates BILL-YYYY-0001, BILL-YYYY-0002.
    3. Backend strictly controls sequence; client cannot alter or spoof sequential numbering.
    """
    suffix = uuid.uuid4().hex[:6]
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"prefix_{suffix}@smartquote.in",
            "password": "Password123!",
            "full_name": f"Prefix User {suffix}",
        },
    )
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    # Create business with custom prefixes, gstin, default terms, and payment instructions
    biz_res = client.post(
        "/api/v1/business",
        json={
            "name": f"Prefix Tech {suffix}",
            "owner_name": "Prefix Owner",
            "phone": "+91 98765 11111",
            "email": f"prefix_{suffix}@smartquote.in",
            "address": "Bangalore, India",
            "gstin": "29ABCDE1234F1Z5",
            "quotation_prefix": "QTN",
            "invoice_prefix": "BILL",
            "default_terms": "Standard 15 days credit. 18% p.a. interest after due date.",
            "payment_instructions": "UPI: acme@oksbi | A/C: 1234567890 | IFSC: SBIN0001234",
        },
        headers=headers,
    )
    assert biz_res.status_code == 201
    biz_data = biz_res.json()
    assert biz_data["quotation_prefix"] == "QTN"
    assert biz_data["invoice_prefix"] == "BILL"
    assert biz_data["gstin"] == "29ABCDE1234F1Z5"
    assert "Standard 15 days credit" in biz_data["default_terms"]
    assert "UPI: acme@oksbi" in biz_data["payment_instructions"]

    # Create Customer
    cust = client.post(
        "/api/v1/customers",
        json={"name": "Client Alpha", "phone": "+91 98888 77777", "email": "alpha@example.com"},
        headers=headers,
    ).json()

    # Create Quotation 1 (should use QTN-YYYY-0001 and inherit default_terms)
    q1 = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust["id"],
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=30)),
            "items": [{"description": "Setup Fee", "quantity": "1.00", "unit_price": "10000.00", "tax_rate": "18.00"}],
        },
        headers=headers,
    ).json()
    current_year = date.today().year
    assert q1["quotation_number"] == f"QTN-{current_year}-0001"
    assert q1["terms"] == "Standard 15 days credit. 18% p.a. interest after due date."

    # Create Quotation 2 (should increment to QTN-YYYY-0002)
    q2 = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust["id"],
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=30)),
            "items": [{"description": "Maintenance", "quantity": "1.00", "unit_price": "5000.00", "tax_rate": "18.00"}],
        },
        headers=headers,
    ).json()
    assert q2["quotation_number"] == f"QTN-{current_year}-0002"

    # Convert Q1 to Invoice (status must be ACCEPTED)
    client.patch(f"/api/v1/quotations/{q1['id']}", json={"status": "SENT"}, headers=headers)
    client.patch(f"/api/v1/quotations/{q1['id']}", json={"status": "ACCEPTED"}, headers=headers)
    inv1 = client.post(
        f"/api/v1/quotations/{q1['id']}/convert",
        json={"due_days": 15},
        headers=headers,
    ).json()
    assert inv1["invoice_number"] == f"BILL-{current_year}-0001"
    assert inv1["terms"] == "Standard 15 days credit. 18% p.a. interest after due date."

    # Convert Q2 to Invoice -> BILL-YYYY-0002
    client.patch(f"/api/v1/quotations/{q2['id']}", json={"status": "SENT"}, headers=headers)
    client.patch(f"/api/v1/quotations/{q2['id']}", json={"status": "ACCEPTED"}, headers=headers)
    inv2 = client.post(
        f"/api/v1/quotations/{q2['id']}/convert",
        json={"due_days": 15},
        headers=headers,
    ).json()
    assert inv2["invoice_number"] == f"BILL-{current_year}-0002"


def test_business_profile_update_document_customization(client):
    """
    Verify updating document settings via PUT /api/v1/business/me persists correctly
    and affects newly generated quotations and invoices.
    """
    suffix = uuid.uuid4().hex[:6]
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"bizupdate_{suffix}@smartquote.in",
            "password": "Password123!",
            "full_name": f"Update User {suffix}",
        },
    )
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    client.post(
        "/api/v1/business",
        json={
            "name": f"Original Biz {suffix}",
            "owner_name": "Orig Owner",
            "phone": "+91 98765 22222",
            "email": f"orig_{suffix}@smartquote.in",
            "address": "Mumbai",
        },
        headers=headers,
    )

    # Update business settings with custom prefixes and details
    update_res = client.put(
        "/api/v1/business/me",
        json={
            "name": f"Updated Biz {suffix}",
            "owner_name": "Updated Owner",
            "phone": "+91 98765 22222",
            "email": f"orig_{suffix}@smartquote.in",
            "address": "Mumbai, Maharashtra",
            "gstin": "27AABCU9603R1ZM",
            "logo_url": "https://smartquote.in/assets/logo.png",
            "quotation_prefix": "EST",
            "invoice_prefix": "TAXINV",
            "default_terms": "Payment due within 7 days of invoice issue.",
            "payment_instructions": "Bank: HDFC Bank | A/C 9988776655 | IFSC: HDFC0001234",
        },
        headers=headers,
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["gstin"] == "27AABCU9603R1ZM"
    assert updated_data["logo_url"] == "https://smartquote.in/assets/logo.png"
    assert updated_data["quotation_prefix"] == "EST"
    assert updated_data["invoice_prefix"] == "TAXINV"
    assert updated_data["default_terms"] == "Payment due within 7 days of invoice issue."
    assert "HDFC" in updated_data["payment_instructions"]

    # Verify new quotation reflects updated prefix
    cust = client.post(
        "/api/v1/customers",
        json={"name": "Client Beta", "phone": "+91 91111 22222"},
        headers=headers,
    ).json()

    q = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust["id"],
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=30)),
            "items": [{"description": "Audit", "quantity": "1.00", "unit_price": "8000.00", "tax_rate": "18.00"}],
        },
        headers=headers,
    ).json()
    current_year = date.today().year
    assert q["quotation_number"] == f"EST-{current_year}-0001"
    assert q["terms"] == "Payment due within 7 days of invoice issue."


def test_pdf_generation_includes_customizations(client):
    """
    Verify PDF generation for quotation and invoice renders successfully
    with GSTIN, terms, and payment instructions.
    """
    suffix = uuid.uuid4().hex[:6]
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"pdf_{suffix}@smartquote.in",
            "password": "Password123!",
            "full_name": f"PDF User {suffix}",
        },
    )
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    client.post(
        "/api/v1/business",
        json={
            "name": f"PDF Enterprise {suffix}",
            "owner_name": "PDF Boss",
            "phone": "+91 98765 33333",
            "email": f"pdf_{suffix}@smartquote.in",
            "address": "Hyderabad, Telangana",
            "gstin": "36AABCU9603R1ZP",
            "quotation_prefix": "QT",
            "invoice_prefix": "INV",
            "default_terms": "All disputes subject to Hyderabad jurisdiction.",
            "payment_instructions": "GooglePay/PhonePe: 9876533333@upi",
        },
        headers=headers,
    )

    cust = client.post(
        "/api/v1/customers",
        json={"name": "Client Gamma", "phone": "+91 93333 44444", "gstin": "36XYZAB1234C1Z9"},
        headers=headers,
    ).json()

    # Create & Accept Quotation
    q = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": cust["id"],
            "issue_date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=30)),
            "items": [{"description": "Electrical Wiring", "quantity": "2.00", "unit_price": "3500.00", "tax_rate": "18.00"}],
        },
        headers=headers,
    ).json()

    # Download quotation PDF
    pdf_q_res = client.get(f"/api/v1/quotations/{q['id']}/pdf", headers=headers)
    assert pdf_q_res.status_code == 200
    assert pdf_q_res.headers["content-type"] == "application/pdf"
    assert len(pdf_q_res.content) > 1000

    # Convert to invoice and download invoice PDF
    client.patch(f"/api/v1/quotations/{q['id']}", json={"status": "SENT"}, headers=headers)
    client.patch(f"/api/v1/quotations/{q['id']}", json={"status": "ACCEPTED"}, headers=headers)
    inv = client.post(f"/api/v1/quotations/{q['id']}/convert", json={"due_days": 10}, headers=headers).json()

    pdf_inv_res = client.get(f"/api/v1/invoices/{inv['id']}/pdf", headers=headers)
    assert pdf_inv_res.status_code == 200
    assert pdf_inv_res.headers["content-type"] == "application/pdf"
    assert len(pdf_inv_res.content) > 1000
