import os, time, json, base64, requests, redis, logging, threading
from http.server import HTTPServer, BaseHTTPRequestHandler

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)

REDIS_URL      = os.getenv("REDIS_URL", "redis://redis:6379")
CF_TOKEN       = os.getenv("CF_TOKEN", "")
CF_ACCOUNT_ID  = os.getenv("CF_ACCOUNT_ID", "")

# Cloudflare Workers AI - image-to-image model (free 100k requests/day)
CF_AI_URL = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/ai/run/@cf/runwayml/stable-diffusion-v1-5-img2img"

r = redis.from_url(REDIS_URL, decode_responses=False)

class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"worker ok")
    def log_message(self, *args):
        pass

def call_cloudflare(image_b64: str, prompt: str) -> str:
    headers = {
        "Authorization": f"Bearer {CF_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "prompt": prompt,
        "image": [int(b) for b in base64.b64decode(image_b64)],
        "strength": 0.75,
        "num_steps": 20,
    }
    resp = requests.post(CF_AI_URL, headers=headers, json=payload, timeout=120)
    if resp.status_code == 200:
        data = resp.json()
        if data.get("success") and data.get("result", {}).get("image"):
            return "data:image/png;base64," + data["result"]["image"]
        raise Exception(f"CF response unexpected: {str(data)[:200]}")
    raise Exception(f"CF API {resp.status_code}: {resp.text[:200]}")

def process_job(job_id: str):
    raw = r.get(f"job:{job_id}")
    if not raw:
        return
    job = json.loads(raw)
    job["status"] = "processing"
    r.setex(f"job:{job_id}", 3600, json.dumps(job))
    try:
        log.info(f"Job {job_id[:8]} — {job['prompt'][:50]}")
        result_url        = call_cloudflare(job["image_b64"], job["prompt"])
        job["status"]     = "done"
        job["result_url"] = result_url
        job["image_b64"]  = ""
        log.info(f"Job {job_id[:8]} done!")
    except Exception as e:
        log.error(f"Job {job_id[:8]} failed: {e}")
        job["status"]        = "error"
        job["error_message"] = str(e)
        job["image_b64"]     = ""
    r.setex(f"job:{job_id}", 3600, json.dumps(job))

def run_worker():
    log.info("Worker ready — listening for jobs...")
    while True:
        try:
            item = r.brpop("job_queue", timeout=5)
            if item:
                _, jid = item
                process_job(jid.decode())
        except redis.exceptions.ConnectionError:
            log.error("Redis down, retrying in 3s...")
            time.sleep(3)
        except Exception as e:
            log.error(f"Unexpected: {e}")
            time.sleep(1)

def main():
    port = int(os.getenv("PORT", 8080))
    server = HTTPServer(("0.0.0.0", port), HealthHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    log.info(f"Health server on port {port}")
    run_worker()

if __name__ == "__main__":
    main()