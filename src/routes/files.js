import express from "express";
import { JOBS_DIR } from "../config/constants.js";

export default function filesRoute(app) {
    app.use("/files", express.static(JOBS_DIR));
}
