from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


class ProfileResponse(BaseModel):
    id: str
    email: Optional[str] = None
    preferred_currency: str = "USD"
    default_travel_style: str = "balanced"
    default_interests: List[str] = Field(default_factory=list)
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    preferred_currency: Optional[str] = Field(None, min_length=3, max_length=3)
    default_travel_style: Optional[Literal["budget", "balanced", "luxury", "backpacking"]] = None
    default_interests: Optional[List[str]] = Field(None, max_length=12)

    @field_validator("preferred_currency")
    @classmethod
    def validate_currency(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        code = value.strip().upper()
        if not code.isalpha() or len(code) != 3:
            raise ValueError("Currency must be a 3-letter ISO code such as USD, EUR, or INR.")
        return code

    @field_validator("default_interests")
    @classmethod
    def validate_interests(cls, values: Optional[List[str]]) -> Optional[List[str]]:
        if values is None:
            return values
        cleaned: List[str] = []
        for item in values:
            label = item.strip().lower()
            if label and label not in cleaned:
                cleaned.append(label)
        return cleaned
