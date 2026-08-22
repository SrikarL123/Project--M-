# Backend Tests

This directory will hold automated test files for the backend API.

## Manual Test Commands

```bash
# Health check
curl http://localhost:5000/health

# AI bounty generation
curl -X POST http://localhost:5000/generate-bounty \
  -H "Content-Type: application/json" \
  -d '{"request": "Analyze my sales CSV and give five insights."}'

# Create bounty
curl -X POST http://localhost:5000/bounties \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Bounty", "description": "A test task for the bounty platform", "reward": "1.0", "creator": "0x1234...", "skills": ["Python"]}'
```
