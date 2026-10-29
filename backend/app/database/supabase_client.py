import logging
from typing import Optional

from supabase import Client, create_client

from app.config import settings

logger = logging.getLogger("travelmate.supabase")

_auth_client: Optional[Client] = None
_admin_client: Optional[Client] = None


def get_auth_client() -> Optional[Client]:
    """
    Client used only to verify Supabase access tokens (anon key, no user session).
    Never uses the service-role key.
    """
    global _auth_client
    if _auth_client is not None:
        return _auth_client

    if not settings.is_supabase_configured:
        return None

    try:
        _auth_client = create_client(
            settings.SUPABASE_URL.strip(),
            settings.SUPABASE_ANON_KEY.strip(),
        )
        return _auth_client
    except Exception as exc:  # pragma: no cover - depends on network/config
        logger.warning("Could not initialize Supabase auth client: %s", exc)
        return None


def get_user_client(access_token: Optional[str] = None) -> Optional[Client]:
    """
    Returns a Supabase client scoped to the authenticated user's JWT.

    PostgREST receives the user's token, so database Row Level Security is
    enforced by PostgreSQL (auth.uid()) in addition to API-level ownership checks.
    Returns None when Supabase is not configured.
    """
    if not settings.is_supabase_configured:
        return None
    if not access_token:
        return None

    try:
        client = create_client(
            settings.SUPABASE_URL.strip(),
            settings.SUPABASE_ANON_KEY.strip(),
        )
        # Attach the user's JWT to PostgREST requests. This is what makes RLS
        # policies evaluate against the correct auth.uid().
        client.postgrest.auth(access_token)
        return client
    except Exception as exc:  # pragma: no cover - depends on network/config
        logger.warning("Could not initialize user-scoped Supabase client: %s", exc)
        return None


def get_supabase_client() -> Optional[Client]:
    """
    Trusted server-side client. Uses the service-role key when configured,
    otherwise the anon key. Prefer get_user_client() for user data so RLS
    remains active.
    """
    global _admin_client
    if _admin_client is not None:
        return _admin_client

    if not settings.is_supabase_configured:
        return None

    key = (settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY or "").strip()
    if not key:
        return None

    try:
        _admin_client = create_client(settings.SUPABASE_URL.strip(), key)
        return _admin_client
    except Exception as exc:  # pragma: no cover - depends on network/config
        logger.warning("Could not initialize Supabase client: %s", exc)
        return None


def reset_supabase_clients() -> None:
    """Test/utility helper to clear cached clients after configuration changes."""
    global _auth_client, _admin_client
    _auth_client = None
    _admin_client = None
