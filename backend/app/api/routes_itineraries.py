from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, Path, Query

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.rate_limit import rate_limit
from app.schemas.itinerary import DayPlan, Itinerary
from app.schemas.trip import RegenerateDayRequest, TripCreateRequest, TripResponse
from app.services.ai_service import AIService
from app.services.itinerary_service import ItineraryService

router = APIRouter(prefix="/itineraries", tags=["Itineraries"])


@router.post("/generate", response_model=Itinerary, dependencies=[Depends(rate_limit("generate"))])
async def generate_itinerary(request: TripCreateRequest):
    """
    Generates a personalized itinerary according to destination, dates, budget,
    and preferences. Available to visitors in preview mode; saving requires auth.
    """
    return await ItineraryService.generate_new_itinerary(request)


@router.post("/{trip_id}/regenerate", response_model=TripResponse)
async def regenerate_full_trip(
    trip_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Regenerates the complete itinerary for an existing saved trip."""
    return await ItineraryService.regenerate_entire_trip(
        trip_id=trip_id,
        user_id=user.id,
        access_token=user.access_token,
    )


# NOTE: the static /preview/... route must be declared BEFORE the dynamic
# /{trip_id}/days/... route, otherwise FastAPI would match "preview" as a trip id.
@router.post(
    "/preview/days/{day_number}/regenerate",
    response_model=DayPlan,
    dependencies=[Depends(rate_limit("preview_day"))],
)
async def regenerate_preview_day(
    day_number: int = Path(ge=1, le=31),
    trip_context: Dict[str, Any] = Body(...),
    additional_notes: Optional[str] = Query(None, max_length=500),
):
    """
    Allows regenerating a single day while still in the preview builder,
    before the itinerary is saved.
    """
    return await AIService.regenerate_single_day(
        trip_context=trip_context,
        day_number=day_number,
        additional_notes=additional_notes,
    )


@router.post("/{trip_id}/days/{day_number}/regenerate", response_model=TripResponse)
async def regenerate_trip_day(
    trip_id: str,
    day_number: int = Path(ge=1, le=31),
    body: Optional[RegenerateDayRequest] = None,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Regenerates only a specific day of a saved trip without touching other days."""
    additional_notes = body.additional_notes if body else None
    return await ItineraryService.regenerate_single_day(
        trip_id=trip_id,
        day_number=day_number,
        user_id=user.id,
        additional_notes=additional_notes,
        access_token=user.access_token,
    )
