import logging
from typing import Any, Dict

from fastapi import APIRouter, Depends

from app.config import settings
from app.core.auth import AuthenticatedUser, get_current_user
from app.core.exceptions import TravelMateException
from app.database.supabase_client import get_user_client
from app.schemas.profile import ProfileResponse, ProfileUpdateRequest

logger = logging.getLogger("travelmate.profile")
router = APIRouter(prefix="/profile", tags=["Profile"])

# In-memory profiles store for local demo mode only.
_MEMORY_PROFILES: Dict[str, Dict[str, Any]] = {}


def _default_profile(user: AuthenticatedUser) -> Dict[str, Any]:
    return {
        "id": user.id,
        "email": user.email,
        "preferred_currency": "USD",
        "default_travel_style": "balanced",
        "default_interests": ["sightseeing", "food", "culture"],
    }


def _from_row(row: Dict[str, Any], user: AuthenticatedUser) -> ProfileResponse:
    return ProfileResponse(
        id=str(row.get("id", user.id)),
        email=user.email,
        preferred_currency=row.get("preferred_currency", "USD"),
        default_travel_style=row.get("default_travel_style", "balanced"),
        default_interests=row.get("default_interests") or [],
        created_at=str(row["created_at"]) if row.get("created_at") else None,
        updated_at=str(row["updated_at"]) if row.get("updated_at") else None,
    )


def _client_or_none(user: AuthenticatedUser):
    if not settings.is_supabase_configured:
        return None
    client = get_user_client(user.access_token)
    if client is None:
        raise TravelMateException(
            status_code=503,
            detail="Your profile is temporarily unavailable. Please try again.",
        )
    return client


@router.get("", response_model=ProfileResponse)
async def get_profile(user: AuthenticatedUser = Depends(get_current_user)):
    """Retrieves the authenticated user's profile settings."""
    supabase = _client_or_none(user)
    if supabase is not None:
        try:
            res = supabase.table("profiles").select("*").eq("id", user.id).execute()
            if res.data:
                return _from_row(res.data[0], user)
        except Exception as exc:
            logger.error("Failed to load profile: %s", exc)
            raise TravelMateException(
                status_code=502,
                detail="Could not load your profile. Please try again.",
            )

        # The auth trigger normally creates this row; upsert covers accounts
        # created before the migration was applied.
        defaults = _default_profile(user)
        try:
            created = supabase.table("profiles").upsert(
                {
                    "id": user.id,
                    "preferred_currency": defaults["preferred_currency"],
                    "default_travel_style": defaults["default_travel_style"],
                    "default_interests": defaults["default_interests"],
                },
                on_conflict="id",
            ).execute()
            if created.data:
                return _from_row(created.data[0], user)
        except Exception as exc:
            logger.warning("Could not create default profile: %s", exc)
        return ProfileResponse(**defaults)

    profile = _MEMORY_PROFILES.get(user.id, _default_profile(user))
    return ProfileResponse(**profile)


@router.put("", response_model=ProfileResponse)
async def update_profile(
    update: ProfileUpdateRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Updates the user's travel preferences and preferred currency."""
    payload: Dict[str, Any] = {}
    if update.preferred_currency:
        payload["preferred_currency"] = update.preferred_currency.upper()
    if update.default_travel_style:
        payload["default_travel_style"] = update.default_travel_style
    if update.default_interests is not None:
        payload["default_interests"] = update.default_interests

    supabase = _client_or_none(user)
    if supabase is not None:
        try:
            res = (
                supabase.table("profiles")
                .upsert({"id": user.id, **payload}, on_conflict="id")
                .execute()
            )
            if not res.data:
                raise TravelMateException(
                    status_code=502,
                    detail="Your profile could not be saved. Please try again.",
                )
            return _from_row(res.data[0], user)
        except TravelMateException:
            raise
        except Exception as exc:
            logger.error("Failed to update profile: %s", exc)
            raise TravelMateException(
                status_code=502,
                detail="Your profile could not be saved. Please try again.",
            )

    current = _MEMORY_PROFILES.get(user.id, _default_profile(user))
    current.update(payload)
    _MEMORY_PROFILES[user.id] = current
    return ProfileResponse(**current)
