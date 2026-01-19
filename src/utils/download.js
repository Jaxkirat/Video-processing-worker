import fs from "fs";
import { execSync } from "child_process";
import { detectProvider } from "./providers.js";
import { log } from "./logger.js";

export function downloadVideo(url, outputPath) {
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

    // Validate download (block HTML/error pages)
    const stats = fs.statSync(outputPath);
    if (stats.size < 200 * 1024) {
        throw new Error(
            `Download failed or blocked (size=${stats.size} bytes, provider=${provider})`
        );
    }
}
