import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FADE, TITLE_HOLD } from "./theme";
import { Media } from "./components/Frames";
import { Caption, RoleCard } from "./components/Text";
import type { Scene } from "./scenes/types";

/// One feature: 1 s role card, then the footage with the two-layer caption. Fades in and out.
export const SceneView: React.FC<{ scene: Scene; portrait?: boolean }> = ({ scene, portrait }) => {
  const f = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();
  const fade = interpolate(f, [0, FADE, durationInFrames - FADE, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleOut = interpolate(f, [TITLE_HOLD, TITLE_HOLD + FADE], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const phone = scene.media.frame === "phone";
  const mediaW = portrait ? (phone ? 820 : 1000) : (phone ? 440 : 1310);
  const mediaH = portrait ? (phone ? 1780 : 625) : (phone ? 956 : 820);
  const mediaLeft = portrait ? (width - mediaW) / 2 : (phone ? 1280 : (width - mediaW) / 2);
  const mediaTop = portrait ? 120 : (phone ? 62 : 48);
  return (
    <AbsoluteFill style={{ background: C.canvas, opacity: fade }}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: titleOut }}>
        <RoleCard role={scene.role} title={scene.title} icon={scene.icon} size={portrait ? 56 : 64} />
      </AbsoluteFill>
      {f >= TITLE_HOLD && (
        <AbsoluteFill>
          <div style={{ position: "absolute", left: mediaLeft, top: mediaTop }}>
            <Media scene={scene} width={mediaW} height={mediaH} startFrame={TITLE_HOLD} />
          </div>
          <div style={{ position: "absolute", left: portrait ? 60 : 110, bottom: portrait ? 90 : (phone ? 120 : 64), width: portrait ? width - 120 : (phone ? 1040 : 1310) }}>
            <Caption what={scene.what} why={scene.why} small={portrait} startFrame={TITLE_HOLD + 6} />
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
