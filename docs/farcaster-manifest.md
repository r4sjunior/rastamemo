# Manifest do Mini App — Rasta Memo

Este documento reúne as informações necessárias para criar/atualizar o `farcaster.json`, o Manifest que registra o Mini App **Rasta Memo** e o vincula ao domínio. O Manifest funciona como o "DNS" do Mini App: informa aos clientes Farcaster o nome, ícone, funcionalidade do app e habilita integrações profundas com o ecossistema Farcaster.

## Domínio

| Campo | Valor |
|---|---|
| Domain | `https://cryptorastas.link` |

> ✅ **`basePath` confirmado no código: não existe.** `next.config.ts` não define `basePath`/`assetPrefix`, e `src/config/public-config.ts` monta `homeUrl` como `https://${canonicalDomain}` (domínio puro) e resolve as imagens de `public/` via `resolveImageUrl()`, que concatena o caminho relativo (`/app-hero.png` etc.) direto na raiz do domínio — nunca em `/game`. O manifest real do projeto já está em `src/app/.well-known/farcaster.json/route.ts`, servido em `https://cryptorastas.link/.well-known/farcaster.json`, consistente com `domain` = raiz.
>
> Ou seja: o sufixo `/game` informado inicialmente **não corresponde ao que o app serve hoje**. Todas as URLs abaixo foram ajustadas para a raiz do domínio. Se a intenção é que o Mini App realmente viva em `cryptorastas.link/game` (ex.: multi-zone/reverse proxy na frente do domínio), será necessário adicionar `basePath: "/game"` (e `assetPrefix`) em `next.config.ts` — o que hoje não existe.

---

## Identidade do App & Presença na Store

| Campo | Chave | Valor |
|---|---|---|
| App Name | `name` | Rasta Memo |
| App Icon | `iconUrl` | `https://9gfytnfmfqhgc9m3.public.blob.vercel-storage.com/LOGO.jpeg` |
| Subtitle | `subtitle` | Rasta Memory Card Game |
| Description | `description` | Match pairs of CryptoRastas cards in this 8-bit memory game. Flip cards, find matches, beat levels, and vibe to reggae music. OneLove inna Decentralized Style |
| Primary Category | `primaryCategory` | games |

---

## Visuais & Branding

| Campo | Chave | Valor |
|---|---|---|
| Screenshots | `screenshotUrls` | `https://cryptorastas.link/app-hero.png`, `https://cryptorastas.link/app-splash.png` |
| Preview Image | `imageUrl` | `https://cryptorastas.link/app-farcaster-image.png` |
| Hero Image | `heroImageUrl` | `https://9gfytnfmfqhgc9m3.public.blob.vercel-storage.com/LOGO.jpeg` |
| Splash Screen Image | `splashImageUrl` | `https://9gfytnfmfqhgc9m3.public.blob.vercel-storage.com/LOGO.jpeg` |
| Splash Background Color | `splashBackgroundColor` | `#1a3a1a` |

---

## Engajamento & Descoberta

| Campo | Chave | Valor |
|---|---|---|
| Search Tags (máx. 5) | `tags` | `game`, `memory`, `rasta`, `reggae`, `cards` |
| Marketing Tagline | `tagline` | Match the vibes, mon! |
| Button Title | `buttonTitle` | Open mini app |
| Social Share Title | `ogTitle` | Rasta Memo – Rasta Memory Card Game |
| Social Share Description | `ogDescription` | Match pairs of CryptoRastas cards, beat levels, and vibe to reggae music. OneLove inna Decentralized Style. |
| Social Share Image | `ogImageUrl` | `https://cryptorastas.link/app-farcaster-image.png` |
| Cast Share URL | `castShareUrl` | `https://warpcast.com/~/compose?text=Check+out+this+app` |

---

## Configuração Técnica

| Campo | Chave | Valor |
|---|---|---|
| Home URL | `homeUrl` | `https://cryptorastas.link` |
| Webhook URL | `webhookUrl` | `https://cryptorastas.link/api/webhook` ⚠️ (não confirmado — veja nota) |

---

## ✅ Correções aplicadas

1. **URLs com `https://` duplicado**: os campos `imageUrl`, `homeUrl` e `webhookUrl` estavam como `https://https://cryptorastas.link/...` — corrigido.
2. **`ogTitle` e `ogDescription`** estavam com placeholders de outro app ("AppName – Local News Fast" / "Get breaking news and updates from your community in real-time") — substituídos por textos do tema Rasta Memo.
3. **`screenshotUrls` e `ogImageUrl`** apontavam para `example.com` — substituídos pelas imagens reais já existentes em `public/` deste projeto (`app-farcaster-image.png`, `app-hero.png`, `app-splash.png`).
4. **`basePath` confirmado e todas as URLs ajustadas para a raiz do domínio**: verifiquei `next.config.ts` (sem `basePath`/`assetPrefix`) e `src/config/public-config.ts` (`homeUrl = https://${canonicalDomain}`, imagens resolvidas direto na raiz via `resolveImageUrl()`). O sufixo `/game` do domínio original não existe na configuração real do app — todas as URLs de `homeUrl`, `imageUrl`, `heroImageUrl`, `ogImageUrl` e `screenshotUrls` foram corrigidas para `https://cryptorastas.link/<arquivo>` (raiz), consistente com o manifest real do projeto em `src/app/.well-known/farcaster.json/route.ts`.

## ⚠️ Pontos em aberto

- **`/game` na intenção original**: se o plano é o Mini App viver em `cryptorastas.link/game` (ex.: multi-zone/reverse proxy), o código precisa de `basePath: "/game"` (e `assetPrefix`) em `next.config.ts`, que hoje não existe. Sem isso, o app roda na raiz do domínio.
- **`webhookUrl`**: não há rota `/api/webhook` neste repositório. O valor vem de uma env var opcional (`WEBHOOK_URL`, sem default) em `src/config/public-config.ts:152` — confirme com o time se esse endpoint existe em outro serviço ou se precisa ser criado antes de publicar o manifest.

---

## JSON do Manifest (`farcaster.json`)

```json
{
  "frame": {
    "version": "1",
    "name": "Rasta Memo",
    "iconUrl": "https://9gfytnfmfqhgc9m3.public.blob.vercel-storage.com/LOGO.jpeg",
    "subtitle": "Rasta Memory Card Game",
    "description": "Match pairs of CryptoRastas cards in this 8-bit memory game. Flip cards, find matches, beat levels, and vibe to reggae music. OneLove inna Decentralized Style",
    "primaryCategory": "games",
    "screenshotUrls": [
      "https://cryptorastas.link/app-hero.png",
      "https://cryptorastas.link/app-splash.png"
    ],
    "imageUrl": "https://cryptorastas.link/app-farcaster-image.png",
    "heroImageUrl": "https://9gfytnfmfqhgc9m3.public.blob.vercel-storage.com/LOGO.jpeg",
    "splashImageUrl": "https://9gfytnfmfqhgc9m3.public.blob.vercel-storage.com/LOGO.jpeg",
    "splashBackgroundColor": "#1a3a1a",
    "tags": ["game", "memory", "rasta", "reggae", "cards"],
    "tagline": "Match the vibes, mon!",
    "buttonTitle": "Open mini app",
    "ogTitle": "Rasta Memo – Rasta Memory Card Game",
    "ogDescription": "Match pairs of CryptoRastas cards, beat levels, and vibe to reggae music. OneLove inna Decentralized Style.",
    "ogImageUrl": "https://cryptorastas.link/app-farcaster-image.png",
    "castShareUrl": "https://warpcast.com/~/compose?text=Check+out+this+app",
    "homeUrl": "https://cryptorastas.link",
    "webhookUrl": "https://cryptorastas.link/api/webhook"
  }
}
```

> URLs de imagem confirmadas contra o código (`next.config.ts` sem `basePath`, `public-config.ts` resolve assets na raiz do domínio). O campo `webhookUrl` ainda depende de confirmação — veja "Pontos em aberto" acima.
