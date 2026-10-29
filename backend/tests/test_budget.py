from datetime import date
import pytest
from app.services.budget_service import BudgetService


def test_calculate_duration_days():
    # Same day trip is 1 full day
    assert BudgetService.calculate_duration_days(date(2026, 11, 1), date(2026, 11, 1)) == 1
    # 3-day weekend
    assert BudgetService.calculate_duration_days(date(2026, 11, 1), date(2026, 11, 3)) == 3
    # 7-day week
    assert BudgetService.calculate_duration_days(date(2026, 11, 1), date(2026, 11, 7)) == 7


def test_budget_breakdown_ratios():
    luxury_breakdown = BudgetService.calculate_budget_breakdown(
        total_budget=10000.0,
        travel_style="luxury",
        days_count=5
    )
    assert luxury_breakdown.accommodation == 4500.0
    assert luxury_breakdown.food == 2500.0
    assert luxury_breakdown.total_estimated == 10000.0

    backpacking = BudgetService.calculate_budget_breakdown(
        total_budget=1000.0,
        travel_style="backpacking",
        days_count=5
    )
    assert backpacking.accommodation == 300.0
    assert backpacking.total_estimated == 1000.0


def test_analyze_budget_under_and_over():
    # Under budget
    analysis = BudgetService.analyze_budget(budget=2000.0, estimated_total=1800.0, days_count=4)
    assert analysis["is_over_budget"] is False
    assert analysis["remaining_budget"] == 200.0
    assert analysis["avg_daily_budget"] == 500.0

    # Over budget
    analysis_over = BudgetService.analyze_budget(budget=1500.0, estimated_total=1800.0, days_count=3)
    assert analysis_over["is_over_budget"] is True
    assert analysis_over["over_budget_amount"] == 300.0
    assert len(analysis_over["warnings"]) > 0


def test_recalculate_itinerary_costs():
    itinerary_data = {
        "budget_breakdown": {
            "accommodation": 500.0,
            "food": 300.0,
            "transportation": 150.0,
            "activities": 0.0,
            "miscellaneous": 50.0
        },
        "days": [
            {
                "day_number": 1,
                "activities": [
                    {"estimated_cost": 25.0},
                    {"estimated_cost": 35.0}
                ]
            },
            {
                "day_number": 2,
                "activities": [
                    {"estimated_cost": 40.0}
                ]
            }
        ]
    }
    recalculated = BudgetService.recalculate_itinerary_costs(itinerary_data)
    assert recalculated["budget_breakdown"]["activities"] == 100.0
    # Total = 500 + 300 + 150 + 100 + 50 = 1100.0
    assert recalculated["budget_breakdown"]["total_estimated"] == 1100.0
    assert recalculated["estimated_total_cost"] == 1100.0
    assert recalculated["daily_budget_recommendation"] == 550.0
