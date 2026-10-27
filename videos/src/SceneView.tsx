import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FADE, TITLE_HOLD } from "./theme";
import { Media } from "./components/Frames";
import { Caption, TitleCard } from "./components/Text";
import type { Scene } from "./scenes";

/// One feature: 1 s title card, then the footage with a caption. Fades in and out over 300 ms.
export const SceneView: React.FC<{ scene: Scene; portrait?: boolean }> = ({ scene, portrait }) => {
  const f = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const fade = interpolate(f, [0, FADE, durationInFrames - FADE, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleOut = interpolate(f, [TITLE_HOLD, TITLE_HOLD + FADE], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const mediaIn = interpolate(f, [TITLE_HOLD, TITLE_HOLD + FADE], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const push = interpolate(f, [TITLE_HOLD, durationInFrames], [1, 1.02], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }); // a barely visible push-in

  const phone = scene.media.frame === "phone";
  // Landscape: phone on the right third, caption on the left; browser centred with the caption below it.
  const mediaW = portrait ? (phone ? 820 : 1000) : (phone ? 440 : 1310);
  const mediaH = portrait ? (phone ? 1780 : 625) : (phone ? 956 : 820);
  const mediaLeft = portrait ? (width - mediaW) / 2 : (phone ? 1280 : (width - mediaW) / 2);
  const mediaTop = portrait ? 120 : (phone ? 62 : 48);

  return (
    <AbsoluteFill style={{ background: C.canvas, opacity: fade }}>
      {/* title card */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: titleOut }}>
        <TitleCard title={scene.title} icon={scene.icon} size={portrait ? 56 : 64} />
      </AbsoluteFill>
      {/* footage */}
      <AbsoluteFill style={{ opacity: mediaIn }}>
        <div style={{ position: "absolute", left: mediaLeft, top: mediaTop, transform: `scale(${push})`, transformOrigin: "center" }}>
          <Media scene={scene} width={mediaW} height={mediaH} />
        </div>
        <div style={{ position: "absolute", left: portrait ? 60 : 110, bottom: portrait ? 90 : (phone ? 120 : 70), width: portrait ? width - 120 : (phone ? 1000 : 1310) }}>
          <Caption text={scene.caption} small={portrait} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
