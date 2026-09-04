import os, time, json, base64, requests, redis, logging, threading
from http.server import HTTPServer, BaseHTTPRequestHandler

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
HF_TOKEN  = os.getenv("HF_TOKEN", "")
HF_URL    = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-refiner-1.0"

r = redis.from_url(REDIS_URL, decode_responses=False)

class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"worker ok")
    def log_message(self, *args):
        pass

def call_hf(image_b64, prompt):
    headers  = {"Authorization": f"Bearer {HF_TOKEN}"}
    img_bytes = base64.b64decode(image_b64)
    resp = requests.post(HF_URL, headers=headers, data=img_bytes,
                         params={"inputs": prompt}, timeout=120)
    if resp.status_code == 503:
        log.info("Model loading, waiting 25s...")
        time.sleep(25)
        resp = requests.post(HF_URL, headers=headers, data=img_bytes,
                             params={"inputs": prompt}, timeout=120)
    if resp.status_code == 200:
        return "data:image/png;base64," + base64.b64encode(resp.content).decode()
    raise Exception(f"HF API {resp.status_code}: {resp.text[:200]}")

def process_job(job_id):
    raw = r.get(f"job:{job_id}")
    if not raw:
        return
    job = json.loads(raw)
    job["status"] = "processing"
    r.setex(f"job:{job_id}", 3600, json.dumps(job))
    try:
        log.info(f"Job {job_id[:8]} — {job['prompt'][:50]}")
        result_url       = call_hf(job["image_b64"], job["prompt"])
        job["status"]     = "done"
        job["result_url"] = result_url
        job["image_b64"]  = ""
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
    # Start health check server so Render doesn't kill us
    port = int(os.getenv("PORT", 8080))
    server = HTTPServer(("0.0.0.0", port), HealthHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    log.info(f"Health server on port {port}")
    run_worker()

if __name__ == "__main__":
    main()