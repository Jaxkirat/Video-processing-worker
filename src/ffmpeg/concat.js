import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export function concatVideos({ clips, output, workDir }) {
    const listFile = path.join(workDir, "concat.txt");

    fs.writeFileSync(
        listFile,
        clips.map(f => `file '${f}'`).join("\n")
    );

    execSync(
        `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${output}"`,
        { stdio: "ignore" }
    );
}
