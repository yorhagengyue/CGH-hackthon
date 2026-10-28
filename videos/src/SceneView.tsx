import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FADE, TITLE_HOLD } from "./theme";
import { Media } from "./components/Frames";
import { Caption, RoleCard } from "./components/Text";
import type { Scene } from "./scenes/types";

/// One feature: 1 s role card, then the footage with the two-layer caption.
/// Landscape: phone 92 % of the height in the right two thirds, caption column on the left;
/// browser 85 % of the width, caption overlaid bottom-left.
export const SceneView: React.FC<{ scene: Scene; portrait?: boolean }> = ({ scene, portrait }) => {
  const f = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const fade = interpolate(f, [0, FADE, durationInFrames - FADE, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleOut = interpolate(f, [TITLE_HOLD, TITLE_HOLD + FADE], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const phone = scene.media.frame === "phone";
  let mediaW: number, mediaH: number, left: number, top: number;
  if (portrait) { mediaW = phone ? 820 : 1000; mediaH = phone ? 1780 : 625; left = (width - mediaW) / 2; top = 120; }
  else if (phone) { mediaH = Math.round(height * 0.92); mediaW = Math.round(mediaH * 1206 / 2622); left = Math.round(width * 2 / 3 - mediaW / 2); top = Math.round((height - mediaH) / 2); }
  else { mediaW = Math.round(width * 0.85); mediaH = Math.round(mediaW * 900 / 1440) + 40; left = Math.round((width - mediaW) / 2); top = Math.round((height - mediaH) / 2); }
  return (
    <AbsoluteFill style={{ background: C.canvas, opacity: fade }}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: titleOut }}>
        <RoleCard role={scene.role} title={scene.title} icon={scene.icon} size={portrait ? 56 : 64} />
      </AbsoluteFill>
      {f >= TITLE_HOLD && (
        <AbsoluteFill>
          <div style={{ position: "absolute", left, top }}>
            <Media scene={scene} width={mediaW} height={mediaH} startFrame={TITLE_HOLD} />
          </div>
          {portrait ? (
            <div style={{ position: "absolute", left: 60, bottom: 90, width: width - 120 }}><Caption what={scene.what} why={scene.why} small startFrame={TITLE_HOLD + 6} /></div>
          ) : phone ? (
            <div style={{ position: "absolute", left: 72, top: 0, bottom: 0, width: left - 120, display: "flex", alignItems: "center" }}>
              <Caption what={scene.what} why={scene.why} column startFrame={TITLE_HOLD + 6} />
            </div>
          ) : (
            <div style={{ position: "absolute", left: 56, bottom: 44, width: 900 }}><Caption what={scene.what} why={scene.why} startFrame={TITLE_HOLD + 6} /></div>
          )}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
