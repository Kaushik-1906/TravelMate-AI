from datetime import date
import asyncio
import pytest
from app.schemas.trip import TripCreateRequest, TripUpdateRequest
from app.services.itinerary_service import ItineraryService
from app.core.exceptions import ResourceNotFoundException, ForbiddenOperationException


def test_demo_itinerary_generation():
    req = TripCreateRequest(
        destination="Rome, Italy",
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 3),
        budget=1500.0,
        currency="EUR",
        travelers_count=2,
        travel_style="balanced",
        interests=["culture", "food", "history"],
        daily_pace="balanced"
    )

    itinerary = asyncio.run(ItineraryService.generate_new_itinerary(req))
    assert itinerary.destination == "Rome, Italy"
    assert len(itinerary.days) == 3
    assert itinerary.currency == "EUR"
    assert itinerary.days[0].day_number == 1
    assert len(itinerary.days[0].activities) >= 3
    assert itinerary.is_demo is True


def test_trip_crud_and_ownership():
    user_a = "user_alpha"
    user_b = "user_beta"

    req = TripCreateRequest(
        destination="Tokyo, Japan",
        start_date=date(2026, 12, 10),
        end_date=date(2026, 12, 12),
        budget=2000.0,
        currency="USD",
        travelers_count=1,
        travel_style="balanced",
        interests=["food", "technology"]
    )

    # 1. Create Trip for user_a
    trip = asyncio.run(ItineraryService.create_trip(user_a, req))
    assert trip.user_id == user_a
    assert trip.destination == "Tokyo, Japan"

    # 2. Get Trip by owner
    fetched = asyncio.run(ItineraryService.get_trip(trip.id, user_a))
    assert fetched.id == trip.id

    # 3. Deny access to user_b
    with pytest.raises(ForbiddenOperationException):
        asyncio.run(ItineraryService.get_trip(trip.id, user_b))

    # 4. Update Trip
    updated = asyncio.run(ItineraryService.update_trip(
        trip.id, user_a, TripUpdateRequest(title="Upgraded Tokyo Trip")
    ))
    assert updated.title == "Upgraded Tokyo Trip"

    # 5. Duplicate Trip
    dup = asyncio.run(ItineraryService.duplicate_trip(trip.id, user_a))
    assert dup.id != trip.id
    assert "Copy of" in dup.title

    # 6. Delete Trip
    deleted = asyncio.run(ItineraryService.delete_trip(trip.id, user_a))
    assert deleted is True

    # 7. Check deleted
    with pytest.raises(ResourceNotFoundException):
        asyncio.run(ItineraryService.get_trip(trip.id, user_a))


def test_regenerate_single_day_preserves_other_days():
    user_id = "user_test_days"
    req = TripCreateRequest(
        destination="Barcelona, Spain",
        start_date=date(2026, 11, 10),
        end_date=date(2026, 11, 12),
        budget=1200.0,
        currency="EUR"
    )

    trip = asyncio.run(ItineraryService.create_trip(user_id, req))
    orig_day_1_title = trip.itinerary["days"][0]["title"]

    # Regenerate only Day 2 with specific instructions
    updated_trip = asyncio.run(ItineraryService.regenerate_single_day(
        trip_id=trip.id,
        day_number=2,
        user_id=user_id,
        additional_notes="Focus on Gaudi Architecture"
    ))

    # Day 1 must be unchanged
    assert updated_trip.itinerary["days"][0]["title"] == orig_day_1_title
    # Day 2 should reflect the update
    assert "Gaudi" in updated_trip.itinerary["days"][1]["title"] or len(updated_trip.itinerary["days"][1]["activities"]) > 0
