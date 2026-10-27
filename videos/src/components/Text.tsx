import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/Manrope";
import { C, FADE } from "../theme";
import { Icon } from "./Icon";
import type { IconName } from "../scenes";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] });
export const font = fontFamily;

/// 1 s title card: icon + a few words, nothing else.
export const TitleCard: React.FC<{ title: string; icon: IconName; size?: number }> = ({ title, icon, size = 64 }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, FADE], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(f, [0, FADE], [8, 0], { extrapolateRight: "clamp" });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28, opacity: o, transform: `translateY(${y}px)`, fontFamily }}>
      <div style={{ width: size * 1.6, height: size * 1.6, borderRadius: size * 0.5, background: C.mist, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={size * 0.8} />
      </div>
      <div style={{ fontSize: size, fontWeight: 800, color: C.ink, letterSpacing: -1 }}>{title}</div>
    </div>
  );
};

/// One sentence, bottom left, 60 characters a line at most.
export const Caption: React.FC<{ text: string; small?: boolean }> = ({ text, small }) => (
  <div style={{ fontFamily, fontSize: small ? 30 : 36, lineHeight: 1.35, fontWeight: 600, color: C.ink, width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.92)", padding: "18px 26px", borderRadius: 16, borderLeft: `6px solid ${C.blue}` }}>
    {text}
  </div>
);

export const Big: React.FC<{ children: React.ReactNode; size?: number; color?: string; weight?: number }> = ({ children, size = 64, color = C.ink, weight = 800 }) => (
  <div style={{ fontFamily, fontSize: size, fontWeight: weight, color, letterSpacing: -1 }}>{children}</div>
);
export const Small: React.FC<{ children: React.ReactNode; size?: number; color?: string }> = ({ children, size = 28, color = C.muted }) => (
  <div style={{ fontFamily, fontSize: size, fontWeight: 500, color }}>{children}</div>
);
