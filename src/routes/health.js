export default function healthRoute(app) {
    app.get("/health", (_, res) => {
        res.json({ status: "ok" });
    });
}
