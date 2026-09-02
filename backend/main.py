import uuid, os, base64, json
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import redis

app = FastAPI(title="AI Photo Editor API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
r = redis.from_url(REDIS_URL, decode_responses=False)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/edit")
async def edit_photo(image: UploadFile = File(...), prompt: str = Form(...)):
    img_bytes = await image.read()
    if len(img_bytes) > 15 * 1024 * 1024:
        raise HTTPException(400, "Image too large. Max 15MB.")

    job_id = str(uuid.uuid4())
    job = {
        "job_id": job_id,
        "prompt": prompt,
        "image_b64": base64.b64encode(img_bytes).decode(),
        "filename": image.filename or "image.png",
        "content_type": image.content_type or "image/png",
        "status": "pending",
    }
    # Store in Redis — auto-deleted after 1 hour. Never touches disk.
    r.setex(f"job:{job_id}", 3600, json.dumps(job))
    r.lpush("job_queue", job_id)
    return {"job_id": job_id, "status": "pending"}

@app.get("/result/{job_id}")
def get_result(job_id: str):
    raw = r.get(f"job:{job_id}")
    if not raw:
        raise HTTPException(404, "Job not found or expired.")
    job = json.loads(raw)
    resp = {"status": job["status"]}
    if job["status"] == "done":
        resp["result_url"] = job.get("result_url")
    if job["status"] == "error":
        resp["message"] = job.get("error_message", "Unknown error")
    return resp
