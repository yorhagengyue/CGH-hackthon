import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, staticFile } from "remotion";
import { C } from "../theme";
import type { Scene } from "../scenes";

/// Media inside a phone or a browser frame, or bare.
export const Media: React.FC<{ scene: Scene; width: number; height: number }> = ({ scene, width, height }) => {
  const src = staticFile(scene.media.src);
  const inner = scene.media.kind === "video"
    ? <OffthreadVideo src={src} startFrom={Math.round((scene.media.offsetSeconds ?? 0) * 30)} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
    : <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  if (scene.media.frame === "phone") {
    const r = 56;
    return (
      <div style={{ width, height, borderRadius: r, background: "#0b0b0d", padding: 12, boxShadow: "0 24px 60px rgba(20,38,58,0.18)" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: r - 12, overflow: "hidden", background: C.canvas }}>{inner}</div>
      </div>
    );
  }
  if (scene.media.frame === "browser") {
    return (
      <div style={{ width, height, borderRadius: 16, overflow: "hidden", background: C.surface, boxShadow: "0 24px 60px rgba(20,38,58,0.14)", display: "flex", flexDirection: "column" }}>
        <div style={{ height: 40, background: "#EEF2F7", display: "flex", alignItems: "center", gap: 8, padding: "0 16px" }}>
          {["#E5E7EB", "#E5E7EB", "#E5E7EB"].map((c, i) => <div key={i} style={{ width: 11, height: 11, borderRadius: 6, background: c }} />)}
          <div style={{ marginLeft: 12, height: 22, flex: 1, maxWidth: 520, borderRadius: 6, background: "#fff", color: C.muted, fontSize: 13, display: "flex", alignItems: "center", padding: "0 10px" }}>cgh-physio-proms.vercel.app</div>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>{inner}</div>
      </div>
    );
  }
  return <div style={{ width, height, overflow: "hidden" }}>{inner}</div>;
};

export const Backdrop: React.FC = () => <AbsoluteFill style={{ background: C.canvas }} />;
