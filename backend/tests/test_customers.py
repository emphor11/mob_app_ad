import uuid
import pytest


@pytest.fixture
def business_setup(client):
    """Register user, create business, and return authorization headers with business details."""
    suffix = uuid.uuid4().hex[:6]
    user_payload = {
        "email": f"electrician_{suffix}@smartquote.in",
        "password": "Password123!",
        "full_name": f"Electrician {suffix}",
    }
    reg = client.post("/api/v1/auth/register", json=user_payload)
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    biz_payload = {
        "name": f"Apex Electricals {suffix}",
        "owner_name": user_payload["full_name"],
        "phone": "+91 98765 00000",
        "email": user_payload["email"],
        "address": "Okhla Industrial Area, New Delhi",
    }
    biz_res = client.post("/api/v1/business", json=biz_payload, headers=headers)
    assert biz_res.status_code == 201
    return headers, biz_res.json()


def test_customer_crud_flow(client, business_setup):
    """Test full customer lifecycle: create, list, get by id, patch, and delete."""
    headers, business = business_setup

    # 1. Initially empty customer list
    res = client.get("/api/v1/customers", headers=headers)
    assert res.status_code == 200
    assert res.json() == []

    # 2. Create customer
    customer_payload = {
        "name": "Raj Traders & Hardware",
        "phone": "+91 98111 22334",
        "email": "raj@rajtraders.in",
        "address": "Shop 14, Main Market, Rohini Sector 7, Delhi",
        "gstin": "07BBBBB1111B1Z2",
        "notes": "Bulk purchaser of commercial PVC conduit pipes.",
    }
    create_res = client.post("/api/v1/customers", json=customer_payload, headers=headers)
    assert create_res.status_code == 201
    created_cust = create_res.json()
    assert created_cust["name"] == customer_payload["name"]
    assert created_cust["phone"] == customer_payload["phone"]
    assert created_cust["email"] == customer_payload["email"]
    assert created_cust["address"] == customer_payload["address"]
    assert created_cust["gstin"] == customer_payload["gstin"]
    assert created_cust["notes"] == customer_payload["notes"]
    assert created_cust["business_id"] == business["id"]
    assert "id" in created_cust
    customer_id = created_cust["id"]

    # 3. Retrieve single customer by ID
    get_res = client.get(f"/api/v1/customers/{customer_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["name"] == customer_payload["name"]

    # 4. List customers returns the customer
    list_res = client.get("/api/v1/customers", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
    assert list_res.json()[0]["id"] == customer_id

    # 5. Patch customer details
    patch_payload = {
        "name": "Raj Traders & Electrical Supplies Pvt Ltd",
        "phone": "+91 98111 99999",
        "notes": "Prefers invoices sent via WhatsApp.",
    }
    patch_res = client.patch(f"/api/v1/customers/{customer_id}", json=patch_payload, headers=headers)
    assert patch_res.status_code == 200
    updated_cust = patch_res.json()
    assert updated_cust["name"] == patch_payload["name"]
    assert updated_cust["phone"] == patch_payload["phone"]
    assert updated_cust["notes"] == patch_payload["notes"]
    # Unchanged fields remain intact
    assert updated_cust["email"] == customer_payload["email"]
    assert updated_cust["address"] == customer_payload["address"]

    # 6. Delete customer
    del_res = client.delete(f"/api/v1/customers/{customer_id}", headers=headers)
    assert del_res.status_code == 204

    # 7. Customer is now 404
    get_del = client.get(f"/api/v1/customers/{customer_id}", headers=headers)
    assert get_del.status_code == 404


def test_customer_search(client, business_setup):
    """Test searching customers by name, phone, or email."""
    headers, _ = business_setup

    client.post("/api/v1/customers", json={"name": "Kishan Builders", "phone": "+91 98000 11111", "email": "kishan@builders.com"}, headers=headers)
    client.post("/api/v1/customers", json={"name": "Metro Heights Ltd", "phone": "+91 98000 22222", "email": "metro@heights.com"}, headers=headers)
    client.post("/api/v1/customers", json={"name": "Sharma Residence", "phone": "+91 99999 33333", "email": "sharma@gmail.com"}, headers=headers)

    # Search by name
    res = client.get("/api/v1/customers?search=kishan", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["name"] == "Kishan Builders"

    # Search by phone
    res_phone = client.get("/api/v1/customers?search=33333", headers=headers)
    assert res_phone.status_code == 200
    assert len(res_phone.json()) == 1
    assert res_phone.json()[0]["name"] == "Sharma Residence"

    # Search by email
    res_email = client.get("/api/v1/customers?search=heights.com", headers=headers)
    assert res_email.status_code == 200
    assert len(res_email.json()) == 1
    assert res_email.json()[0]["name"] == "Metro Heights Ltd"


def test_customer_tenant_isolation(client):
    """
    CRITICAL RULE 2: Customers are strictly isolated between businesses.
    Business B CANNOT view, modify, or delete Business A's customer.
    """
    # 1. Setup Business A
    user_a = {"email": f"biz_a_{uuid.uuid4().hex[:6]}@smartquote.in", "password": "Password123!", "full_name": "Owner A"}
    reg_a = client.post("/api/v1/auth/register", json=user_a)
    token_a = reg_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    biz_a_res = client.post("/api/v1/business", json={"name": "Biz A", "owner_name": "Owner A", "phone": "+91 99999 11111", "email": user_a["email"], "address": "Loc A Street"}, headers=headers_a)
    assert biz_a_res.status_code == 201

    # Business A creates Customer A
    cust_a_res = client.post("/api/v1/customers", json={"name": "Client of A", "phone": "1234567890"}, headers=headers_a)
    assert cust_a_res.status_code == 201
    cust_a_id = cust_a_res.json()["id"]

    # 2. Setup Business B
    user_b = {"email": f"biz_b_{uuid.uuid4().hex[:6]}@smartquote.in", "password": "Password123!", "full_name": "Owner B"}
    reg_b = client.post("/api/v1/auth/register", json=user_b)
    token_b = reg_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    biz_b_res = client.post("/api/v1/business", json={"name": "Biz B", "owner_name": "Owner B", "phone": "+91 99999 22222", "email": user_b["email"], "address": "Loc B Street"}, headers=headers_b)
    assert biz_b_res.status_code == 201


    # 3. Business B listing customers should NOT see Customer A
    list_b = client.get("/api/v1/customers", headers=headers_b)
    assert list_b.status_code == 200
    assert len(list_b.json()) == 0

    # 4. Business B fetching Customer A by ID should return 404
    get_a_by_b = client.get(f"/api/v1/customers/{cust_a_id}", headers=headers_b)
    assert get_a_by_b.status_code == 404

    # 5. Business B trying to patch Customer A should return 404
    patch_a_by_b = client.patch(f"/api/v1/customers/{cust_a_id}", json={"name": "Hacked Client"}, headers=headers_b)
    assert patch_a_by_b.status_code == 404

    # 6. Business B trying to delete Customer A should return 404
    del_a_by_b = client.delete(f"/api/v1/customers/{cust_a_id}", headers=headers_b)
    assert del_a_by_b.status_code == 404

    # 7. Customer A is still intact in Business A
    get_a_by_a = client.get(f"/api/v1/customers/{cust_a_id}", headers=headers_a)
    assert get_a_by_a.status_code == 200
    assert get_a_by_a.json()["name"] == "Client of A"


def test_customer_access_without_business_profile_fails(client):
    """User without a business profile cannot manage customers."""
    user = {"email": f"nobiz_{uuid.uuid4().hex[:6]}@smartquote.in", "password": "Password123!", "full_name": "No Biz User"}
    reg = client.post("/api/v1/auth/register", json=user)
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to list customers without business profile
    res = client.get("/api/v1/customers", headers=headers)
    assert res.status_code == 400
    assert "business profile required" in res.json()["detail"].lower()
