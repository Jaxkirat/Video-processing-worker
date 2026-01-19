import { execSync } from "child_process";

export function clipVideo({ input, output, start, end }) {
    const range =
        start !== undefined && end !== undefined
            ? `-ss ${start} -to ${end}`
            : "";

    execSync(
        `ffmpeg -y ${range} -i "${input}" -c:v libx264 -preset fast -crf 23 -an "${output}"`,
        { stdio: "ignore" }
    );
}
