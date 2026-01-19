import { exec } from "child_process";

export function probeDuration(url) {
    return new Promise((resolve, reject) => {
        const cmd = `ffprobe -v error -show_entries format=duration -of json "${url}"`;

        exec(cmd, (err, stdout) => {
            if (err) {
                return reject(err);
            }

            try {
                const data = JSON.parse(stdout);
                if (!data.format || !data.format.duration) {
                    return reject(new Error("Duration not found"));
                }

                resolve(Number(data.format.duration));
            } catch (e) {
                reject(e);
            }
        });
    });
}
