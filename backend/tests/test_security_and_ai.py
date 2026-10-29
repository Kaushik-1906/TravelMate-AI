import asyncio
import json
from datetime import date

import httpx
import pytest

from app.config import settings
from app.core.auth import demo_mode_enabled
from app.core.exceptions import AIGenerationException
from app.main import app
from app.schemas.trip import TripCreateRequest, TripUpdateRequest
from app.services.ai_service import AIService
from app.services.itinerary_service import ItineraryService


def _valid_live_payload() -> dict:
    return {
        "trip_title": "Two Days in Lisbon",
        "destination": "Lisbon, Portugal",
        "overview": "A compact, food-focused plan.",
        "currency": "USD",
        "estimated_total_cost": 1000,
        "daily_budget_recommendation": 500,
        "budget_breakdown": {
            "accommodation": 500,
            "food": 200,
            "transportation": 100,
            "activities": 0,
            "miscellaneous": 50,
            "total_estimated": 850,
        },
        "travel_tips": ["Wear comfortable shoes"],
        "safety_and_etiquette": ["Keep valuables secure"],
        "transportation_tips": ["Buy a transit card"],
        "accommodation_recommendations": [
            {"name": "Central Stay", "type": "Boutique Hotel", "area": "Baixa", "estimated_nightly": 200}
        ],
        "days": [
            {
                "day_number": 9,
                "date": "2000-01-01",
                "title": "Old Town",
                "activities": [
                    {
                        "time": "09:00 AM",
                        "period": "Morning",
                        "name": "Alfama walk",
                        "description": "Explore the old streets.",
                        "category": "Sightseeing",
                        "estimated_duration_minutes": 90,
                        "estimated_cost": 25,
                    }
                ],
            },
            {
                "day_number": 8,
                "date": "2000-01-02",
                "title": "Riverfront",
                "activities": [
                    {
                        "time": "10:00 AM",
                        "period": "Morning",
                        "name": "River market",
                        "description": "Sample local food.",
                        "category": "Food & Dining",
                        "estimated_duration_minutes": 60,
                        "estimated_cost": 25,
                    }
                ],
            },
        ],
    }


def test_ai_retries_once_and_normalizes_days(monkeypatch):
    attempts = {"count": 0}

    async def fake_provider(_prompt: str) -> str:
        attempts["count"] += 1
        if attempts["count"] == 1:
            return "I cannot produce JSON today."
        return json.dumps(_valid_live_payload())

    monkeypatch.setattr(AIService, "_call_provider_raw", fake_provider)

    req = TripCreateRequest(
        destination="Lisbon, Portugal",
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 2),
        budget=1000,
        currency="USD",
        travelers_count=2,
        interests=["food", "culture"],
    )
    duration = 2
    from app.services.budget_service import BudgetService

    breakdown = BudgetService.calculate_budget_breakdown(1000, "balanced", duration)
    itinerary = asyncio.run(
        AIService._generate_live_itinerary(req, duration, breakdown)
    )

    assert attempts["count"] == 2
    assert itinerary.is_demo is False
    assert [day.day_number for day in itinerary.days] == [1, 2]
    assert [day.date for day in itinerary.days] == ["2026-11-01", "2026-11-02"]
    assert itinerary.days[0].activities[0].id == "act_d1_1"
    # Activity totals are recalculated to stay consistent with the breakdown.
    assert itinerary.estimated_total_cost == 900.0
    assert itinerary.daily_budget_recommendation == 450.0


def test_live_generation_raises_after_limited_attempts(monkeypatch):
    attempts = {"count": 0}

    async def fake_provider(_prompt: str) -> str:
        attempts["count"] += 1
        return "not json"

    monkeypatch.setattr(AIService, "_call_provider_raw", fake_provider)
    req = TripCreateRequest(
        destination="Oslo, Norway",
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 2),
        budget=800,
        currency="EUR",
    )
    from app.services.budget_service import BudgetService

    breakdown = BudgetService.calculate_budget_breakdown(800, "balanced", 2)
    with pytest.raises(AIGenerationException):
        asyncio.run(AIService._generate_live_itinerary(req, 2, breakdown))
    assert attempts["count"] == 2


def test_demo_mode_disabled_in_production(monkeypatch):
    monkeypatch.setattr(settings, "APP_ENV", "production")
    monkeypatch.setattr(settings, "SUPABASE_URL", None)
    monkeypatch.setattr(settings, "SUPABASE_ANON_KEY", None)
    assert demo_mode_enabled() is False


def test_preview_day_regeneration_route_is_not_shadowed():
    async def _run():
        payload = {
            "destination": "Porto, Portugal",
            "currency": "EUR",
            "travel_style": "balanced",
            "interests": ["food", "culture"],
            "preferences": {"daily_pace": "balanced"},
            "days": [
                {"day_number": 1, "date": "2026-11-01", "title": "Day 1", "activities": []},
                {"day_number": 2, "date": "2026-11-02", "title": "Day 2", "activities": []},
            ],
        }
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/itineraries/preview/days/2/regenerate", json=payload)
            assert res.status_code == 200, res.text
            data = res.json()
            assert data["day_number"] == 2
            assert data["date"] == "2026-11-02"
            assert data["is_demo"] is True
            assert len(data["activities"]) >= 3

    asyncio.run(_run())


@pytest.mark.parametrize(
    "overrides",
    [
        {"currency": "US"},
        {"travel_style": "extreme"},
        {"daily_pace": "frantic"},
        {"travelers_count": 0},
        {"budget": -5},
    ],
)
def test_generate_rejects_invalid_input(overrides):
    def _run():
        payload = {
            "destination": "Berlin, Germany",
            "start_date": "2026-11-05",
            "end_date": "2026-11-07",
            "budget": 900,
            "currency": "EUR",
            **overrides,
        }

        async def _call():
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
                return await client.post("/api/itineraries/generate", json=payload)

        return asyncio.run(_call())

    res = _run()
    assert res.status_code == 422


def test_update_recalculates_and_rejects_invalid_itinerary():
    user_id = "user_budget_update"
    req = TripCreateRequest(
        destination="Dublin, Ireland",
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 2),
        budget=800,
        currency="EUR",
    )
    trip = asyncio.run(ItineraryService.create_trip(user_id, req))
    itinerary = json.loads(json.dumps(trip.itinerary))
    itinerary["days"][0]["activities"][0]["estimated_cost"] = 123

    updated = asyncio.run(
        ItineraryService.update_trip(
            trip.id,
            user_id,
            TripUpdateRequest(itinerary=itinerary),
        )
    )
    assert updated.itinerary["days"][0]["activities"][0]["estimated_cost"] == 123
    assert updated.itinerary["budget_breakdown"]["activities"] == sum(
        a.get("estimated_cost", 0)
        for day in updated.itinerary["days"]
        for a in day["activities"]
    )
    assert updated.estimated_total_cost == updated.itinerary["budget_breakdown"]["total_estimated"]

    with pytest.raises(Exception):
        asyncio.run(
            ItineraryService.update_trip(
                trip.id,
                user_id,
                TripUpdateRequest(itinerary={"days": "not-a-list"}),
            )
        )
