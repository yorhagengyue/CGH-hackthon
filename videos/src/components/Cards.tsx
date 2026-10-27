import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, FADE } from "../theme";
import { Big, Small } from "./Text";

const fadeIn = (f: number) => interpolate(f, [0, FADE], [0, 1], { extrapolateRight: "clamp" });

/// 2 s: the CGH logo on white, then the product name.
export const Intro: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.surface, alignItems: "center", justifyContent: "center", gap: 36 }}>
      <Img src={staticFile("brand/cgh-logo.png")} style={{ width: 420, opacity: fadeIn(f) }} />
      <div style={{ opacity: interpolate(f, [12, 24], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }), textAlign: "center" }}>
        <Big size={56}>Physio PROMs</Big>
        <Small>Patient-reported outcomes before every physiotherapy visit</Small>
      </div>
    </AbsoluteFill>
  );
};

/// Three numbers, then the address and the two repositories.
export const Outro: React.FC<{ portrait?: boolean }> = ({ portrait }) => {
  const f = useCurrentFrame();
  const nums: [string, string][] = [["2 min", "to answer"], ["7 + 1 days", "SMS reminders before the visit"], ["0 paper", "forms to transcribe"]];
  return (
    <AbsoluteFill style={{ background: C.surface, alignItems: "center", justifyContent: "center", gap: portrait ? 56 : 72 }}>
      <div style={{ display: "flex", flexDirection: portrait ? "column" : "row", gap: portrait ? 40 : 110 }}>
        {nums.map(([n, l], i) => (
          <div key={n} style={{ opacity: interpolate(f, [i * 10, i * 10 + FADE], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }), textAlign: "center" }}>
            <Big size={portrait ? 88 : 96} color={C.blue}>{n}</Big>
            <Small size={30}>{l}</Small>
          </div>
        ))}
      </div>
      <div style={{ opacity: interpolate(f, [45, 60], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }), textAlign: "center", display: "flex", flexDirection: "column", gap: 10 }}>
        <Big size={40} weight={700}>cgh-physio-proms.vercel.app</Big>
        <Small size={26}>github.com/yorhagengyue/CGH-hackthon · github.com/yorhagengyue/CGH-ios</Small>
        <Small size={22}>H.A.T. Incubator 2026 · Team 1B · Changi General Hospital</Small>
      </div>
    </AbsoluteFill>
  );
};
