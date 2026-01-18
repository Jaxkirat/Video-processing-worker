import express from "express";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = 3000;
const BASE_URL = "https://video-worker.reechout.in";
const JOBS_DIR = "/opt/video-worker/jobs";
const LOGFILE = "/var/log/video-worker.log";

/* =========================
   BOOTSTRAP
   ========================= */

fs.mkdirSync(JOBS_DIR, { recursive: true });
fs.mkdirSync(path.dirname(LOGFILE), { recursive: true });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LOGFILE, line);
  console.log(line.trim());
}

/* =========================
   PROVIDER DETECTION
   ========================= */

function detectProvider(url) {
  if (url.includes("videos.pexels.com")) return "pexels";
  if (url.includes("pixabay.com") || url.includes("cdn.pixabay.com")) return "pixabay";
  if (url.includes("mixkit.co")) return "mixkit";
  return "generic";
}

/* =========================
   PROVIDER-AWARE DOWNLOAD
   ========================= */

function downloadVideo(url, outputPath) {
  const provider = detectProvider(url);
  log(`Downloading from provider: ${provider}`);

  let headers = [];

  switch (provider) {
    case "pexels":
      headers = [
        '-H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)"',
        '-H "Accept: video/mp4,video/*;q=0.9,*/*;q=0.8"',
        '-H "Referer: https://www.pexels.com/"'
      ];
      break;

    case "pixabay":
    case "mixkit":
    case "generic":
    default:
      headers = [
        '-H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)"'
      ];
  }

  const cmd = `curl -L ${headers.join(" ")} "${url}" -o "${outputPath}"`;
  execSync(cmd, { stdio: "ignore" });

  // Validate download (block HTML / error pages)
  const stats = fs.statSync(outputPath);
  if (stats.size < 200 * 1024) {
    throw new Error(
      `Download failed or blocked (size=${stats.size} bytes, provider=${provider})`
    );
  }
}

/* =========================
   ROUTES
   ========================= */

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

// serve rendered files
app.use("/files", express.static(JOBS_DIR));

/* =========================
   RENDER ENDPOINT
   ========================= */

app.post("/render", async (req, res) => {
  try {
    const jobId = Date.now().toString();
    const jobDir = path.join(JOBS_DIR, jobId);
    fs.mkdirSync(jobDir, { recursive: true });

    const { clips = [], voiceover } = req.body;

    if (!voiceover) {
      return res.status(400).json({ error: "voiceover is required" });
    }

    if (!Array.isArray(clips) || clips.length === 0) {
      return res.status(400).json({ error: "at least one clip is required" });
    }

    const clipOutputs = [];

    /* ---------- DOWNLOAD + CLIP ---------- */
    for (let i = 0; i < clips.length; i++) {
      const { url, start, end } = clips[i];

      if (!url) {
        throw new Error(`Clip ${i} missing url`);
      }

      const source = path.join(jobDir, `source_${i}.mp4`);
      const clipped = path.join(jobDir, `clip_${i}.mp4`);

      downloadVideo(url, source);

      const range =
        start !== undefined && end !== undefined
          ? `-ss ${start} -to ${end}`
          : "";

      execSync(
        `ffmpeg -y ${range} -i "${source}" -c:v libx264 -preset fast -crf 23 -an "${clipped}"`,
        { stdio: "ignore" }
      );

      clipOutputs.push(clipped);
    }

    /* ---------- CONCAT ---------- */
    const listFile = path.join(jobDir, "concat.txt");
    fs.writeFileSync(
      listFile,
      clipOutputs.map(f => `file '${f}'`).join("\n")
    );

    const merged = path.join(jobDir, "merged.mp4");
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${merged}"`,
      { stdio: "ignore" }
    );

    /* ---------- VOICEOVER ---------- */
    const voicePath = path.join(jobDir, "voice.mp3");
    execSync(`curl -L "${voiceover}" -o "${voicePath}"`, { stdio: "ignore" });

    const finalPath = path.join(jobDir, "final.mp4");
    execSync(
      `ffmpeg -y -i "${merged}" -i "${voicePath}" -c:v copy -c:a aac -shortest "${finalPath}"`,
      { stdio: "ignore" }
    );

    log(`Job ${jobId} completed successfully`);

    res.json({
      jobId,
      status: "done",
      video_url: `${BASE_URL}/files/${jobId}/final.mp4`
    });

  } catch (err) {
    log(`ERROR: ${err.message}`);
    res.status(500).json({
      error: "render failed",
      details: err.message
    });
  }
});

/* =========================
   START
   ========================= */

app.listen(PORT, () => {
  log(`Video worker running on port ${PORT}`);
});
