"""
AI Service — Groq LLM integration for bounty draft generation.

Calls Groq's chat completion API with a strict system prompt to produce
a structured JSON bounty draft from plain-English input.
"""

import json
import os
import re
from groq import Groq

SYSTEM_PROMPT = """You are a bounty drafting assistant for BountyFlow, a Monad blockchain bounty platform.

Given a plain-English task description, return ONE strict JSON object with these exact fields:
{
  "title": "8-80 character bounty title",
  "description": "30-500 character task description, plain text, no markdown",
  "skills": ["1 to 5 short skill tags relevant to the task"],
  "reward": a number for a modest Testnet reward in MON (e.g. 0.5, 1.0, 2.5, 5.0),
  "deadline": an integer for suggested deadline in hours (1 to 168),
  "category": "exactly one of: Frontend, Backend, Design, Data, Content, Smart Contract, DevOps, Mobile, Other",
  "difficulty": "exactly one of: Easy, Medium, Hard"
}

Rules:
- Return ONLY the JSON object. No surrounding text, no markdown fences, no explanation.
- Keep rewards modest and realistic for Testnet MON (0.01 to 10.0 range).
- Never claim you can control funds, approve payments, or interact with wallets.
- The creator always has final authority over the reward amount.
- Do not invent reviews, ratings, testimonials, or user counts.
- Category must be exactly one of the listed values.
- Difficulty must be exactly one of: Easy, Medium, Hard.
/no_think"""

# Validation constraints
TITLE_MIN = 8
TITLE_MAX = 80
DESC_MIN = 30
DESC_MAX = 500
SKILLS_MIN = 1
SKILLS_MAX = 5
REWARD_MIN = 0.01
REWARD_MAX = 10.0
DEADLINE_MIN = 1
DEADLINE_MAX = 168
VALID_CATEGORIES = [
    "Frontend", "Backend", "Design", "Data", "Content",
    "Smart Contract", "DevOps", "Mobile", "Other",
]
VALID_DIFFICULTIES = ["Easy", "Medium", "Hard"]


def _validate_draft(draft: dict) -> dict:
    """Validate and sanitize the LLM output against the agreed schema."""
    errors = []

    # Title
    title = draft.get("title", "")
    if not isinstance(title, str) or not (TITLE_MIN <= len(title.strip()) <= TITLE_MAX):
        errors.append(f"title must be {TITLE_MIN}-{TITLE_MAX} characters")
    else:
        draft["title"] = title.strip()

    # Description
    desc = draft.get("description", "")
    if not isinstance(desc, str) or not (DESC_MIN <= len(desc.strip()) <= DESC_MAX):
        errors.append(f"description must be {DESC_MIN}-{DESC_MAX} characters")
    else:
        draft["description"] = desc.strip()

    # Skills
    skills = draft.get("skills", [])
    if not isinstance(skills, list) or not (SKILLS_MIN <= len(skills) <= SKILLS_MAX):
        errors.append(f"skills must be a list of {SKILLS_MIN}-{SKILLS_MAX} items")
    else:
        draft["skills"] = [str(s).strip() for s in skills if str(s).strip()]

    # Reward (now a number, not string)
    reward = draft.get("reward")
    try:
        reward = float(reward)
        if not (REWARD_MIN <= reward <= REWARD_MAX):
            errors.append(f"reward must be between {REWARD_MIN} and {REWARD_MAX}")
        else:
            draft["reward"] = round(reward, 4)
    except (ValueError, TypeError):
        errors.append("reward must be a valid number")

    # Deadline (now just "deadline", not "suggestedDeadlineHours")
    deadline = draft.get("deadline")
    try:
        deadline = int(deadline)
        if not (DEADLINE_MIN <= deadline <= DEADLINE_MAX):
            errors.append(f"deadline must be between {DEADLINE_MIN} and {DEADLINE_MAX}")
        else:
            draft["deadline"] = deadline
    except (ValueError, TypeError):
        errors.append("deadline must be a positive integer")

    # Category
    category = draft.get("category", "")
    if category not in VALID_CATEGORIES:
        # Try to fuzzy match
        matched = [c for c in VALID_CATEGORIES if c.lower() == str(category).lower()]
        if matched:
            draft["category"] = matched[0]
        else:
            draft["category"] = "Other"

    # Difficulty
    difficulty = draft.get("difficulty", "")
    if difficulty not in VALID_DIFFICULTIES:
        matched = [d for d in VALID_DIFFICULTIES if d.lower() == str(difficulty).lower()]
        if matched:
            draft["difficulty"] = matched[0]
        else:
            draft["difficulty"] = "Medium"

    if errors:
        raise ValueError("; ".join(errors))

    return draft


def _extract_json(raw: str) -> dict:
    """Extract the first valid JSON object from LLM output, handling think tags and fences."""
    # Strip Qwen 3 thinking tags (may or may not be closed)
    cleaned = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
    # If think tag was never closed, strip everything from <think> onward
    cleaned = re.sub(r"<think>.*", "", cleaned, flags=re.DOTALL).strip()
    # Strip markdown fences
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    cleaned = cleaned.strip()

    # Try direct parse first
    if cleaned:
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

    # Fallback: find the first { ... } block anywhere in the original text
    match = re.search(r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", raw)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    raise RuntimeError(f"Could not extract valid JSON from LLM response (length={len(raw)})")


def generate_bounty_draft(user_request: str) -> dict:
    """
    Generate a structured bounty draft from a plain-English request.

    Args:
        user_request: The user's task description (1-1000 chars).

    Returns:
        A validated dict matching the AI-to-form JSON contract.

    Raises:
        ValueError: If input is invalid or LLM output fails validation.
        RuntimeError: If the LLM call or JSON parsing fails.
    """
    # Input validation
    if not user_request or not user_request.strip():
        raise ValueError("Request cannot be empty")

    user_request = user_request.strip()
    if len(user_request) > 1000:
        raise ValueError("Request must be 1000 characters or fewer")

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key == "your_groq_api_key_here":
        raise RuntimeError("GROQ_API_KEY is not configured")

    client = Groq(api_key=api_key)
    last_error = None

    # Retry once on failure (Qwen 3 can be intermittent with /no_think)
    for attempt in range(2):
        try:
            completion = client.chat.completions.create(
                model="qwen/qwen3.6-27b",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_request},
                ],
                temperature=0.4,
                max_tokens=1024,
            )

            raw = completion.choices[0].message.content.strip()
        except Exception as e:
            last_error = RuntimeError(f"LLM call failed: {str(e)}")
            continue

        try:
            draft = _extract_json(raw)
            return _validate_draft(draft)
        except (RuntimeError, ValueError) as e:
            last_error = e
            continue

    # Both attempts failed
    raise last_error

