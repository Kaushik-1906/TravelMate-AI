import json
import logging
import re
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from pydantic import ValidationError

from app.config import settings
from app.core.exceptions import AIGenerationException
from app.schemas.itinerary import Activity, BudgetBreakdown, DayPlan, Itinerary
from app.schemas.trip import TripCreateRequest
from app.services.budget_service import BudgetService

logger = logging.getLogger("travelmate.ai")


SYSTEM_PROMPT = """
You are TravelMate AI, an expert, thoughtful, and pragmatic travel itinerary planner.
Your mission is to generate highly personalized, realistic, day-by-day travel itineraries based on user constraints.

Follow these strict guidelines:
1. Personalization: Adapt pacing, attractions, dining, and accommodations strictly to the user's travel style, interests, daily pace, budget, and dietary/accessibility requirements.
2. Temporal Realism: Create exactly one day plan for each date in the range. Do not overcrowd schedules.
   - "relaxed" pace: 2-3 activities per day with ample leisure time.
   - "balanced" pace: 3-4 activities per day with natural meal stops.
   - "packed" pace: 4-5 activities per day starting early.
3. Geographical Logic: Group attractions located close to each other on the same day to minimize transit fatigue.
4. Transparency: Estimated costs, travel times, and suggestions must be realistic approximations. Never invent verified booking availability, live prices, real-time transit schedules, or exact opening hours. Mark estimates as estimates.
5. Content Quality: Provide short descriptions, practical reasons for each recommendation, suggested durations, meal suggestions, and alternative backup options.
6. Structured Output: You MUST respond ONLY with a single valid JSON object strictly adhering to the specified schema, without markdown formatting or surrounding conversational text.
"""

SINGLE_DAY_PROMPT = """
You are TravelMate AI. You are regenerating a SINGLE SPECIFIC DAY (Day {day_number}, Date: {date}) for an existing trip to {destination}.
Trip context:
- Travel Style: {travel_style}
- Interests: {interests}
- Daily Pace: {daily_pace}
- Currency: {currency}
- Additional User Notes for this regeneration: {additional_notes}

Provide fresh, engaging activities for this day that complement the trip without repeating common staples.
Return strictly a single JSON object matching the DayPlan schema:
{{
  "day_number": {day_number},
  "date": "{date}",
  "title": "Day title",
  "theme": "Theme description",
  "activities": [
    {{
      "time": "09:30 AM",
      "period": "Morning",
      "name": "Attraction or activity name",
      "description": "Rich description including meal suggestions where relevant",
      "category": "Sightseeing",
      "estimated_duration_minutes": 90,
      "estimated_cost": 25.0,
      "transportation_to_next": "Short walk / metro (estimated)",
      "estimated_travel_minutes": 15,
      "reason_for_recommendation": "Why this is recommended",
      "alternative_suggestion": "Alternative if closed or crowded"
    }}
  ]
}}
"""

REPAIR_INSTRUCTION = (
    "\n\nYour previous response could not be parsed or validated. "
    "Return ONLY one valid JSON object that exactly matches the schema above. "
    "Do not add markdown fences, comments, or conversational text. "
    "Use plain numbers for all cost and duration fields."
)


class AIService:
    @staticmethod
    def _clean_json_string(raw: str) -> str:
        """Strips markdown code blocks, whitespace, and invalid bounding characters."""
        text = (raw or "").strip()
        if text.startswith("```"):
            lines = text.splitlines()
            if lines and lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip().startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()

        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            text = text[start: end + 1]
        return text

    @staticmethod
    def _parse_itinerary_json(raw_text: str) -> Dict[str, Any]:
        """Attempts to parse JSON with a conservative repair pass."""
        cleaned = AIService._clean_json_string(raw_text)
        try:
            parsed = json.loads(cleaned)
            if not isinstance(parsed, dict):
                raise AIGenerationException("Model returned JSON that is not an object.")
            return parsed
        except json.JSONDecodeError as err:
            # Remove trailing commas before closing brackets/braces.
            repaired = re.sub(r",\s*([\}\]])", r"\1", cleaned)
            try:
                parsed = json.loads(repaired)
                if not isinstance(parsed, dict):
                    raise AIGenerationException("Model returned JSON that is not an object.")
                return parsed
            except Exception:
                raise AIGenerationException(
                    f"Model returned invalid JSON structure: {str(err)}"
                )

    # ------------------------------------------------------------------
    # Public entry points
    # ------------------------------------------------------------------
    @classmethod
    async def generate_itinerary(cls, req: TripCreateRequest) -> Itinerary:
        """Generates an itinerary via the configured provider or demo engine."""
        duration_days = BudgetService.calculate_duration_days(req.start_date, req.end_date)
        breakdown = BudgetService.calculate_budget_breakdown(
            total_budget=req.budget,
            travel_style=req.travel_style,
            days_count=duration_days,
            travelers_count=req.travelers_count,
        )

        if not settings.is_live_ai_configured:
            return cls._generate_demo_itinerary(req, duration_days, breakdown)

        try:
            return await cls._generate_live_itinerary(req, duration_days, breakdown)
        except Exception as exc:
            logger.warning("Live AI generation failed (%s): %s", settings.AI_PROVIDER, exc)
            if settings.AI_DEMO_FALLBACK:
                fallback = cls._generate_demo_itinerary(req, duration_days, breakdown)
                fallback.overview = (
                    "Demo fallback: the configured AI provider was unavailable, so this "
                    "sample itinerary was generated locally. " + fallback.overview
                )
                return fallback
            raise AIGenerationException(
                "The AI service could not generate your itinerary right now. "
                "Please check the server AI configuration or try again in a moment."
            )

    @classmethod
    async def regenerate_single_day(
        cls,
        trip_context: Dict[str, Any],
        day_number: int,
        additional_notes: Optional[str] = None,
    ) -> DayPlan:
        """Regenerates only a specific day of an itinerary."""
        days = trip_context.get("days", []) or []
        target_day = next((d for d in days if d.get("day_number") == day_number), None)
        target_date = (target_day or {}).get("date") or str(date.today())
        destination = trip_context.get("destination", "the destination")
        currency = trip_context.get("currency", "USD")
        travel_style = trip_context.get("travel_style", "balanced")
        interests = trip_context.get("interests", ["sightseeing", "food"]) or ["sightseeing"]
        daily_pace = (trip_context.get("preferences") or {}).get("daily_pace", "balanced")

        if not settings.is_live_ai_configured:
            return cls._generate_demo_day(
                day_number=day_number,
                date_str=target_date,
                destination=destination,
                currency=currency,
                travel_style=travel_style,
                interests=interests,
                pace=daily_pace,
                additional_notes=additional_notes,
            )

        prompt = SINGLE_DAY_PROMPT.format(
            day_number=day_number,
            date=target_date,
            destination=destination,
            travel_style=travel_style,
            interests=", ".join(interests),
            daily_pace=daily_pace,
            currency=currency,
            additional_notes=additional_notes or "None",
        )

        max_attempts = max(1, min(settings.AI_MAX_ATTEMPTS, 3))
        last_error: Optional[Exception] = None
        for attempt in range(1, max_attempts + 1):
            try:
                raw_json = await cls._call_provider_raw(
                    prompt if attempt == 1 else prompt + REPAIR_INSTRUCTION
                )
                data = cls._parse_itinerary_json(raw_json)
                data["day_number"] = day_number
                data["date"] = target_date
                day = DayPlan(**data)
                return cls._normalize_day(day, day_number, target_date)
            except (AIGenerationException, ValidationError, TypeError, KeyError) as exc:
                last_error = exc
                logger.info("Day regeneration attempt %s/%s failed: %s", attempt, max_attempts, exc)

        logger.warning("Live day regeneration failed: %s", last_error)
        if settings.AI_DEMO_FALLBACK:
            return cls._generate_demo_day(
                day_number=day_number,
                date_str=target_date,
                destination=destination,
                currency=currency,
                travel_style=travel_style,
                interests=interests,
                pace=daily_pace,
                additional_notes=additional_notes,
            )
        raise AIGenerationException(
            "The AI service could not regenerate this day. Please try again or edit the day manually."
        )

    # ------------------------------------------------------------------
    # Live generation + normalization
    # ------------------------------------------------------------------
    @classmethod
    async def _generate_live_itinerary(
        cls,
        req: TripCreateRequest,
        duration_days: int,
        fallback_breakdown: BudgetBreakdown,
    ) -> Itinerary:
        prompt = cls._build_prompt(req, duration_days)
        max_attempts = max(1, min(settings.AI_MAX_ATTEMPTS, 3))
        last_error: Optional[Exception] = None

        for attempt in range(1, max_attempts + 1):
            try:
                raw_text = await cls._call_provider_raw(
                    prompt if attempt == 1 else prompt + REPAIR_INSTRUCTION
                )
                parsed = cls._parse_itinerary_json(raw_text)
                return cls._normalize_itinerary(
                    parsed=parsed,
                    req=req,
                    duration_days=duration_days,
                    fallback_breakdown=fallback_breakdown,
                )
            except (AIGenerationException, ValidationError, TypeError, KeyError) as exc:
                last_error = exc
                logger.info("Itinerary generation attempt %s/%s failed: %s", attempt, max_attempts, exc)

        raise AIGenerationException(
            f"AI returned an invalid itinerary after {max_attempts} attempts: {last_error}"
        )

    @classmethod
    def _normalize_itinerary(
        cls,
        parsed: Dict[str, Any],
        req: TripCreateRequest,
        duration_days: int,
        fallback_breakdown: BudgetBreakdown,
    ) -> Itinerary:
        data = dict(parsed or {})
        data.setdefault("trip_title", f"Trip to {req.destination}")
        data.setdefault("destination", req.destination)
        data.setdefault("overview", f"A personalized itinerary for {req.destination}.")
        data["currency"] = req.currency
        data["is_demo"] = False

        itinerary = Itinerary(**data)
        if not itinerary.days:
            raise AIGenerationException("AI returned no daily plans.")
        if len(itinerary.days) != duration_days:
            raise AIGenerationException(
                f"AI returned {len(itinerary.days)} day(s) but {duration_days} were requested."
            )

        # Force a consistent, chronological day sequence and stable activity IDs.
        for index, day in enumerate(itinerary.days):
            expected_date = req.start_date + timedelta(days=index)
            day.day_number = index + 1
            day.date = expected_date.isoformat()
            for act_index, activity in enumerate(day.activities, start=1):
                activity.id = f"act_d{index + 1}_{act_index}"

        normalized = BudgetService.recalculate_itinerary_costs(itinerary.model_dump())

        # If the model returned no cost signal at all, fall back to the
        # style-based planning allocation rather than showing a zero budget.
        if float(normalized.get("estimated_total_cost", 0.0)) <= 0:
            fb = fallback_breakdown.model_dump()
            normalized["budget_breakdown"] = fb
            normalized["estimated_total_cost"] = fb["total_estimated"]
            normalized["daily_budget_recommendation"] = round(
                fb["total_estimated"] / max(1, duration_days), 2
            )

        normalized["currency"] = req.currency
        normalized["is_demo"] = False
        return Itinerary(**normalized)

    @classmethod
    def _normalize_day(cls, day: DayPlan, day_number: int, date_str: str) -> DayPlan:
        day.day_number = day_number
        day.date = date_str
        for index, activity in enumerate(day.activities, start=1):
            activity.id = f"act_d{day_number}_{index}"
        day.is_demo = False
        return day

    # ------------------------------------------------------------------
    # Provider implementations
    # ------------------------------------------------------------------
    @classmethod
    async def _call_provider_raw(cls, user_prompt: str) -> str:
        provider = settings.AI_PROVIDER.lower()
        if provider == "gemini":
            return await cls._call_gemini_raw(user_prompt)
        if provider in ("openai", "groq"):
            return await cls._call_openai_raw(user_prompt)
        raise AIGenerationException(f"Unsupported AI provider: {provider}")

    @classmethod
    async def _call_gemini_raw(cls, user_prompt: str) -> str:
        """Calls Google Gemini through the official SDK, with an HTTP fallback."""
        model_name = settings.AI_MODEL or "gemini-2.0-flash"
        sdk_error: Optional[Exception] = None

        try:
            from google import genai

            client = genai.Client(api_key=settings.AI_API_KEY)
            response = await client.aio.models.generate_content(
                model=model_name,
                contents=user_prompt,
                config={
                    "system_instruction": SYSTEM_PROMPT,
                    "response_mime_type": "application/json",
                    "temperature": 0.4,
                },
            )
            text = getattr(response, "text", None)
            if text and text.strip():
                return text
            sdk_error = AIGenerationException("Gemini returned an empty response.")
        except ImportError:
            sdk_error = AIGenerationException("google-genai SDK is not installed.")
        except Exception as exc:
            sdk_error = exc
            logger.warning("Gemini SDK call failed, attempting REST fallback: %s", exc)

        import httpx

        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model_name}:generateContent"
        )
        payload = {
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": [{"parts": [{"text": user_prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.4,
            },
        }
        try:
            async with httpx.AsyncClient(timeout=settings.AI_TIMEOUT_SECONDS) as client:
                response = await client.post(
                    url,
                    params={"key": settings.AI_API_KEY},
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as exc:
            if sdk_error:
                logger.warning("Gemini REST fallback also failed: %s", exc)
            raise AIGenerationException("Gemini request failed.") from exc

    @classmethod
    async def _call_openai_raw(cls, user_prompt: str) -> str:
        """Calls OpenAI or an OpenAI-compatible provider such as Groq."""
        from openai import AsyncOpenAI

        base_url = (settings.AI_BASE_URL or "").strip() or None
        if not base_url and settings.AI_PROVIDER.lower() == "groq":
            base_url = "https://api.groq.com/openai/v1"

        default_model = "llama-3.3-70b-versatile" if settings.AI_PROVIDER.lower() == "groq" else "gpt-4o-mini"
        model_name = settings.AI_MODEL or default_model

        client = AsyncOpenAI(
            api_key=settings.AI_API_KEY,
            base_url=base_url,
            timeout=settings.AI_TIMEOUT_SECONDS,
        )
        try:
            response = await client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.4,
            )
            content = response.choices[0].message.content
            if not content:
                raise AIGenerationException("AI provider returned an empty response.")
            return content
        except Exception as exc:
            logger.warning("OpenAI-compatible request failed: %s", exc)
            raise AIGenerationException("AI provider request failed.") from exc
        finally:
            await client.close()

    @classmethod
    def _build_prompt(cls, req: TripCreateRequest, duration_days: int) -> str:
        interests_str = ", ".join(req.interests) if req.interests else "general sightseeing, local cuisine"
        dates = [
            (req.start_date + timedelta(days=index)).isoformat()
            for index in range(duration_days)
        ]
        return f"""
Generate a comprehensive, personalized travel itinerary for:
- Destination: {req.destination}
- Dates: {req.start_date} to {req.end_date} ({duration_days} full days)
- Exact dates to cover, in order: {", ".join(dates)}
- Total Budget: {req.budget} {req.currency}
- Travelers: {req.travelers_count}
- Travel Style: {req.travel_style}
- Interests: {interests_str}
- Daily Pace: {req.daily_pace}
- Accommodation Preference: {req.accommodation_pref or 'Not specified'}
- Transportation Preference: {req.transportation_pref or 'Not specified'}
- Dietary Needs: {req.dietary_pref or 'None'}
- Accessibility: {req.accessibility_req or 'None'}
- Additional Instructions: {req.additional_instructions or 'None'}

Rules:
- Return exactly {duration_days} day objects, numbered 1..{duration_days}, using the exact dates listed above.
- Estimated costs should be believable for the destination and style. They may exceed the budget if that is realistic; never fabricate verified prices.
- The budget_breakdown categories must sum to approximately estimated_total_cost.
- Include meal suggestions, accommodation recommendations, transportation tips, practical tips, and safety/etiquette notes.
- Briefly explain in the overview why the plan matches the user's preferences.

Return a single JSON object strictly matching this schema:
{{
  "trip_title": "Descriptive and engaging title",
  "destination": "{req.destination}",
  "overview": "2-3 paragraphs highlighting key experiences and why this itinerary matches preferences",
  "currency": "{req.currency}",
  "estimated_total_cost": 0,
  "daily_budget_recommendation": 0,
  "budget_breakdown": {{
    "accommodation": 0,
    "food": 0,
    "transportation": 0,
    "activities": 0,
    "miscellaneous": 0,
    "total_estimated": 0
  }},
  "travel_tips": ["Tip 1", "Tip 2", "Tip 3"],
  "safety_and_etiquette": ["Note 1", "Note 2"],
  "transportation_tips": ["Transit tip 1", "Transit tip 2"],
  "accommodation_recommendations": [
    {{"name": "Recommended Hotel/Hostel", "type": "Boutique Hotel", "area": "Central District", "estimated_nightly": 0, "notes": "Why it fits"}}
  ],
  "days": [
    {{
      "day_number": 1,
      "date": "{req.start_date}",
      "title": "Day 1 Highlights",
      "theme": "Theme description",
      "activities": [
        {{
          "time": "09:30 AM",
          "period": "Morning",
          "name": "Attraction Name",
          "description": "Short engaging description including a meal suggestion where relevant",
          "category": "Sightseeing",
          "estimated_duration_minutes": 120,
          "estimated_cost": 25.0,
          "transportation_to_next": "Walk 10 mins (estimated)",
          "estimated_travel_minutes": 10,
          "reason_for_recommendation": "Matches interest in history",
          "alternative_suggestion": "Alternative venue if crowded"
        }}
      ]
    }}
  ]
}}
"""

    # ------------------------------------------------------------------
    # Demo generator (clearly labelled, no live-AI claims)
    # ------------------------------------------------------------------
    @classmethod
    def _generate_demo_itinerary(
        cls,
        req: TripCreateRequest,
        duration_days: int,
        breakdown: BudgetBreakdown,
    ) -> Itinerary:
        """Generates realistic, customized sample itineraries for demo mode."""
        dest = req.destination.strip().title()
        daily_budget = round(req.budget / max(1, duration_days), 2)
        style = req.travel_style.lower()

        is_beach = any(w in dest.lower() for w in ["beach", "bali", "goa", "maldives", "cancun", "hawaii", "phuket", "santorini"])
        is_nature = any(w in dest.lower() for w in ["switzerland", "alps", "banff", "patagonia", "iceland", "yosemite", "queenstown"])
        is_historic = any(w in dest.lower() for w in ["rome", "paris", "kyoto", "jaipur", "cairo", "athens", "london", "florence"])

        trip_title = f"{style.capitalize()} Exploration of {dest}"
        if is_beach:
            trip_title = f"Coastal Getaway & Relaxation in {dest}"
        elif is_nature:
            trip_title = f"Alpine Wonders & Nature Expedition in {dest}"
        elif is_historic:
            trip_title = f"Cultural Heritage & Living History of {dest}"

        interest_text = ", ".join(req.interests) if req.interests else "sightseeing and local food"
        overview = (
            f"Welcome to your demo itinerary for {dest}, designed for {req.travelers_count} traveler(s) "
            f"with a {style} style and a {req.daily_pace} pace. The plan balances your interests in "
            f"{interest_text} with realistic meal stops and transit buffers. "
            "Itinerary content is generated locally for demonstration and is clearly labelled as demo mode."
        )
        if req.additional_instructions:
            overview += f" Requested notes considered: {req.additional_instructions[:160]}."

        days: List[DayPlan] = []
        for day_idx in range(1, duration_days + 1):
            day_plan = cls._generate_demo_day(
                day_number=day_idx,
                date_str=(req.start_date + timedelta(days=day_idx - 1)).isoformat(),
                destination=dest,
                currency=req.currency,
                travel_style=req.travel_style,
                interests=req.interests,
                pace=req.daily_pace,
                dietary_pref=req.dietary_pref,
                budget_per_day=daily_budget,
            )
            days.append(day_plan)

        accommodation_nightly = round(breakdown.accommodation / duration_days, 2)
        accommodations = [
            {
                "name": f"{dest} Heritage Grand Suites" if style == "luxury" else f"Central {dest} Boutique Stay",
                "type": "Luxury Resort & Spa" if style == "luxury" else ("Eco Hostel" if style in ("budget", "backpacking") else "Boutique Hotel"),
                "area": "Historic Old Town / Waterfront",
                "estimated_nightly": accommodation_nightly,
                "notes": "Central location near public transit; this is a sample recommendation, not a live availability check.",
            },
            {
                "name": f"The Traveler's Nest {dest}",
                "type": "Modern Serviced Apartment" if style in ("balanced", "luxury") else "Guesthouse",
                "area": "Arts District",
                "estimated_nightly": round(accommodation_nightly * 0.8, 2),
                "notes": "Quieter neighborhood with local markets and transit links.",
            },
        ]

        travel_tips = [
            f"Download offline maps of {dest} before arriving so navigation still works without mobile data.",
            f"Keep small denominations of {req.currency} for markets, street vendors, and tips.",
            "Schedule indoor museum visits during midday heat or sudden rain showers.",
            "Check official venue websites for current opening hours and ticket rules before visiting.",
        ]
        safety_notes = [
            "Keep emergency contacts and travel-insurance details in a secure offline copy.",
            f"Tipping customs in {dest} vary; confirm whether a service charge is already included.",
            "Carry a reusable water bottle and respect dress codes at cultural or religious sites.",
        ]
        transit_tips = [
            f"Public transport in {dest} is often the most cost-effective option; verify routes and fares locally.",
            "Use licensed taxis or reputable rideshare apps with upfront fare estimates.",
            "Walking is a great way to discover neighborhoods, but keep travel times as estimates.",
        ]

        return Itinerary(
            trip_title=trip_title,
            destination=dest,
            overview=overview,
            currency=req.currency,
            estimated_total_cost=breakdown.total_estimated,
            daily_budget_recommendation=daily_budget,
            budget_breakdown=breakdown,
            travel_tips=travel_tips,
            safety_and_etiquette=safety_notes,
            accommodation_recommendations=accommodations,
            transportation_tips=transit_tips,
            days=days,
            is_demo=True,
            disclaimer=(
                "Demo Mode Notice: This itinerary was generated locally using travel heuristics, "
                "not a live AI model. Prices, opening hours, availability, and schedules are estimates "
                "and must be verified independently. Configure AI_PROVIDER and AI_API_KEY on the server "
                "to enable live AI generation."
            ),
        )

    @classmethod
    def _generate_demo_day(
        cls,
        day_number: int,
        date_str: str,
        destination: str,
        currency: str,
        travel_style: str,
        interests: List[str],
        pace: str = "balanced",
        additional_notes: Optional[str] = None,
        dietary_pref: Optional[str] = None,
        budget_per_day: Optional[float] = None,
    ) -> DayPlan:
        """Generates a varied, interest-aware day plan for demo mode."""
        interests = [item.lower() for item in (interests or ["sightseeing"])]
        titles = [
            f"Arrival, Orientation & Historic Center of {destination}",
            f"Iconic Landmarks, Cultural Treasures & Riverfront",
            f"Local Artisan Markets, Culinary Flavors & Hidden Courtyards",
            f"Nature Excursion, Panoramic Lookouts & Sunset Vista",
            f"Modern Arts, Neighborhood Boutiques & Gastronomy Walk",
            f"Heritage Architecture, Garden Strolls & Traditional Dinner",
            f"Leisure Morning, Keepsake Shopping & Farewell Celebration",
        ]
        title_idx = (day_number - 1) % len(titles)
        day_title = titles[title_idx]
        if additional_notes:
            day_title += f" ({additional_notes[:30]})"

        cost_factor = 1.8 if travel_style == "luxury" else (0.6 if travel_style in ("budget", "backpacking") else 1.0)
        if budget_per_day and budget_per_day > 0:
            # Keep sample activity costs plausible relative to the daily budget.
            cost_factor = min(cost_factor, max(0.25, budget_per_day / 180.0))

        def cost(base: float) -> float:
            return round(base * cost_factor, 2)

        morning_category = "Sightseeing"
        morning_name = f"Historic Quarter & Grand Plaza Exploration in {destination}"
        morning_desc = (
            f"Begin the day exploring the architectural heart of {destination}. "
            "Wander through cobbled plazas, take early photographs before crowds arrive, "
            "and stop for breakfast at a well-reviewed neighborhood bakery."
        )
        if any(i in interests for i in ("nature", "adventure")):
            morning_category = "Nature & Outdoor"
            morning_name = f"Scenic Nature Walk & Viewpoint Near {destination}"
            morning_desc = (
                f"Start with a guided or self-guided nature route near {destination}. "
                "Bring water, wear comfortable footwear, and check trail conditions locally."
            )
        elif "beaches" in interests:
            morning_category = "Nature & Outdoor"
            morning_name = f"Morning Beach Walk & Coastal Cafe in {destination}"
            morning_desc = (
                "Enjoy a relaxed shoreline walk before the heat peaks, then pause at a "
                "local cafe for breakfast and coffee."
            )
        elif any(i in interests for i in ("food", "shopping")):
            morning_category = "Shopping & Markets"
            morning_name = f"Artisan Market & Breakfast Tasting in {destination}"
            morning_desc = (
                "Browse a local market with seasonal produce, baked goods, and crafts. "
                "This is a good low-cost way to meet local vendors and learn regional flavors."
            )

        activities: List[Activity] = [
            Activity(
                id=f"act_d{day_number}_1",
                time="09:00 AM",
                period="Morning",
                name=morning_name,
                description=morning_desc,
                category=morning_category,
                estimated_duration_minutes=120,
                estimated_cost=cost(15.0 if travel_style != "luxury" else 45.0),
                transportation_to_next="10-minute walk through the pedestrian center (estimate)",
                estimated_travel_minutes=10,
                reason_for_recommendation="A practical orientation point matching your declared interests.",
                alternative_suggestion="Indoor heritage gallery or covered market if the weather turns.",
                is_demo=True,
            )
        ]

        lunch_note = f" Ask for {dietary_pref} options when ordering." if dietary_pref else ""
        activities.append(
            Activity(
                id=f"act_d{day_number}_2",
                time="12:30 PM",
                period="Afternoon",
                name=f"Regional Lunch at {destination} Central Market",
                description=(
                    "Sample signature regional dishes at a busy food market or casual local restaurant. "
                    "Confirm current opening hours and prices on site." + lunch_note
                ),
                category="Food & Dining",
                estimated_duration_minutes=90,
                estimated_cost=cost(20.0 if travel_style != "luxury" else 65.0),
                transportation_to_next="15-minute tram or metro ride (estimated)",
                estimated_travel_minutes=15,
                reason_for_recommendation="Adds an authentic local food experience without a long detour.",
                alternative_suggestion="A quieter garden bistro if the market is crowded.",
                is_demo=True,
            )
        )

        if pace in ("balanced", "packed"):
            activities.append(
                Activity(
                    id=f"act_d{day_number}_3",
                    time="02:30 PM",
                    period="Afternoon",
                    name=f"{destination} Fine Arts & History Museum",
                    description=(
                        "Explore regional art, historical artifacts, and rotating exhibitions. "
                        "Check the museum's official site for current hours and ticket availability."
                    ),
                    category="Culture & History",
                    estimated_duration_minutes=120,
                    estimated_cost=cost(18.0 if travel_style != "luxury" else 35.0),
                    transportation_to_next="12-minute taxi or metro transfer (estimated)",
                    estimated_travel_minutes=12,
                    reason_for_recommendation="Deepens context for the city's culture and history.",
                    alternative_suggestion="Nearby botanical garden or library if you prefer a slower afternoon.",
                    is_demo=True,
                )
            )

        activities.append(
            Activity(
                id=f"act_d{day_number}_4",
                time="06:30 PM",
                period="Evening",
                name=f"Sunset Viewpoint & Traditional Dinner in {destination}",
                description=(
                    f"Watch the sunset from a scenic promenade or viewpoint, then enjoy a relaxed dinner "
                    f"featuring regional specialties. {lunch_note}"
                ),
                category="Relaxation & Dining",
                estimated_duration_minutes=150,
                estimated_cost=cost(30.0 if travel_style != "luxury" else 95.0),
                transportation_to_next="Return to accommodation by metro, taxi, or walking",
                estimated_travel_minutes=15,
                reason_for_recommendation="Ends the day with a memorable view and an easy meal option.",
                alternative_suggestion="A rooftop lounge or neighborhood restaurant if the viewpoint is busy.",
                is_demo=True,
            )
        )

        if pace == "packed":
            activities.append(
                Activity(
                    id=f"act_d{day_number}_5",
                    time="09:15 PM",
                    period="Evening",
                    name="Illuminated Night Stroll & Live Music",
                    description=(
                        "Take a short evening walk past illuminated landmarks and look for a local live-music venue. "
                        "Check venue schedules locally; no booking is guaranteed."
                    ),
                    category="Entertainment",
                    estimated_duration_minutes=75,
                    estimated_cost=cost(12.0),
                    transportation_to_next="Short walk back to your accommodation",
                    estimated_travel_minutes=8,
                    reason_for_recommendation="Uses the evening without adding a long transfer.",
                    alternative_suggestion="Dessert cafe or night market if live music is unavailable.",
                    is_demo=True,
                )
            )

        if pace == "relaxed":
            activities = activities[:3]

        return DayPlan(
            day_number=day_number,
            date=date_str,
            title=day_title,
            theme=f"Discovering the authentic spirit of {destination}",
            activities=activities,
            is_demo=True,
        )
