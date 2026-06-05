---
name: Gemini API setup for InfraLens
description: Gemini API key format, available models, and fallback strategy for this project
---

## Key
The GEMINI_API_KEY stored in Replit secrets starts with `AQ.Ab8RN`. This is valid but **not** the typical `AIza...` format — it is a newer API key format that works with google-generativeai.

## Available models (as of June 2026)
- `gemini-2.0-flash` ✓ (use this)
- `gemini-2.5-flash` ✓
- `gemini-1.5-flash` ✗ — returns 404 with this key

**Why:** The key was issued after 1.5-flash was deprecated for free-tier keys.

## Rate limits
Free-tier quota is low — the key hits `ResourceExhausted (429)` quickly during testing. This is expected and the 3-layer fallback (Gemini → Groq → rule-based) handles it gracefully.

**How to apply:** Always keep the rule-based fallback active. Do not remove the try/except wrapping in `ai_service._generate_with_fallback`.
