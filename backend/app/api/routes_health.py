from fastapi import APIRouter

from app.config import settings
from app.core.auth import demo_mode_enabled

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    """Health check endpoint providing runtime and configuration status."""
    return {
        "status": "healthy",
        "service": "TravelMate AI Backend",
        "version": "1.0.0",
        "environment": settings.APP_ENV,
        "supabase_configured": settings.is_supabase_configured,
        "demo_mode": demo_mode_enabled(),
        "ai_provider": settings.AI_PROVIDER,
        "live_ai_active": settings.is_live_ai_configured,
    }
