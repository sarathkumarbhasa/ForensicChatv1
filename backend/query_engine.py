import json
import re
import requests
from config import GEMINI_API_KEY, OPENROUTER_API_KEY

def _regex_fallback(query: str) -> dict:
    query = query.lower()
    
    # Extract number (supports 3+ digits for testing or alphanumeric E-id)
    number_match = re.search(r'(\d{3,15}|[a-zA-Z]\d{2,5})', query)
    target_number = number_match.group(1) if number_match else None
    
    if "call the most" in query or "frequent" in query or "top contact" in query:
        return {
            "intent": "top_contact",
            "target_number": target_number,
            "direction": "outgoing" if "call" in query else "both",
            "metric": "frequency",
            "_source": "regex"
        }
    elif "location" in query or "tower" in query or "where" in query:
        return {
            "intent": "tower_location",
            "target_number": target_number,
            "direction": "both",
            "metric": "both",
            "_source": "regex"
        }
    elif ("duration" in query or "long" in query or "time" in query) and target_number:
        return {
            "intent": "call_duration",
            "target_number": target_number,
            "direction": "both",
            "metric": "duration",
            "_source": "regex"
        }
    elif "timeline" in query or "activity" in query:
        return {
            "intent": "timeline",
            "target_number": target_number,
            "direction": "both",
            "metric": "both",
            "_source": "regex"
        }
    elif "common" in query or "network" in query:
        return {
            "intent": "common_contacts",
            "target_number": None,
            "direction": "both",
            "metric": "both",
            "_source": "regex"
        }
    
    return {"intent": "unknown", "target_number": target_number, "_source": "regex"}

def classify_intent(query: str) -> dict:
    print(f"DEBUG: Processing query: {query}")
    prompt = f"""
    You are an intent classification engine for a police telecom analytics tool.
    Classify the following user query AND output ONLY a valid JSON object matching this exact structure:
    {{
      "intent": "top_contact" | "call_frequency" | "tower_location" | "call_duration" | "common_contacts" | "timeline" | "unknown",
      "target_number": "<extracted ID or null>",
      "direction": "outgoing" | "incoming" | "both",
      "metric": "frequency" | "duration" | "both"
    }}
    
    Examples:
    - "Who does 1234567890 call the most?" -> {{"intent": "top_contact", "target_number": "1234567890", "direction": "outgoing", "metric": "both"}}
    - "freq for 9876543210" -> {{"intent": "call_frequency", "target_number": "9876543210", "direction": "both", "metric": "frequency"}}
    - "show me location history for 9876543210" -> {{"intent": "tower_location", "target_number": "9876543210", "direction": "both", "metric": "both"}}
    - "duration of calls for 111" -> {{"intent": "call_duration", "target_number": "111", "direction": "both", "metric": "duration"}}
    - "network of 111" -> {{"intent": "common_contacts", "target_number": "111", "direction": "both", "metric": "both"}}
    - "activity for 555" -> {{"intent": "timeline", "target_number": "555", "direction": "both", "metric": "both"}}
    
    Query: "{query}"
    """

    # 1. Try OpenRouter (if key exists)
    if OPENROUTER_API_KEY and "your_openrouter" not in OPENROUTER_API_KEY:
        print(f"DEBUG: Using OpenRouter API Key (Found)")
        try:
            response = requests.post(
                url="https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json"
                },
                data=json.dumps({
                    "model": "google/gemini-2.0-flash-001",
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "response_format": {"type": "json_object"}
                }),
                timeout=10
            )
            
            if response.status_code == 200:
                content = response.json()['choices'][0]['message']['content']
                print(f"DEBUG: OpenRouter success content: {content}")
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group())
            else:
                print(f"DEBUG: OpenRouter error status {response.status_code}: {response.text}")
        except Exception as e:
            print(f"DEBUG: OpenRouter exception: {str(e)}")

    # 2. Final Fallback: Regex (Handles basic queries even if API is down)
    print("DEBUG: Falling back to regex")
    return _regex_fallback(query)
