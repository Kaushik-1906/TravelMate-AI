from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator


def _new_activity_id() -> str:
    return f"act_{uuid4().hex[:12]}"


class Activity(BaseModel):
    id: str = Field(default_factory=_new_activity_id)
    time: str = Field(description="Time of activity, e.g. 09:30 AM")
    period: str = Field(description="Morning, Afternoon, or Evening")
    name: str = Field(description="Name of attraction or activity")
    description: str = Field(description="Short description and highlights")
    category: str = Field(default="Sightseeing", description="Sightseeing, Food & Dining, Nature, Culture, Shopping, etc.")
    estimated_duration_minutes: int = Field(default=90, ge=0, le=1440)
    estimated_cost: float = Field(default=0.0, ge=0, le=10_000_000)
    transportation_to_next: Optional[str] = None
    estimated_travel_minutes: Optional[int] = Field(default=None, ge=0, le=1440)
    reason_for_recommendation: Optional[str] = None
    alternative_suggestion: Optional[str] = None
    is_demo: bool = False

    @field_validator("period")
    @classmethod
    def validate_period(cls, value: str) -> str:
        normalized = value.strip().title()
        return normalized if normalized in {"Morning", "Afternoon", "Evening"} else "Morning"


class DayPlan(BaseModel):
    day_number: int = Field(ge=1, le=31)
    date: str
    title: str
    theme: Optional[str] = None
    activities: List[Activity] = Field(default_factory=list, max_length=12)
    is_demo: bool = False


class BudgetBreakdown(BaseModel):
    accommodation: float = Field(default=0.0, ge=0)
    food: float = Field(default=0.0, ge=0)
    transportation: float = Field(default=0.0, ge=0)
    activities: float = Field(default=0.0, ge=0)
    miscellaneous: float = Field(default=0.0, ge=0)
    total_estimated: float = Field(default=0.0, ge=0)


class Itinerary(BaseModel):
    trip_title: str
    destination: str
    overview: str
    currency: str = "USD"
    estimated_total_cost: float = Field(default=0.0, ge=0)
    daily_budget_recommendation: float = Field(default=0.0, ge=0)
    budget_breakdown: BudgetBreakdown = Field(default_factory=BudgetBreakdown)
    travel_tips: List[str] = Field(default_factory=list)
    safety_and_etiquette: List[str] = Field(default_factory=list)
    accommodation_recommendations: List[Dict[str, Any]] = Field(default_factory=list)
    transportation_tips: List[str] = Field(default_factory=list)
    days: List[DayPlan] = Field(default_factory=list)
    is_demo: bool = False
    disclaimer: str = (
        "AI-generated estimates for prices, hours, availability, and transit durations are approximate "
        "and should be verified independently prior to travel."
    )
