import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Peek Media · Haz que te vean. Haz que te recuerden.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const [font, icon] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/SpaceGrotesk-Bold.ttf")),
    readFile(join(process.cwd(), "src/app/icon.png")),
  ]);
  const iconSrc = `data:image/png;base64,${icon.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#FFFFFF", padding: 72, fontFamily: "Space Grotesk", color: "#0B1F33" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={iconSrc} width={88} height={88} alt="" />
          <div style={{ fontSize: 44, letterSpacing: -1 }}>peek media</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 104, lineHeight: 0.92, letterSpacing: -4 }}>
          <div style={{ display: "flex" }}>
            Haz que te&nbsp;
            <span style={{ display: "flex", borderBottom: "22px solid #21C4D6", lineHeight: 0.8 }}>vean.</span>
          </div>
          <div>Haz que te recuerden.</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30 }}>
          <div style={{ width: 18, height: 18, borderRadius: 999, background: "#FF5A5F" }} />
          Marketing digital · Santo Domingo, RD
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Space Grotesk", data: font, style: "normal", weight: 700 }] },
  );
}
