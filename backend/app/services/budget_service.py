import copy
from datetime import date
from typing import Any, Dict, List

from app.schemas.itinerary import BudgetBreakdown


class BudgetService:
    @staticmethod
    def calculate_duration_days(start_date: date, end_date: date) -> int:
        """
        Calculates the inclusive number of trip days.
        Example: 2026-11-01 to 2026-11-03 is 3 travel days.
        """
        delta = (end_date - start_date).days
        return max(1, delta + 1)

    @staticmethod
    def compute_style_ratios(travel_style: str) -> Dict[str, float]:
        """Returns baseline allocation weights based on travel style."""
        style = (travel_style or "balanced").lower()
        if style == "luxury":
            return {
                "accommodation": 0.45,
                "food": 0.25,
                "activities": 0.15,
                "transportation": 0.10,
                "miscellaneous": 0.05,
            }
        if style in ("budget", "backpacking"):
            return {
                "accommodation": 0.30,
                "food": 0.25,
                "activities": 0.20,
                "transportation": 0.15,
                "miscellaneous": 0.10,
            }
        return {
            "accommodation": 0.35,
            "food": 0.25,
            "activities": 0.20,
            "transportation": 0.12,
            "miscellaneous": 0.08,
        }

    @staticmethod
    def calculate_budget_breakdown(
        total_budget: float,
        travel_style: str,
        days_count: int,
        travelers_count: int = 1,
    ) -> BudgetBreakdown:
        """Generates realistic recommended category allocations for a trip."""
        ratios = BudgetService.compute_style_ratios(travel_style)
        accommodation = round(total_budget * ratios["accommodation"], 2)
        food = round(total_budget * ratios["food"], 2)
        activities = round(total_budget * ratios["activities"], 2)
        transportation = round(total_budget * ratios["transportation"], 2)
        misc = round(total_budget - (accommodation + food + activities + transportation), 2)

        return BudgetBreakdown(
            accommodation=accommodation,
            food=food,
            transportation=transportation,
            activities=activities,
            miscellaneous=max(0.0, misc),
            total_estimated=round(total_budget, 2),
        )

    @staticmethod
    def analyze_budget(budget: float, estimated_total: float, days_count: int) -> Dict[str, Any]:
        """Compares planned budget with estimated expenses and returns metrics/warnings."""
        days = max(1, days_count)
        remaining = round(budget - estimated_total, 2)
        is_over_budget = remaining < 0
        over_budget_amount = round(abs(remaining), 2) if is_over_budget else 0.0
        avg_daily_budget = round(budget / days, 2)
        avg_daily_estimated = round(estimated_total / days, 2)

        warnings: List[str] = []
        if is_over_budget:
            warnings.append(
                f"Estimated expenses exceed the planned budget by {over_budget_amount}. "
                "Consider adjusting activity selections or opting for budget transit."
            )
        elif budget > 0 and remaining < (budget * 0.05):
            warnings.append(
                "Estimated expenses are very close to your total budget ceiling. "
                "Allowing a 10-15% buffer for incidental expenses is recommended."
            )

        return {
            "budget": budget,
            "estimated_total": estimated_total,
            "remaining_budget": remaining,
            "is_over_budget": is_over_budget,
            "over_budget_amount": over_budget_amount,
            "days_count": days,
            "avg_daily_budget": avg_daily_budget,
            "avg_daily_estimated": avg_daily_estimated,
            "warnings": warnings,
        }

    @staticmethod
    def recalculate_itinerary_costs(itinerary_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Recalculates totals from activities after the user adds, edits, or deletes
        activities. Returns a copy so request/original data is never mutated.
        """
        data = copy.deepcopy(itinerary_data or {})
        days = data.get("days") or []

        total_activities_cost = 0.0
        for day in days:
            for activity in (day or {}).get("activities", []) or []:
                try:
                    total_activities_cost += float(activity.get("estimated_cost", 0.0) or 0.0)
                except (TypeError, ValueError):
                    continue

        breakdown = data.get("budget_breakdown") or {}
        if not isinstance(breakdown, dict):
            breakdown = {}

        breakdown["accommodation"] = max(0.0, float(breakdown.get("accommodation", 0.0) or 0.0))
        breakdown["food"] = max(0.0, float(breakdown.get("food", 0.0) or 0.0))
        breakdown["transportation"] = max(0.0, float(breakdown.get("transportation", 0.0) or 0.0))
        breakdown["miscellaneous"] = max(0.0, float(breakdown.get("miscellaneous", 0.0) or 0.0))
        breakdown["activities"] = round(total_activities_cost, 2)

        new_total = round(
            breakdown["accommodation"]
            + breakdown["food"]
            + breakdown["transportation"]
            + breakdown["activities"]
            + breakdown["miscellaneous"],
            2,
        )
        breakdown["total_estimated"] = new_total
        data["budget_breakdown"] = breakdown
        data["estimated_total_cost"] = new_total

        num_days = max(1, len(days))
        data["daily_budget_recommendation"] = round(new_total / num_days, 2)
        return data
