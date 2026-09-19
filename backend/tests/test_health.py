def test_health_check_returns_ok(client):
    """Verify that GET /health returns status: ok as specified in Phase 4."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_root_endpoint_metadata(client):
    """Verify that GET / returns application metadata and docs URL."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "SmartQuote API"
    assert data["docs_url"] == "/docs"
    assert data["api_v1"] == "/api/v1"
