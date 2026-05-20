// src/lib/platform-detect.ts
// Detecta em qual plataforma o app está rodando.
// Usado pelo hook use-submit-score para escolher o conector certo.

type Platform = "minipay" | "farcaster" | "browser";

export function detectPlatform(): Platform {
  if (typeof window === "undefined") return "browser";

  // MiniPay injeta isMiniPay no provider
  const eth = (window as Window & { ethereum?: Record<string, unknown> }).ethereum;
  if (eth?.isMiniPay) return "minipay";

  // Farcaster: o SDK marca window com contexto do mini-app
  const fc = (window as Window & { __farcaster?: unknown }).__farcaster;
  if (fc) return "farcaster";

  return "browser";
}

export function isMiniPay() {
  return detectPlatform() === "minipay";
}

export function isFarcaster() {
  return detectPlatform() === "farcaster";
}
