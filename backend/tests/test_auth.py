import uuid
import pytest


@pytest.fixture
def unique_user_payload():
    unique_suffix = uuid.uuid4().hex[:8]
    return {
        "email": f"electrician_{unique_suffix}@smartquote.in",
        "password": "SecurePassword123!",
        "full_name": "Ramesh Kumar Electricals",
    }


def test_register_new_user(client, unique_user_payload):
    """Verify user registration returns 201 with JWT tokens and user details."""
    response = client.post("/api/v1/auth/register", json=unique_user_payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == unique_user_payload["email"]
    assert data["user"]["full_name"] == unique_user_payload["full_name"]
    assert data["user"]["is_active"] is True


def test_register_duplicate_email_fails(client, unique_user_payload):
    """Verify registering an existing email returns 400 Bad Request."""
    # First registration
    client.post("/api/v1/auth/register", json=unique_user_payload)
    # Duplicate registration
    response = client.post("/api/v1/auth/register", json=unique_user_payload)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"].lower()


def test_login_successful(client, unique_user_payload):
    """Verify authenticating with correct credentials returns JWT tokens."""
    # Register first
    client.post("/api/v1/auth/register", json=unique_user_payload)

    # Login
    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": unique_user_payload["email"],
            "password": unique_user_payload["password"],
        },
    )
    assert login_response.status_code == 200
    data = login_response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == unique_user_payload["email"]


def test_login_wrong_password_fails(client, unique_user_payload):
    """Verify authenticating with an invalid password returns 401 Unauthorized."""
    client.post("/api/v1/auth/register", json=unique_user_payload)

    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": unique_user_payload["email"],
            "password": "WrongPasswordXYZ",
        },
    )
    assert login_response.status_code == 401
    assert "incorrect" in login_response.json()["detail"].lower()


def test_get_current_user_me(client, unique_user_payload):
    """Verify GET /api/v1/auth/me returns current user identity with valid token."""
    reg_response = client.post("/api/v1/auth/register", json=unique_user_payload)
    access_token = reg_response.json()["access_token"]

    # Without token -> 401
    unauth_response = client.get("/api/v1/auth/me")
    assert unauth_response.status_code == 401

    # With valid Bearer token -> 200
    auth_response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert auth_response.status_code == 200
    user_data = auth_response.json()
    assert user_data["email"] == unique_user_payload["email"]
    assert user_data["full_name"] == unique_user_payload["full_name"]


def test_refresh_token(client, unique_user_payload):
    """Verify POST /api/v1/auth/refresh issues a new access token."""
    reg_response = client.post("/api/v1/auth/register", json=unique_user_payload)
    refresh_token = reg_response.json()["refresh_token"]

    refresh_response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_response.status_code == 200
    data = refresh_response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
