// src/lib/platform-detect.ts

type Platform = "minipay" | "farcaster" | "browser";

export function detectPlatform(): Platform {
  if (typeof window === "undefined") return "browser";

  // MiniPay injeta isMiniPay no provider Celo
  const eth = (window as any).ethereum;
  if (eth?.isMiniPay) return "minipay";

  // Farcaster SDK marca window com __farcaster
  if ((window as any).__farcaster) return "farcaster";

  return "browser";
}
