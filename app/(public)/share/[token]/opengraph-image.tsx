import { ImageResponse } from "next/og";
import { resolveSharedResult } from "@/lib/share";

export const size = {
  width: 1200,
  height: 630
};

export const contentType = "image/png";

export default async function OpenGraphImage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await resolveSharedResult(token);

  const title = shared?.result.title || "Wine Persona";
  const description = shared?.result.description || "Discover your wine personality.";
  const styles = shared?.result.recommendedStyles || ["Pinot Noir", "South African Chenin Blanc", "Syrah"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
          background:
            "radial-gradient(circle at 15% 10%, rgba(180,61,70,0.38), rgba(180,61,70,0) 45%), radial-gradient(circle at 85% 0%, rgba(93,18,40,0.42), rgba(93,18,40,0) 48%), linear-gradient(140deg, #19060d 0%, #2a0713 48%, #18050b 100%)",
          color: "#f7eef1",
          fontFamily: "Georgia"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "0.02em" }}>Wine Persona</div>
          <div
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.35)",
              borderRadius: 999,
              padding: "8px 14px",
              fontSize: 20
            }}
          >
            Share Result
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: 72, lineHeight: 1.05, fontWeight: 700, maxWidth: "950px" }}>{title}</div>
          <div style={{ fontSize: 30, lineHeight: 1.3, maxWidth: "980px", color: "rgba(247, 238, 241, 0.92)" }}>{description}</div>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {styles.map((style) => (
            <div
              key={style}
              style={{
                borderRadius: 999,
                border: "1px solid rgba(255, 255, 255, 0.45)",
                background: "rgba(255, 255, 255, 0.1)",
                padding: "10px 18px",
                fontSize: 22
              }}
            >
              {style}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size
    }
  );
}
