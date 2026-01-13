import React from "react";

interface ArcadeEmbedProps {
  src: string;
  title?: string;
}

export function ArcadeEmbed({ src, title }: ArcadeEmbedProps) {
  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        width: "100%",
        minHeight: "40vh",
        maxHeight: "65vh",
        aspectRatio: "16 / 9",
      }}
    >
      <iframe
        src={src}
        title={title || "Arcade walkthrough"}
        frameBorder="0"
        loading="lazy"
        allowFullScreen
        // Allow necessary capabilities for Arcade playback while keeping it inline
        allow="clipboard-write; fullscreen; autoplay; encrypted-media"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          colorScheme: "light",
        }}
      />
    </div>
  );
}
