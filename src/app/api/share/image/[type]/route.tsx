import { NextRequest } from "next/server";
import { publicConfig } from "@/config/public-config";
import {
  getShareImageResponse,
  parseNextRequestSearchParams,
} from "@/neynar-farcaster-sdk/nextjs";

// Cache for 1 hour - query strings create separate cache entries
export const revalidate = 3600;

const { appEnv, heroImageUrl, imageUrl } = publicConfig;

const showDevWarning = appEnv !== "production";

const LOGO_URL =
  "https://9gfytnfmfqhgc9m3.public.blob.vercel-storage.com/LOGO.jpeg";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;

  const searchParams = parseNextRequestSearchParams(request);
  const score = searchParams.score ?? "";
  const username = searchParams.username ?? "";
  const hasScore = score !== "" && score !== "0";

  return getShareImageResponse(
    { type, heroImageUrl, imageUrl, showDevWarning },
    // Full-bleed dark green background with centered logo + score overlay
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        backgroundColor: "#1a3a1a",
        position: "relative",
      }}
    >
      {/* Subtle rasta stripe top border */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 10,
        }}
      >
        <div style={{ display: "flex", flex: 1, backgroundColor: "#ef4444" }} />
        <div style={{ display: "flex", flex: 1, backgroundColor: "#FFD700" }} />
        <div style={{ display: "flex", flex: 1, backgroundColor: "#22c55e" }} />
      </div>

      {/* Subtle rasta stripe bottom border */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 10,
        }}
      >
        <div style={{ display: "flex", flex: 1, backgroundColor: "#22c55e" }} />
        <div style={{ display: "flex", flex: 1, backgroundColor: "#FFD700" }} />
        <div style={{ display: "flex", flex: 1, backgroundColor: "#ef4444" }} />
      </div>

      {/* Center card */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
          backgroundColor: "rgba(0,0,0,0.45)",
          borderRadius: 28,
          padding: "48px 64px",
          border: "3px solid rgba(255,215,0,0.55)",
          boxShadow:
            "0 0 60px rgba(255,215,0,0.15), 0 16px 48px rgba(0,0,0,0.6)",
        }}
      >
        {/* Logo */}
        <img
          src={LOGO_URL}
          width={220}
          height={220}
          style={{
            borderRadius: 20,
            border: "3px solid rgba(255,215,0,0.7)",
            boxShadow: "0 0 40px rgba(255,215,0,0.25)",
            objectFit: "cover",
          }}
        />

        {/* Game title */}
        <div
          style={{
            display: "flex",
            fontSize: 42,
            fontWeight: "bold",
            color: "#FFD700",
            letterSpacing: 6,
            textTransform: "uppercase",
            textShadow: "0 2px 12px rgba(0,0,0,0.5)",
          }}
        >
          RASTA MEMO
        </div>

        {/* Score block - only shown when a real score is present */}
        {hasScore ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            {/* Rasta pip row */}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "#ef4444",
                }}
              />
              <div
                style={{
                  display: "flex",
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "#FFD700",
                }}
              />
              <div
                style={{
                  display: "flex",
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "#22c55e",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 16,
                color: "#a3c4a3",
                letterSpacing: 4,
                textTransform: "uppercase",
                fontWeight: "bold",
              }}
            >
              SCORE
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 80,
                fontWeight: "bold",
                color: "white",
                lineHeight: 1,
                textShadow: "0 4px 16px rgba(0,0,0,0.5)",
              }}
            >
              {parseInt(score).toLocaleString()}
            </div>
            {username ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  color: "rgba(255,255,255,0.6)",
                  marginTop: 4,
                }}
              >
                by {username}
              </div>
            ) : (
              <div style={{ display: "flex" }} />
            )}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: "rgba(255,255,255,0.65)",
              letterSpacing: 2,
            }}
          >
            Can you match them all?
          </div>
        )}
      </div>
    </div>,
  );
}
