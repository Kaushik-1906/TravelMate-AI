import asyncio
import pytest
import httpx
from app.main import app


def test_health_endpoint():
    async def _run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/health")
            assert res.status_code == 200
            data = res.json()
            assert data["status"] == "healthy"
            assert data["service"] == "TravelMate AI Backend"
    asyncio.run(_run())


def test_generate_itinerary_endpoint():
    async def _run():
        payload = {
            "destination": "Paris, France",
            "start_date": "2026-11-05",
            "end_date": "2026-11-07",
            "budget": 1200,
            "currency": "EUR",
            "travelers_count": 2,
            "travel_style": "balanced",
            "interests": ["culture", "food"],
            "daily_pace": "balanced"
        }
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/itineraries/generate", json=payload)
            assert response.status_code == 200
            data = response.json()
            assert data["destination"] == "Paris, France"
            assert len(data["days"]) == 3
            assert data["currency"] == "EUR"
            assert "budget_breakdown" in data
    asyncio.run(_run())


def test_date_validation_rejects_past_or_inverted_dates():
    async def _run():
        payload = {
            "destination": "London, UK",
            "start_date": "2026-11-10",
            "end_date": "2026-11-05",
            "budget": 1000,
            "currency": "GBP"
        }
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/itineraries/generate", json=payload)
            assert response.status_code == 422
    asyncio.run(_run())


def test_trips_crud_api():
    async def _run():
        payload = {
            "destination": "Amsterdam, Netherlands",
            "start_date": "2026-12-01",
            "end_date": "2026-12-03",
            "budget": 900,
            "currency": "EUR"
        }
        headers = {"Authorization": "Bearer demo-token"}
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            # 1. Create trip
            create_res = await client.post("/api/trips", json=payload, headers=headers)
            assert create_res.status_code == 201
            created_trip = create_res.json()
            trip_id = created_trip["id"]

            # 2. List trips
            list_res = await client.get("/api/trips", headers=headers)
            assert list_res.status_code == 200
            trips_list = list_res.json()
            assert any(t["id"] == trip_id for t in trips_list)

            # 3. Get single trip
            get_res = await client.get(f"/api/trips/{trip_id}", headers=headers)
            assert get_res.status_code == 200
            assert get_res.json()["destination"] == "Amsterdam, Netherlands"

            # 4. Duplicate trip
            dup_res = await client.post(f"/api/trips/{trip_id}/duplicate", headers=headers)
            assert dup_res.status_code == 200
            dup_id = dup_res.json()["id"]
            assert dup_id != trip_id

            # 5. Delete trips
            del_res = await client.delete(f"/api/trips/{trip_id}", headers=headers)
            assert del_res.status_code == 204
            await client.delete(f"/api/trips/{dup_id}", headers=headers)
    asyncio.run(_run())
