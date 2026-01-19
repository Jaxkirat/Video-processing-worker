import { execSync } from "child_process";

export function burnCaptions({ video, subs, output }) {
    execSync(
        `ffmpeg -y -i "${video}" -vf "ass=${subs}" -c:v libx264 -preset fast -crf 23 -c:a copy "${output}"`,
        { stdio: "ignore" }
    );
}
