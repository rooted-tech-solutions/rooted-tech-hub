import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

// Built with next/og, which ships with Next — no extra dependency, and the
// card is generated at build time rather than maintained as a static asset.
export const runtime = "edge";
export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(150deg, #E8F3EC 0%, #F4FAF6 55%, #FFFFFF 100%)",
          padding: 80,
        }}
      >
        <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: "#2D6A4F" }}>
          {SITE.name}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 76,
            fontWeight: 700,
            color: "#12241C",
            lineHeight: 1.1,
            letterSpacing: -2,
          }}
        >
          <span>Software that fits</span>
          <span>how you work.</span>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#4A5A52" }}>
          Custom software for businesses that have outgrown spreadsheets
        </div>
      </div>
    ),
    size,
  );
}
