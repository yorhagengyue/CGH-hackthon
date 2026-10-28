import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Manrope";
import { C, FADE, SPRING } from "../theme";
import { Icon } from "./Icon";
import type { IconName, Role } from "../scenes/types";

const { fontFamily } = loadFont("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] });
export const font = fontFamily;

/// 1 s role card: icon slides in from the left, title, and a blue underline that grows to 100%.
export const RoleCard: React.FC<{ role: Role; title: string; icon: IconName; size?: number }> = ({ role, title, icon, size = 64 }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: SPRING, durationInFrames: 18 });
  const slide = interpolate(s, [0, 1], [-40, 0]);
  const underline = interpolate(f, [6, 22], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28, fontFamily }}>
      <div style={{ width: size * 1.6, height: size * 1.6, borderRadius: size * 0.5, background: C.mist, display: "flex", alignItems: "center", justifyContent: "center", transform: `translateX(${slide}px)`, opacity: s }}>
        <Icon name={icon} size={size * 0.8} />
      </div>
      <div style={{ opacity: s }}>
        <div style={{ fontSize: size * 0.4, fontWeight: 700, color: C.blue, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>{role}</div>
        <div style={{ fontSize: size, fontWeight: 800, color: C.ink, letterSpacing: -1, lineHeight: 1.1 }}>{title}</div>
        <div style={{ height: 5, width: `${underline}%`, background: C.blue, borderRadius: 3, marginTop: 12 }} />
      </div>
    </div>
  );
};

/// Two-layer caption: bold "what" fades in as a whole, the "why" appears word by word (40 ms apart).
export const Caption: React.FC<{ what: string; why: string; small?: boolean; column?: boolean; startFrame?: number }> = ({ what, why, small, column, startFrame = 0 }) => {
  const f = useCurrentFrame() - startFrame;
  const o = interpolate(f, [0, FADE], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const words = why.split(" ");
  return (
    <div style={{ fontFamily, opacity: o, background: "rgba(20,38,58,0.86)", color: "#fff", padding: column ? "28px 30px" : small ? "16px 22px" : "20px 28px", borderRadius: 14, borderLeft: `6px solid ${C.sky}`, width: "100%", boxSizing: "border-box" }}>
      <div style={{ fontSize: column ? 44 : small ? 34 : 42, fontWeight: 800, lineHeight: 1.22, letterSpacing: -0.3 }}>{what}</div>
      <div style={{ fontSize: column ? 30 : small ? 26 : 30, fontWeight: 500, lineHeight: 1.4, marginTop: column ? 16 : 8, color: "rgba(255,255,255,0.88)" }}>
        {words.map((w, i) => {
          const wo = interpolate(f, [FADE + i * 1.2, FADE + i * 1.2 + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return <span key={i} style={{ opacity: wo }}>{w} </span>;
        })}
      </div>
    </div>
  );
};

export const Big: React.FC<{ children: React.ReactNode; size?: number; color?: string; weight?: number; style?: React.CSSProperties }> = ({ children, size = 64, color = C.ink, weight = 800, style }) => (
  <div style={{ fontFamily, fontSize: size, fontWeight: weight, color, letterSpacing: -1, lineHeight: 1.15, ...style }}>{children}</div>
);
export const Small: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }> = ({ children, size = 28, color = C.muted, style }) => (
  <div style={{ fontFamily, fontSize: size, fontWeight: 500, color, lineHeight: 1.35, ...style }}>{children}</div>
);

/// Title words fade in and rise one after another.
export const WordRise: React.FC<{ text: string; size?: number; color?: string; delay?: number; weight?: number }> = ({ text, size = 72, color = C.ink, delay = 0, weight = 800 }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ fontFamily, fontSize: size, fontWeight: weight, color, letterSpacing: -1.5, lineHeight: 1.15, display: "flex", flexWrap: "wrap", gap: "0 0.28em", justifyContent: "center" }}>
      {text.split(" ").map((w, i) => {
        const t = f - delay - i * 4;
        const o = interpolate(t, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const y = interpolate(t, [0, 10], [14, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return <span key={i} style={{ opacity: o, transform: `translateY(${y}px)`, display: "inline-block" }}>{w}</span>;
      })}
    </div>
  );
};
