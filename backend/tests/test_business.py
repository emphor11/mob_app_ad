import uuid
import pytest


@pytest.fixture
def auth_headers(client):
    """Register and log in a fresh user, returning authorization bearer headers."""
    unique_suffix = uuid.uuid4().hex[:8]
    user_payload = {
        "email": f"contractor_{unique_suffix}@smartquote.in",
        "password": "Password123!",
        "full_name": "Suresh Electrical Contractor",
    }
    register_res = client.post("/api/v1/auth/register", json=user_payload)
    assert register_res.status_code == 201
    token = register_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}, user_payload


def test_get_business_profile_not_found(client, auth_headers):
    """Before creating a profile, GET /api/v1/business/me should return 404."""
    headers, _ = auth_headers
    res = client.get("/api/v1/business/me", headers=headers)
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_create_business_profile(client, auth_headers):
    """User can create their business profile with trade details."""
    headers, user_payload = auth_headers
    biz_payload = {
        "name": "Suresh Power & Hardware Works",
        "owner_name": user_payload["full_name"],
        "phone": "+91 98765 01234",
        "email": user_payload["email"],
        "address": "Shop 12, Industrial Area, Sector 5, Gurugram, Haryana",
        "gstin": "06AAAAA1234A1Z5",
        "logo_url": "https://example.com/logo.png",
        "currency": "₹",
    }

    res = client.post("/api/v1/business", json=biz_payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == biz_payload["name"]
    assert data["owner_name"] == biz_payload["owner_name"]
    assert data["phone"] == biz_payload["phone"]
    assert data["email"] == biz_payload["email"]
    assert data["address"] == biz_payload["address"]
    assert data["gstin"] == biz_payload["gstin"]
    assert data["logo_url"] == biz_payload["logo_url"]
    assert data["currency"] == "₹"
    assert data["is_default"] is True
    assert "id" in data
    assert "user_id" in data


def test_create_duplicate_business_fails(client, auth_headers):
    """Currently 1 user -> 1 business is enforced on create."""
    headers, user_payload = auth_headers
    biz_payload = {
        "name": "Initial Business",
        "owner_name": user_payload["full_name"],
        "phone": "+91 99999 11111",
        "email": user_payload["email"],
        "address": "Shop 1, Main Road",
    }
    res1 = client.post("/api/v1/business", json=biz_payload, headers=headers)
    assert res1.status_code == 201

    # Second creation attempt should fail with 400
    res2 = client.post("/api/v1/business", json=biz_payload, headers=headers)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"].lower()


def test_get_and_update_business_profile(client, auth_headers):
    """User can retrieve and update their existing business profile."""
    headers, user_payload = auth_headers
    biz_payload = {
        "name": "Verma Pipe Dealers",
        "owner_name": user_payload["full_name"],
        "phone": "+91 98888 22222",
        "email": user_payload["email"],
        "address": "Godown 4, Ring Road, Jaipur",
        "currency": "₹",
    }
    create_res = client.post("/api/v1/business", json=biz_payload, headers=headers)
    assert create_res.status_code == 201

    # Fetch with GET /me
    get_res = client.get("/api/v1/business/me", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Verma Pipe Dealers"

    # Update with PUT /me
    update_payload = {
        "name": "Verma Pipes & Sanitary Ware Pvt Ltd",
        "phone": "+91 98888 33333",
        "gstin": "08ABCDE1234F1Z9",
    }
    put_res = client.put("/api/v1/business/me", json=update_payload, headers=headers)
    assert put_res.status_code == 200
    updated_data = put_res.json()
    assert updated_data["name"] == "Verma Pipes & Sanitary Ware Pvt Ltd"
    assert updated_data["phone"] == "+91 98888 33333"
    assert updated_data["gstin"] == "08ABCDE1234F1Z9"
    # Unmodified fields remain intact
    assert updated_data["address"] == biz_payload["address"]


def test_business_tenant_isolation(client):
    """User A and User B cannot see or overwrite each other's businesses."""
    # User A
    user_a = {
        "email": f"usera_{uuid.uuid4().hex[:6]}@smartquote.in",
        "password": "Password123!",
        "full_name": "User A",
    }
    reg_a = client.post("/api/v1/auth/register", json=user_a)
    token_a = reg_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    client.post(
        "/api/v1/business",
        json={
            "name": "Business A",
            "owner_name": "Owner A",
            "phone": "+91 90000 00001",
            "email": user_a["email"],
            "address": "Location A",
        },
        headers=headers_a,
    )

    # User B
    user_b = {
        "email": f"userb_{uuid.uuid4().hex[:6]}@smartquote.in",
        "password": "Password123!",
        "full_name": "User B",
    }
    reg_b = client.post("/api/v1/auth/register", json=user_b)
    token_b = reg_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User B fetching /me should be 404 (not seeing User A's business)
    res_b = client.get("/api/v1/business/me", headers=headers_b)
    assert res_b.status_code == 404

    # User B creates Business B
    client.post(
        "/api/v1/business",
        json={
            "name": "Business B",
            "owner_name": "Owner B",
            "phone": "+91 90000 00002",
            "email": user_b["email"],
            "address": "Location B",
        },
        headers=headers_b,
    )

    # User A's /me still returns Business A
    res_a = client.get("/api/v1/business/me", headers=headers_a)
    assert res_a.status_code == 200
    assert res_a.json()["name"] == "Business A"
