from datetime import date
from typing import List, Literal, Optional, Dict, Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

TRAVEL_STYLES = {"budget", "balanced", "luxury", "backpacking"}
DAILY_PACES = {"relaxed", "balanced", "packed"}
TRIP_STATUSES = {"planned", "upcoming", "completed", "cancelled"}


class TripCreateRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    destination: str = Field(min_length=2, max_length=150, description="Destination city, region, or country")
    start_date: date = Field(description="Trip start date (YYYY-MM-DD)")
    end_date: date = Field(description="Trip end date (YYYY-MM-DD)")
    budget: float = Field(gt=0, le=100_000_000, description="Total budget in selected currency")
    currency: str = Field(default="USD", min_length=3, max_length=3)
    travelers_count: int = Field(default=1, ge=1, le=50, description="Number of travelers")
    travel_style: str = Field(default="balanced", description="budget, balanced, luxury, or backpacking")
    interests: List[str] = Field(default_factory=list, max_length=12)
    daily_pace: str = Field(default="balanced", description="relaxed, balanced, or packed")
    accommodation_pref: Optional[str] = Field(default=None, max_length=200)
    transportation_pref: Optional[str] = Field(default=None, max_length=200)
    dietary_pref: Optional[str] = Field(default=None, max_length=200)
    accessibility_req: Optional[str] = Field(default=None, max_length=300)
    additional_instructions: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("end_date")
    @classmethod
    def validate_dates(cls, v: date, info):
        start_date = info.data.get("start_date")
        if start_date and v < start_date:
            raise ValueError("End date must not be earlier than start date.")
        if start_date and (v - start_date).days > 30:
            raise ValueError("Trips longer than 30 days should be planned in separate segments.")
        return v

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, value: str) -> str:
        code = value.strip().upper()
        if not code.isalpha() or len(code) != 3:
            raise ValueError("Currency must be a 3-letter ISO code such as USD, EUR, or INR.")
        return code

    @field_validator("travel_style")
    @classmethod
    def validate_travel_style(cls, value: str) -> str:
        style = value.strip().lower()
        if style not in TRAVEL_STYLES:
            raise ValueError(f"Travel style must be one of: {', '.join(sorted(TRAVEL_STYLES))}.")
        return style

    @field_validator("daily_pace")
    @classmethod
    def validate_daily_pace(cls, value: str) -> str:
        pace = value.strip().lower()
        if pace not in DAILY_PACES:
            raise ValueError(f"Daily pace must be one of: {', '.join(sorted(DAILY_PACES))}.")
        return pace

    @field_validator("interests")
    @classmethod
    def validate_interests(cls, values: List[str]) -> List[str]:
        cleaned: List[str] = []
        for item in values:
            label = item.strip().lower()
            if not label:
                continue
            if len(label) > 40:
                raise ValueError("Each interest must be 40 characters or fewer.")
            if label not in cleaned:
                cleaned.append(label)
        return cleaned


class SaveTripRequest(TripCreateRequest):
    itinerary_override: Optional[Dict[str, Any]] = None


class TripUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    status: Optional[Literal["planned", "upcoming", "completed", "cancelled"]] = None
    budget: Optional[float] = Field(default=None, gt=0, le=100_000_000)
    itinerary: Optional[Dict[str, Any]] = None
    estimated_total_cost: Optional[float] = Field(default=None, ge=0)


class TripResponse(BaseModel):
    id: str
    user_id: str
    title: str
    destination: str
    start_date: str
    end_date: str
    budget: float
    currency: str
    travelers_count: int
    travel_style: str
    interests: List[str]
    preferences: Dict[str, Any]
    itinerary: Dict[str, Any]
    estimated_total_cost: float
    status: str
    created_at: str
    updated_at: str


class RegenerateDayRequest(BaseModel):
    day_number: Optional[int] = Field(default=None, ge=1, le=31)
    additional_notes: Optional[str] = Field(default=None, max_length=500)
