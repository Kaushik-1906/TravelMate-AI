import copy
import logging
import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import ValidationError

from app.config import settings
from app.core.exceptions import (
    ForbiddenOperationException,
    ResourceNotFoundException,
    TravelMateException,
)
from app.database.supabase_client import get_user_client
from app.schemas.itinerary import Itinerary
from app.schemas.trip import TripCreateRequest, TripResponse, TripUpdateRequest
from app.services.ai_service import AIService
from app.services.budget_service import BudgetService

logger = logging.getLogger("travelmate.itineraries")

# In-memory storage used only when Supabase is not configured (local demo mode).
_MEMORY_TRIPS: Dict[str, Dict[str, Any]] = {}


class ItineraryService:
    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _db(access_token: Optional[str]):
        """
        Returns a user-scoped Supabase client, or None in local demo mode.
        Raises a clear error if Supabase is configured but a client cannot be built.
        """
        if not settings.is_supabase_configured:
            return None
        client = get_user_client(access_token)
        if client is None:
            raise TravelMateException(
                status_code=503,
                detail="The travel database is temporarily unavailable. Please try again.",
            )
        return client

    @staticmethod
    def _format_trip_record(record: Dict[str, Any]) -> TripResponse:
        """Standardizes a database or memory dict into a TripResponse model."""
        return TripResponse(
            id=str(record.get("id")),
            user_id=str(record.get("user_id")),
            title=record.get("title") or "Untitled Trip",
            destination=record.get("destination") or "",
            start_date=str(record.get("start_date")),
            end_date=str(record.get("end_date")),
            budget=float(record.get("budget") or 0.0),
            currency=record.get("currency") or "USD",
            travelers_count=int(record.get("travelers_count") or 1),
            travel_style=record.get("travel_style") or "balanced",
            interests=record.get("interests") or [],
            preferences=record.get("preferences") or {},
            itinerary=record.get("itinerary") or {},
            estimated_total_cost=float(record.get("estimated_total_cost") or 0.0),
            status=record.get("status") or "planned",
            created_at=str(record.get("created_at") or ""),
            updated_at=str(record.get("updated_at") or ""),
        )

    @staticmethod
    def _validate_itinerary(itinerary_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validates an itinerary payload and returns a normalized dictionary."""
        try:
            validated = Itinerary.model_validate(itinerary_data or {})
        except ValidationError as exc:
            first = exc.errors()[0] if exc.errors() else {}
            field = ".".join(str(part) for part in first.get("loc", [])) or "itinerary"
            raise TravelMateException(
                status_code=422,
                detail=f"Invalid itinerary data at '{field}': {first.get('msg', 'validation failed')}",
            )
        return BudgetService.recalculate_itinerary_costs(validated.model_dump())

    # ------------------------------------------------------------------
    # Generation
    # ------------------------------------------------------------------
    @classmethod
    async def generate_new_itinerary(cls, req: TripCreateRequest) -> Itinerary:
        """Generates itinerary data without persisting it."""
        return await AIService.generate_itinerary(req)

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------
    @classmethod
    async def list_trips(cls, user_id: str, access_token: Optional[str] = None) -> List[TripResponse]:
        """Retrieves all trips belonging to the authenticated user."""
        supabase = cls._db(access_token)
        if supabase is not None:
            try:
                res = (
                    supabase.table("trips")
                    .select("*")
                    .eq("user_id", user_id)
                    .order("created_at", desc=True)
                    .execute()
                )
                return [cls._format_trip_record(r) for r in (res.data or [])]
            except Exception as exc:
                logger.error("Failed to list trips: %s", exc)
                raise TravelMateException(
                    status_code=502,
                    detail="Could not load your trips. Please try again.",
                )

        user_trips = [t for t in _MEMORY_TRIPS.values() if t.get("user_id") == user_id]
        user_trips.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return [cls._format_trip_record(t) for t in user_trips]

    @classmethod
    async def create_trip(
        cls,
        user_id: str,
        req: TripCreateRequest,
        itinerary: Optional[Itinerary] = None,
        access_token: Optional[str] = None,
    ) -> TripResponse:
        """Generates (if needed) and saves a new trip for the user."""
        if itinerary is None:
            itinerary = await AIService.generate_itinerary(req)
        elif not isinstance(itinerary, Itinerary):
            try:
                itinerary = Itinerary.model_validate(itinerary)
            except ValidationError:
                raise TravelMateException(status_code=422, detail="Invalid itinerary payload.")

        trip_id = str(uuid.uuid4())
        now_iso = datetime.utcnow().isoformat()
        itinerary_dict = BudgetService.recalculate_itinerary_costs(itinerary.model_dump())

        trip_record = {
            "id": trip_id,
            "user_id": user_id,
            "title": itinerary.trip_title,
            "destination": req.destination,
            "start_date": str(req.start_date),
            "end_date": str(req.end_date),
            "budget": float(req.budget),
            "currency": req.currency,
            "travelers_count": req.travelers_count,
            "travel_style": req.travel_style,
            "interests": req.interests,
            "preferences": {
                "daily_pace": req.daily_pace,
                "accommodation_pref": req.accommodation_pref,
                "transportation_pref": req.transportation_pref,
                "dietary_pref": req.dietary_pref,
                "accessibility_req": req.accessibility_req,
                "additional_instructions": req.additional_instructions,
            },
            "itinerary": itinerary_dict,
            "estimated_total_cost": float(itinerary_dict.get("estimated_total_cost", 0.0)),
            "status": "planned",
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        supabase = cls._db(access_token)
        if supabase is not None:
            try:
                res = supabase.table("trips").insert(trip_record).execute()
                if not res.data:
                    raise TravelMateException(
                        status_code=502,
                        detail="The trip could not be saved. Please try again.",
                    )
                return cls._format_trip_record(res.data[0])
            except TravelMateException:
                raise
            except Exception as exc:
                logger.error("Failed to insert trip: %s", exc)
                raise TravelMateException(
                    status_code=502,
                    detail="The trip could not be saved. Please try again.",
                )

        _MEMORY_TRIPS[trip_id] = trip_record
        return cls._format_trip_record(trip_record)

    @classmethod
    async def get_trip(
        cls, trip_id: str, user_id: str, access_token: Optional[str] = None
    ) -> TripResponse:
        """Retrieves a single trip and enforces ownership."""
        supabase = cls._db(access_token)
        if supabase is not None:
            try:
                res = supabase.table("trips").select("*").eq("id", trip_id).execute()
            except Exception as exc:
                logger.error("Failed to fetch trip %s: %s", trip_id, exc)
                raise TravelMateException(
                    status_code=502,
                    detail="Could not load this trip. Please try again.",
                )
            if not res.data:
                raise ResourceNotFoundException("Trip", trip_id)
            record = res.data[0]
            if str(record.get("user_id")) != str(user_id):
                raise ForbiddenOperationException("Access denied: You do not own this trip.")
            return cls._format_trip_record(record)

        record = _MEMORY_TRIPS.get(trip_id)
        if not record:
            raise ResourceNotFoundException("Trip", trip_id)
        if str(record.get("user_id")) != str(user_id):
            raise ForbiddenOperationException("Access denied: You do not own this trip.")
        return cls._format_trip_record(record)

    @classmethod
    async def update_trip(
        cls,
        trip_id: str,
        user_id: str,
        update_data: TripUpdateRequest,
        access_token: Optional[str] = None,
    ) -> TripResponse:
        """Updates an existing trip with ownership validation and budget recalculation."""
        await cls.get_trip(trip_id, user_id, access_token)
        now_iso = datetime.utcnow().isoformat()
        updated_dict: Dict[str, Any] = {"updated_at": now_iso}

        if update_data.title is not None:
            updated_dict["title"] = update_data.title
        if update_data.status is not None:
            updated_dict["status"] = update_data.status
        if update_data.budget is not None:
            updated_dict["budget"] = float(update_data.budget)

        if update_data.itinerary is not None:
            recalculated = cls._validate_itinerary(update_data.itinerary)
            updated_dict["itinerary"] = recalculated
            updated_dict["estimated_total_cost"] = recalculated.get("estimated_total_cost", 0.0)
        elif update_data.estimated_total_cost is not None:
            updated_dict["estimated_total_cost"] = float(update_data.estimated_total_cost)

        supabase = cls._db(access_token)
        if supabase is not None:
            try:
                res = (
                    supabase.table("trips")
                    .update(updated_dict)
                    .eq("id", trip_id)
                    .eq("user_id", user_id)
                    .execute()
                )
            except Exception as exc:
                logger.error("Failed to update trip %s: %s", trip_id, exc)
                raise TravelMateException(
                    status_code=502,
                    detail="Changes could not be saved. Please try again.",
                )
            if not res.data:
                raise ResourceNotFoundException("Trip", trip_id)
            return cls._format_trip_record(res.data[0])

        record = _MEMORY_TRIPS.get(trip_id)
        if not record:
            raise ResourceNotFoundException("Trip", trip_id)
        record.update(updated_dict)
        return cls._format_trip_record(record)

    @classmethod
    async def delete_trip(
        cls, trip_id: str, user_id: str, access_token: Optional[str] = None
    ) -> bool:
        """Deletes a trip after enforcing ownership."""
        await cls.get_trip(trip_id, user_id, access_token)

        supabase = cls._db(access_token)
        if supabase is not None:
            try:
                supabase.table("trips").delete().eq("id", trip_id).eq("user_id", user_id).execute()
                return True
            except Exception as exc:
                logger.error("Failed to delete trip %s: %s", trip_id, exc)
                raise TravelMateException(
                    status_code=502,
                    detail="The trip could not be deleted. Please try again.",
                )

        _MEMORY_TRIPS.pop(trip_id, None)
        return True

    @classmethod
    async def duplicate_trip(
        cls, trip_id: str, user_id: str, access_token: Optional[str] = None
    ) -> TripResponse:
        """Duplicates an existing trip as a new starting point."""
        original = await cls.get_trip(trip_id, user_id, access_token)
        new_id = str(uuid.uuid4())
        now_iso = datetime.utcnow().isoformat()

        new_record = {
            "id": new_id,
            "user_id": user_id,
            "title": f"Copy of {original.title}",
            "destination": original.destination,
            "start_date": original.start_date,
            "end_date": original.end_date,
            "budget": original.budget,
            "currency": original.currency,
            "travelers_count": original.travelers_count,
            "travel_style": original.travel_style,
            "interests": original.interests,
            "preferences": original.preferences,
            "itinerary": original.itinerary,
            "estimated_total_cost": original.estimated_total_cost,
            "status": "planned",
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        supabase = cls._db(access_token)
        if supabase is not None:
            try:
                res = supabase.table("trips").insert(new_record).execute()
                if not res.data:
                    raise TravelMateException(
                        status_code=502,
                        detail="The trip could not be duplicated. Please try again.",
                    )
                return cls._format_trip_record(res.data[0])
            except TravelMateException:
                raise
            except Exception as exc:
                logger.error("Failed to duplicate trip %s: %s", trip_id, exc)
                raise TravelMateException(
                    status_code=502,
                    detail="The trip could not be duplicated. Please try again.",
                )

        _MEMORY_TRIPS[new_id] = new_record
        return cls._format_trip_record(new_record)

    # ------------------------------------------------------------------
    # Regeneration
    # ------------------------------------------------------------------
    @classmethod
    async def regenerate_entire_trip(
        cls, trip_id: str, user_id: str, access_token: Optional[str] = None
    ) -> TripResponse:
        """Regenerates the complete itinerary for an existing trip."""
        current = await cls.get_trip(trip_id, user_id, access_token)
        preferences = current.preferences or {}

        req = TripCreateRequest(
            destination=current.destination,
            start_date=date.fromisoformat(current.start_date[:10]),
            end_date=date.fromisoformat(current.end_date[:10]),
            budget=current.budget,
            currency=current.currency,
            travelers_count=current.travelers_count,
            travel_style=current.travel_style,
            interests=current.interests,
            daily_pace=preferences.get("daily_pace", "balanced"),
            accommodation_pref=preferences.get("accommodation_pref"),
            transportation_pref=preferences.get("transportation_pref"),
            dietary_pref=preferences.get("dietary_pref"),
            accessibility_req=preferences.get("accessibility_req"),
            additional_instructions=preferences.get("additional_instructions"),
        )

        new_itinerary = await AIService.generate_itinerary(req)
        return await cls.update_trip(
            trip_id=trip_id,
            user_id=user_id,
            update_data=TripUpdateRequest(
                title=new_itinerary.trip_title,
                itinerary=new_itinerary.model_dump(),
                estimated_total_cost=new_itinerary.estimated_total_cost,
            ),
            access_token=access_token,
        )

    @classmethod
    async def regenerate_single_day(
        cls,
        trip_id: str,
        day_number: int,
        user_id: str,
        additional_notes: Optional[str] = None,
        access_token: Optional[str] = None,
    ) -> TripResponse:
        """Regenerates ONLY one day inside an itinerary without affecting other days."""
        current = await cls.get_trip(trip_id, user_id, access_token)
        itinerary = copy.deepcopy(current.itinerary or {})
        days = itinerary.get("days", []) or []

        day_idx = next(
            (i for i, day in enumerate(days) if int(day.get("day_number", 0)) == day_number),
            None,
        )
        if day_idx is None:
            raise ResourceNotFoundException(f"Day {day_number} in trip", trip_id)

        new_day = await AIService.regenerate_single_day(
            trip_context={
                "destination": current.destination,
                "currency": current.currency,
                "travel_style": current.travel_style,
                "interests": current.interests,
                "preferences": current.preferences,
                "days": days,
            },
            day_number=day_number,
            additional_notes=additional_notes,
        )

        days[day_idx] = new_day.model_dump() if hasattr(new_day, "model_dump") else dict(new_day)
        itinerary["days"] = days
        recalculated = BudgetService.recalculate_itinerary_costs(itinerary)

        return await cls.update_trip(
            trip_id=trip_id,
            user_id=user_id,
            update_data=TripUpdateRequest(
                itinerary=recalculated,
                estimated_total_cost=recalculated.get("estimated_total_cost"),
            ),
            access_token=access_token,
        )
