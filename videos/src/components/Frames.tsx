import React from "react";
import { Img, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, SPRING } from "../theme";
import type { Scene } from "../scenes/types";
import { font } from "./Text";

/// Media inside a phone or browser frame: scales 0.96 → 1 and rises 20 px as it fades in.
export const Media: React.FC<{ scene: Scene; width: number; height: number; startFrame: number }> = ({ scene, width, height, startFrame }) => {
  const f = useCurrentFrame() - startFrame; const { fps } = useVideoConfig();
  const s = spring({ frame: Math.max(0, f), fps, config: SPRING, durationInFrames: 22 });
  const src = staticFile(scene.media.src);
  const inner = scene.media.kind === "video"
    ? <OffthreadVideo src={src} startFrom={Math.round((scene.media.offsetSeconds ?? 0) * fps)} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
    : <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  const box = scene.media.frame === "phone" ? (
    <div style={{ width, height, borderRadius: 60, background: "#0b0b0d", padding: 12, boxShadow: "0 24px 60px rgba(20,38,58,0.18)", boxSizing: "border-box" }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 48, overflow: "hidden", background: C.canvas }}>{inner}</div>
    </div>
  ) : scene.media.frame === "browser" ? (
    <div style={{ width, height, borderRadius: 16, overflow: "hidden", background: C.surface, boxShadow: "0 24px 60px rgba(20,38,58,0.14)", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 40, background: "#EEF2F7", display: "flex", alignItems: "center", gap: 8, padding: "0 16px", flex: "0 0 auto" }}>
        {[0, 1, 2].map((i) => <div key={i} style={{ width: 11, height: 11, borderRadius: 6, background: "#D7DCE3" }} />)}
        <div style={{ marginLeft: 12, height: 22, flex: 1, maxWidth: 520, borderRadius: 6, background: "#fff", color: C.muted, fontSize: 13, fontFamily: font, display: "flex", alignItems: "center", padding: "0 10px" }}>cgh-physio-proms.vercel.app</div>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>{inner}</div>
    </div>
  ) : <div style={{ width, height, overflow: "hidden", borderRadius: 16 }}>{inner}</div>;
  return (
    <div style={{ position: "relative", width, height, transform: `scale(${interpolate(s, [0, 1], [0.96, 1])}) translateY(${interpolate(s, [0, 1], [20, 0])}px)`, opacity: s }}>
      {box}
      {scene.media.simulated && (
        <div style={{ position: "absolute", right: 18, bottom: 18, fontFamily: font, fontSize: 18, fontWeight: 600, color: C.muted, background: "rgba(255,255,255,0.9)", padding: "4px 10px", borderRadius: 8 }}>simulated</div>
      )}
      {/* highlight boxes and tap ripples, timed from the scene start */}
      {(scene.highlights ?? []).map((h, i) => {
        const a = h.at * fps, d = (h.for ?? 1.2) * fps;
        const o = interpolate(f, [a, a + 8, a + d, a + d + 10], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return <div key={"h" + i} style={{ position: "absolute", left: h.x * width, top: h.y * height, width: h.w * width, height: h.h * height, border: `3px solid ${C.sky}`, borderRadius: 14, boxShadow: `0 0 0 4px rgba(40,168,224,0.18)`, opacity: o, pointerEvents: "none" }} />;
      })}
      {(scene.zooms ?? []).map((z, i) => {
        const a = z.at * fps, d = (z.for ?? 3) * fps, k = 1.5;
        const o = interpolate(f, [a, a + 8, a + d, a + d + 8], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        if (o <= 0) return null;
        const bw = z.w * width * k, bh = z.h * height * k;
        const cx = (z.x + z.w / 2) * width, cy = (z.y + z.h / 2) * height;
        const left = Math.max(-40, Math.min(width - bw + 40, cx - bw / 2)), top = Math.max(0, Math.min(height - bh, cy - bh / 2));
        return (
          <div key={"z" + i} style={{ position: "absolute", left, top, width: bw, height: bh, borderRadius: 18, overflow: "hidden", border: `1px solid ${C.blue}`, boxShadow: "0 18px 50px rgba(20,38,58,0.28)", opacity: o, background: C.canvas, pointerEvents: "none" }}>
            <div style={{ position: "absolute", left: -z.x * width * k, top: -z.y * height * k, width: width * k, height: height * k }}>{inner}</div>
          </div>
        );
      })}
      {(scene.ripples ?? []).map((r, i) => {
        const a = r.at * fps; const t = f - a;
        const sc = interpolate(t, [0, 18], [0.3, 1.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const o = interpolate(t, [0, 4, 18], [0, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return <div key={"r" + i} style={{ position: "absolute", left: r.x * width - 30, top: r.y * height - 30, width: 60, height: 60, borderRadius: 30, border: `3px solid ${C.blue}`, transform: `scale(${sc})`, opacity: o, pointerEvents: "none" }} />;
      })}
    </div>
  );
};
