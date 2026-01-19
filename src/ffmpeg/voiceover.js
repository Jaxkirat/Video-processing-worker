import { execSync } from "child_process";

export function addVoiceover({ video, audio, output }) {
    execSync(
        `ffmpeg -y -i "${video}" -i "${audio}" -c:v copy -c:a aac -shortest "${output}"`,
        { stdio: "ignore" }
    );
}
