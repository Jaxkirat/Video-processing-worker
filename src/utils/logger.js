import fs from "fs";
import { LOGFILE } from "../config/constants.js";

export function log(msg) {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(LOGFILE, line);
    console.log(line.trim());
}
