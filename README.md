# AI Photo Editor

> Edit photos with natural language — describe what you want, AI does the rest.

**Live demo:** https://ai-photo-editor.onrender.com
**Built by:** Pranjal ([@Pranjal702](https://github.com/Pranjal702))

---

## Architecture

```
Browser → Ingress → Frontend (React + Nginx)
                  → Backend (FastAPI) → Redis Queue → Worker (Python + HF API)
```

## Where do uploaded photos go? Is it safe?

Images are **never written to disk**:
1. Upload → held in FastAPI RAM
2. Encoded to base64 → stored in Redis with **1-hour auto-delete TTL**
3. Worker sends to Hugging Face API over **HTTPS** (encrypted)
4. Image bytes **wiped from Redis immediately** after processing
5. Result returned as base64 data URL — **never saved anywhere permanently**

## Stack — 100% free & open source

| Service | Tech |
|---------|------|
| Frontend | React 18 + Vite + Nginx |
| Backend | FastAPI + Python 3.11 |
| AI | Hugging Face Inference API (free tier) |
| Queue | Redis 7 |
| Containers | Docker |
| Kubernetes | kind (local) |
| Hosting | Render.com (free) |
| CI/CD | GitHub Actions |

## Run locally

```bash
# Get a free token at huggingface.co/settings/tokens
export HF_TOKEN=hf_your_token_here
docker compose up --build
# Open http://localhost:3000
```

## Kubernetes concepts used

- Deployments, StatefulSet, Services, Ingress
- ConfigMaps, Secrets, Resource limits
- Liveness & readiness probes
- Horizontal Pod Autoscaler
