import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.api.routes_health import router as health_router
from app.api.routes_itineraries import router as itineraries_router
from app.api.routes_trips import router as trips_router
from app.api.routes_profile import router as profile_router
from app.core.exceptions import TravelMateException

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("travelmate")

app = FastAPI(
    title="TravelMate AI — Personalized Travel Planner API",
    description="Intelligent AI-powered itinerary generation and travel budget management engine.",
    version="1.0.0"
)

# CORS Configuration — always use explicit origins. A wildcard cannot be
# combined with credentialed requests and is unsafe for authenticated APIs.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


@app.exception_handler(TravelMateException)
async def handle_custom_exception(request: Request, exc: TravelMateException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": True, "message": exc.detail}
    )


@app.exception_handler(Exception)
async def handle_unexpected_exception(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": True,
            "message": "An internal server error occurred while processing your travel request. Please try again shortly."
        }
    )


# Register Routers under /api
app.include_router(health_router, prefix="/api")
app.include_router(itineraries_router, prefix="/api")
app.include_router(trips_router, prefix="/api")
app.include_router(profile_router, prefix="/api")


@app.get("/")
async def root():
    return {
        "app": "TravelMate AI API",
        "docs": "/docs",
        "health": "/api/health"
    }
