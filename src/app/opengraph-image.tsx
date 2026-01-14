import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Rewind — Your Knowledge, Distilled";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0f0d 0%, #0d1412 50%, #0a0f0d 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background gradient orbs */}
        <div
          style={{
            position: "absolute",
            top: "-20%",
            left: "-10%",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(26, 154, 138, 0.15) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-30%",
            right: "-5%",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "32px",
            zIndex: 10,
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "120px",
              height: "120px",
              borderRadius: "28px",
              background: "linear-gradient(135deg, #1a9a8a 0%, #0f857a 100%)",
              boxShadow: "0 20px 60px rgba(26, 154, 138, 0.4)",
            }}
          >
            <svg
              width="60"
              height="60"
              viewBox="0 0 24 24"
              fill="none"
              style={{ color: "white" }}
            >
              <path
                d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z"
                fill="white"
              />
              <circle cx="18" cy="5" r="1.5" fill="white" opacity="0.8" />
              <circle cx="6" cy="15" r="1" fill="white" opacity="0.6" />
            </svg>
          </div>

          {/* Title */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <h1
              style={{
                fontSize: "72px",
                fontWeight: "800",
                letterSpacing: "-0.03em",
                background: "linear-gradient(135deg, #ffffff 0%, #a8e6e0 100%)",
                backgroundClip: "text",
                color: "transparent",
                margin: 0,
                lineHeight: 1,
              }}
            >
              Rewind
            </h1>
            <p
              style={{
                fontSize: "28px",
                fontWeight: "500",
                color: "rgba(255, 255, 255, 0.6)",
                margin: 0,
                letterSpacing: "0.02em",
              }}
            >
              Your Knowledge, Distilled
            </p>
          </div>

          {/* Tagline */}
          <p
            style={{
              fontSize: "20px",
              fontWeight: "400",
              color: "rgba(255, 255, 255, 0.4)",
              margin: 0,
              maxWidth: "600px",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            Transform newsletters, podcasts, and articles into actionable insights
          </p>
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, transparent, #1a9a8a, #f59e0b, #1a9a8a, transparent)",
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
