import pytest
from app.services.ai_service import AIService
from app.core.exceptions import AIGenerationException


def test_clean_json_markdown():
    raw_markdown = """```json
{
  "trip_title": "Weekend in Kyoto",
  "destination": "Kyoto, Japan"
}
```"""
    cleaned = AIService._clean_json_string(raw_markdown)
    assert cleaned.startswith("{")
    assert cleaned.endswith("}")
    parsed = AIService._parse_itinerary_json(raw_markdown)
    assert parsed["trip_title"] == "Weekend in Kyoto"


def test_clean_json_with_conversational_chatter():
    chatter = """Certainly! Here is your custom itinerary:
    
    {
      "trip_title": "Coastal Bliss in Bali",
      "currency": "USD"
    }
    
    Have a wonderful trip! Let me know if you need anything else."""
    parsed = AIService._parse_itinerary_json(chatter)
    assert parsed["trip_title"] == "Coastal Bliss in Bali"


def test_repair_trailing_comma():
    trailing = """{
      "trip_title": "Paris Journey",
      "items": [1, 2, ],
    }"""
    parsed = AIService._parse_itinerary_json(trailing)
    assert parsed["trip_title"] == "Paris Journey"


def test_invalid_json_throws_custom_exception():
    with pytest.raises(AIGenerationException):
        AIService._parse_itinerary_json("Not a json at all")
