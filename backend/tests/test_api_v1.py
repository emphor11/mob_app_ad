def test_api_v1_endpoints_exist(client):
    """Verify all required API v1 route groups exist and respond properly."""
    endpoints = [
        "/api/v1/auth/",
        "/api/v1/customers/",
        "/api/v1/quotations/",
        "/api/v1/invoices/",
        "/api/v1/payments/",
    ]
    for ep in endpoints:
        response = client.get(ep)
        assert response.status_code == 200, f"Endpoint {ep} failed with status {response.status_code}"
        payload = response.json()
        assert payload.get("status") == "ready"


def test_openapi_schema_generation(client):
    """Verify that OpenAPI documentation schema is generated and includes API v1 tags."""
    response = client.get("/api/v1/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert "paths" in schema
    assert "/health" in schema["paths"]
    assert "/api/v1/customers/" in schema["paths"]
    assert "/api/v1/quotations/" in schema["paths"]
    assert "/api/v1/invoices/" in schema["paths"]
    assert "/api/v1/payments/" in schema["paths"]
