import os
import json
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq

app = Flask(__name__)
CORS(app)

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

VALID_CATEGORIES = [
    "Frontend", "Backend", "Design", "Data", "Content",
    "Smart Contract", "DevOps", "Mobile", "Other",
]
VALID_DIFFICULTIES = ["Easy", "Medium", "Hard"]


def _extract_json(raw: str) -> dict:
    cleaned = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
    cleaned = re.sub(r"<think>.*", "", cleaned, flags=re.DOTALL).strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned).strip()
    if cleaned:
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass
    match = re.search(r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", raw)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    raise RuntimeError("Could not extract valid JSON from LLM response")


@app.route('/', methods=['GET'])
@app.route('/health', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        "success": True,
        "data": {"status": "ok"},
        "message": "BountyFlow API Server is running"
    })


@app.route('/generate-bounty', methods=['POST'])
@app.route('/api/generate-bounty', methods=['POST'])
def generate_bounty():
    data = request.get_json(silent=True)
    if not data or "request" not in data:
        return jsonify({
            "success": False,
            "error": "Missing required field: 'request'"
        }), 400

    user_request = str(data["request"]).strip()
    if not user_request:
        return jsonify({
            "success": False,
            "error": "Request cannot be empty"
        }), 400

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return jsonify({
            "success": False,
            "error": "GROQ_API_KEY is not set. Please add GROQ_API_KEY in Vercel Project Settings -> Environment Variables."
        }), 500

    try:
        client = Groq(api_key=api_key)
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
        draft = _extract_json(raw)

        # Validation and fallbacks
        title = str(draft.get("title", "")).strip()[:80]
        desc = str(draft.get("description", "")).strip()[:500]
        skills = [str(s).strip() for s in draft.get("skills", []) if str(s).strip()][:5]

        try:
            reward = round(float(draft.get("reward", 1.0)), 4)
            reward = max(0.01, min(10.0, reward))
        except (ValueError, TypeError):
            reward = 1.0

        try:
            deadline = int(draft.get("deadline", 24))
            deadline = max(1, min(168, deadline))
        except (ValueError, TypeError):
            deadline = 24

        cat = draft.get("category", "Other")
        if cat not in VALID_CATEGORIES:
            cat = "Other"

        diff = draft.get("difficulty", "Medium")
        if diff not in VALID_DIFFICULTIES:
            diff = "Medium"

        sanitized = {
            "title": title or "Monad Bounty Task",
            "description": desc or user_request,
            "skills": skills or ["Monad", "Web3"],
            "reward": reward,
            "deadline": deadline,
            "category": cat,
            "difficulty": diff
        }

        return jsonify({
            "success": True,
            "data": sanitized,
            "message": "Bounty draft generated successfully"
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"AI generation error: {str(e)}"
        }), 500


if __name__ == '__main__':
    app.run(port=5000)
