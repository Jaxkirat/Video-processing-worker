import fs from "fs";
import path from "path";
import { BASE_URL, JOBS_DIR } from "../config/constants.js";
import { log } from "../utils/logger.js";
import { downloadVideo } from "../utils/download.js";

import { clipVideo } from "../ffmpeg/clip.js";
import { concatVideos } from "../ffmpeg/concat.js";
import { addVoiceover } from "../ffmpeg/voiceover.js";
import { burnCaptions } from "../ffmpeg/captions.js";
import { execSync } from "child_process";

export default function renderRoute(app) {
    app.post("/render", async (req, res) => {
        try {
            const jobId = Date.now().toString();
            const jobDir = path.join(JOBS_DIR, jobId);
            fs.mkdirSync(jobDir, { recursive: true });

            const { clips = [], voiceover, captions } = req.body;

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

                clipVideo({
                    input: source,
                    output: clipped,
                    start,
                    end
                });

                clipOutputs.push(clipped);
            }

            /* ---------- CONCAT ---------- */
            const merged = path.join(jobDir, "merged.mp4");

            concatVideos({
                clips: clipOutputs,
                output: merged,
                workDir: jobDir
            });

            /* ---------- VOICEOVER ---------- */
            const voicePath = path.join(jobDir, "voice.mp3");
            execSync(`curl -L "${voiceover}" -o "${voicePath}"`, { stdio: "ignore" });

            const finalPath = path.join(jobDir, "final.mp4");

            addVoiceover({
                video: merged,
                audio: voicePath,
                output: finalPath
            });

            /* ---------- CAPTIONS ---------- */
            let outputPath = finalPath;
            if (captions) {
                const assPath = path.join(jobDir, "captions.ass");
                execSync(`curl -L "${captions}" -o "${assPath}"`, { stdio: "ignore" });

                // Sanity check
                const stats = fs.statSync(assPath);
                if (stats.size < 100) {
                    throw new Error("Downloaded ASS file is invalid or empty");
                }

                const captionedPath = path.join(jobDir, "final_captioned.mp4");
                burnCaptions({
                    video: finalPath,
                    subs: assPath,
                    output: captionedPath
                });

                outputPath = captionedPath;
            }

            log(`Job ${jobId} completed successfully`);

            res.json({
                jobId,
                status: "done",
                video_url: `${BASE_URL}/files/${jobId}/${path.basename(outputPath)}`
            });

        } catch (err) {
            log(`ERROR: ${err.message}`);
            res.status(500).json({
                error: "render failed",
                details: err.message
            });
        }
    });
}
