import logging
from typing import Optional

from fastapi import Header
from pydantic import BaseModel, Field

from app.config import settings
from app.core.exceptions import TravelMateException, UnauthorizedAccessException

logger = logging.getLogger("travelmate.auth")


class AuthenticatedUser(BaseModel):
    id: str
    email: str
    is_demo: bool = False
    # Kept server-side only so database calls can run with the user's JWT (RLS).
    access_token: Optional[str] = Field(default=None, repr=False, exclude=True)


# In-memory demo identity for seamless out-of-the-box local testing.
DEMO_USER_ID = "demo-user-0000-0000-0000-000000000001"
DEMO_USER_EMAIL = "traveler@travelmate.ai"
_DEMO_TOKENS = {"demo-token", "guest-token"}


def demo_mode_enabled() -> bool:
    """
    Demo authentication is only available when Supabase is not configured and
    the app is not running in production. This prevents shared demo data from
    being accessible in a real deployment.
    """
    return not settings.is_supabase_configured and not settings.is_production


def _demo_user(token: Optional[str] = None) -> AuthenticatedUser:
    return AuthenticatedUser(
        id=DEMO_USER_ID,
        email=DEMO_USER_EMAIL,
        is_demo=True,
        access_token=token,
    )


async def get_current_user(
    authorization: Optional[str] = Header(None)
) -> AuthenticatedUser:
    """
    Validates the Supabase JWT access token or, in local demo mode, returns the
    demo identity. Identity is always derived from the verified token, never
    from a request body.
    """
    if not authorization:
        if demo_mode_enabled():
            return _demo_user()
        if not settings.is_supabase_configured:
            raise TravelMateException(
                status_code=503,
                detail="Authentication is not configured on this server.",
            )
        raise UnauthorizedAccessException("Missing Authorization header with Bearer token.")

    token = authorization.strip()
    if token.lower().startswith("bearer "):
        token = token.split(" ", 1)[1].strip()

    if not token:
        raise UnauthorizedAccessException("Invalid or empty session token.")

    # Demo tokens are only honoured when demo mode is enabled.
    if token in _DEMO_TOKENS:
        if demo_mode_enabled():
            return _demo_user(token)
        raise UnauthorizedAccessException("Demo sessions are disabled on this server.")

    if not settings.is_supabase_configured:
        # Demo mode without Supabase: the local frontend uses demo-token, but
        # tolerate any locally-issued token rather than locking users out.
        if demo_mode_enabled():
            return _demo_user(token)
        raise TravelMateException(
            status_code=503,
            detail="Authentication is not configured on this server.",
        )

    from app.database.supabase_client import get_auth_client

    auth_client = get_auth_client()
    if auth_client is None:
        raise TravelMateException(
            status_code=503,
            detail="Authentication service is temporarily unavailable. Please try again.",
        )

    try:
        user_response = auth_client.auth.get_user(token)
    except Exception as exc:
        logger.info("Supabase token verification failed: %s", exc)
        raise UnauthorizedAccessException("Invalid or expired session token. Please sign in again.")

    if not user_response or not user_response.user:
        raise UnauthorizedAccessException("Invalid or expired session token. Please sign in again.")

    return AuthenticatedUser(
        id=str(user_response.user.id),
        email=user_response.user.email or "user@travelmate.ai",
        is_demo=False,
        access_token=token,
    )


async def get_optional_user(
    authorization: Optional[str] = Header(None)
) -> Optional[AuthenticatedUser]:
    """Returns the user when a valid token is supplied, otherwise None."""
    if not authorization:
        return None
    try:
        return await get_current_user(authorization)
    except Exception:
        return None
