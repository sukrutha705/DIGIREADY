import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DigiReady — Indian Citizen Application Readiness Platform",
    short_name: "DigiReady",
    description:
      "Know what you need. Check what you have. Detect conflicts. Fix issues. Know when you're ready to apply.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#2563eb",
    orientation: "portrait",
    categories: ["government", "productivity", "utilities", "education"],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
