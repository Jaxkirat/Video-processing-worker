export function detectProvider(url) {
    if (!url) return "generic";

    if (url.includes("videos.pexels.com")) return "pexels";
    if (url.includes("pixabay.com") || url.includes("cdn.pixabay.com")) return "pixabay";
    if (url.includes("mixkit.co")) return "mixkit";

    return "generic";
}
