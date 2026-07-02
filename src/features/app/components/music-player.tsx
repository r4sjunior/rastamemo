"use client";
// src/features/app/components/music-player.tsx
//
// Player de música da playlist do Audius (CryptoRastas Family).
// - Toca em ordem ALEATÓRIA
// - Começa só quando isStarted = true (após a 1ª carta)
// - O mute do jogo (isMuted) pausa/dá play de verdade (áudio nativo)
// - Mostra "♪ nome da música — artista" embaixo
//
// Usa <audio> nativo (não iframe) para ter controle real. As faixas vêm da
// API pública do Audius via use-audius-playlist.

import { useEffect, useRef, useState, useCallback, memo } from "react";
import { useAudiusPlaylist } from "@/hooks/use-audius-playlist";

type Props = {
  isMuted: boolean;
  isStarted: boolean;
};

function MusicPlayerComponent({ isMuted, isStarted }: Props) {
  const { tracks, loading } = useAudiusPlaylist();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [index, setIndex] = useState(0);

  // Sorteia a faixa inicial quando a playlist carrega
  useEffect(() => {
    if (tracks.length > 0) {
      setIndex(Math.floor(Math.random() * tracks.length));
    }
  }, [tracks.length]);

  // Sorteia a próxima faixa (sem repetir a atual)
  const pickNext = useCallback(() => {
    setIndex(prev => {
      if (tracks.length <= 1) return prev;
      let next = Math.floor(Math.random() * tracks.length);
      if (next === prev) next = (next + 1) % tracks.length;
      return next;
    });
  }, [tracks.length]);

  // Quando troca de faixa: carrega e toca (se já iniciado e não mutado)
  useEffect(() => {
    const a = audioRef.current;
    if (!a || tracks.length === 0) return;
    a.load();
    if (isStarted && !isMuted) a.play().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, tracks.length]);

  // Sincroniza play/pause com isStarted + isMuted
  useEffect(() => {
    const a = audioRef.current;
    if (!a || tracks.length === 0) return;
    if (isStarted && !isMuted) {
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  }, [isStarted, isMuted, tracks.length]);

  const current = tracks[index];

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
      {/* áudio nativo controlável (mute de verdade) */}
      <audio
        ref={audioRef}
        src={current?.streamUrl}
        onEnded={pickNext}
        preload="none"
        loop={false}
      />

      {/* Now playing — nome da música e artista */}
      {isStarted && current && (
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "6px",
            color: "#4CAF50",
            textAlign: "center",
            lineHeight: 1.6,
            maxWidth: "90%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            opacity: isMuted ? 0.4 : 1,
            transition: "opacity 0.3s",
          }}
          title={`${current.title} — ${current.artist}`}
        >
          {isMuted ? "🔇" : "♪"} {current.title} — {current.artist}
        </div>
      )}
      {isStarted && loading && (
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "6px", color: "#2d5a2d" }}>
          ♪ carregando playlist...
        </div>
      )}
    </div>
  );
}

// memo evita re-render durante a partida (só re-renderiza se props mudarem)
export const MusicPlayer = memo(MusicPlayerComponent);
