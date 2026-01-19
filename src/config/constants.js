import fs from "fs";
import path from "path";

export const PORT = 3000;
export const BASE_URL = "https://video-worker.reechout.in";
export const JOBS_DIR = "/opt/video-worker/jobs";
export const LOGFILE = "/var/log/video-worker.log";

/* bootstrap directories */
fs.mkdirSync(JOBS_DIR, { recursive: true });
fs.mkdirSync(path.dirname(LOGFILE), { recursive: true });
