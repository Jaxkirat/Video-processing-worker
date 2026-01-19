import express from "express";
import { PORT } from "./config/constants.js";
import { log } from "./utils/logger.js";

// routes (to be added next)
import healthRoute from "./routes/health.js";
import renderRoute from "./routes/render.js";
import filesRoute from "./routes/files.js";
import audioInfoRoute from "./routes/audioInfo.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

// routes
healthRoute(app);
filesRoute(app);
audioInfoRoute(app);
renderRoute(app);

// start
app.listen(PORT, () => {
  log(`Video worker running on port ${PORT}`);
});
