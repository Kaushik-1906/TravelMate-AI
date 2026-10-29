from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status

from app.core.auth import AuthenticatedUser, get_current_user
from app.schemas.trip import SaveTripRequest, TripResponse, TripUpdateRequest
from app.services.itinerary_service import ItineraryService

router = APIRouter(prefix="/trips", tags=["Trips"])


@router.get("", response_model=List[TripResponse])
async def get_my_trips(
    search: Optional[str] = Query(None, max_length=100, description="Search trips by destination or title"),
    sort_by: Optional[str] = Query("created_at", pattern="^(created_at|start_date)$"),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Retrieves all trips belonging to the authenticated user with search and sorting."""
    trips = await ItineraryService.list_trips(user.id, user.access_token)

    if search:
        query = search.strip().lower()
        trips = [
            trip for trip in trips
            if query in (trip.destination or "").lower() or query in (trip.title or "").lower()
        ]

    if sort_by == "start_date":
        trips.sort(key=lambda trip: trip.start_date)
    else:
        trips.sort(key=lambda trip: trip.created_at, reverse=True)

    return trips


@router.post("", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
async def save_trip(
    request: SaveTripRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Saves a trip for the authenticated user, generating an itinerary if none is supplied."""
    return await ItineraryService.create_trip(
        user_id=user.id,
        req=request,
        itinerary=request.itinerary_override,
        access_token=user.access_token,
    )


@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip_details(
    trip_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Retrieves a single trip and verifies user ownership."""
    return await ItineraryService.get_trip(
        trip_id=trip_id, user_id=user.id, access_token=user.access_token
    )


@router.put("/{trip_id}", response_model=TripResponse)
async def update_trip_details(
    trip_id: str,
    update_data: TripUpdateRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Updates a trip's title, itinerary activities, status, or budget."""
    return await ItineraryService.update_trip(
        trip_id=trip_id,
        user_id=user.id,
        update_data=update_data,
        access_token=user.access_token,
    )


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip(
    trip_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Deletes a trip after enforcing ownership."""
    await ItineraryService.delete_trip(
        trip_id=trip_id, user_id=user.id, access_token=user.access_token
    )
    return None


@router.post("/{trip_id}/duplicate", response_model=TripResponse)
async def duplicate_trip(
    trip_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Duplicates an existing trip as a new starting plan."""
    return await ItineraryService.duplicate_trip(
        trip_id=trip_id, user_id=user.id, access_token=user.access_token
    )
