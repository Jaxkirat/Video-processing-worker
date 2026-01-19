import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export async function audioInfo(req, res) {
    try {
        const { url: audio_url } = req.body;

        if (!audio_url) {
            return res.status(400).json({ error: "url is required" });
        }

        const tmpDir = "/tmp/audio-info";
        fs.mkdirSync(tmpDir, { recursive: true });

        const audioPath = path.join(tmpDir, `audio-${Date.now()}.mp3`);

        execSync(`curl -L "${audio_url}" -o "${audioPath}"`, { stdio: "ignore" });

        const stats = fs.statSync(audioPath);
        if (stats.size < 50 * 1024) {
            throw new Error("Downloaded audio file is too small");
        }

        const output = execSync(
            `ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${audioPath}"`
        ).toString().trim();

        const duration = Number(output);

        if (!Number.isFinite(duration)) {
            throw new Error("Failed to parse audio duration");
        }

        res.json({
            duration,
            audio_url
        });

    } catch (err) {
        res.status(500).json({
            error: "audio-info failed",
            details: err.message
        });
    }
}

export default function audioInfoRoute(app) {
    app.post("/audio-info", audioInfo);
}
