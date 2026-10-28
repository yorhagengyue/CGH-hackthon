import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FADE, SPRING } from "../theme";
import { Big, Small, WordRise, font } from "./Text";
import { Icon } from "./Icon";
import type { Role } from "../scenes/types";

/// Intro: the logo scales 0.8 → 1, then the title rises word by word.
export const Intro: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: SPRING, durationInFrames: 24 });
  return (
    <AbsoluteFill style={{ background: C.surface, alignItems: "center", justifyContent: "center", gap: 40 }}>
      <Img src={staticFile("brand/cgh-logo.png")} style={{ width: 460, opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})` }} />
      <div style={{ textAlign: "center" }}>
        <WordRise text="Physio PROMs" size={64} delay={14} />
        <div style={{ marginTop: 12 }}><WordRise text="The questionnaire is done before the visit. The session is for therapy." size={30} color={C.muted} delay={26} weight={500} /></div>
      </div>
    </AbsoluteFill>
  );
};

/// Problem statement: three pain points slide in; a red line is drawn through the last one.
export const Problem: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const items: [string, string, "paper" | "pen" | "eye"][] = [["Paper questionnaire", "filled in the waiting room, on the day", "paper"], ["Manual transcription", "someone types the scores into the record", "pen"], ["No trend", "the therapist cannot see change between visits", "eye"]];
  const strike = interpolate(f, [110, 135], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: C.canvas, alignItems: "center", justifyContent: "center", gap: 56, fontFamily: font }}>
      <WordRise text="Today, outcomes are measured on paper" size={60} />
      <div style={{ display: "flex", gap: 40 }}>
        {items.map(([t, d, ic], i) => {
          const s = spring({ frame: f - 20 - i * 14, fps, config: SPRING, durationInFrames: 22 });
          return (
            <div key={t} style={{ width: 480, padding: 36, background: C.surface, borderRadius: 20, boxShadow: "0 12px 40px rgba(20,38,58,0.08)", opacity: s, transform: `translateX(${interpolate(s, [0, 1], [60, 0])}px)`, position: "relative" }}>
              <div style={{ width: 72, height: 72, borderRadius: 24, background: C.mist, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 }}><Icon name={ic} size={38} /></div>
              <Big size={38}>{t}</Big>
              <Small size={26} style={{ marginTop: 8 }}>{d}</Small>
              {i === 2 && <div style={{ position: "absolute", left: 36, right: 36, top: 150, height: 5, background: C.danger, width: `${strike}%`, maxWidth: 408, borderRadius: 3 }} />}
            </div>
          );
        })}
      </div>
      <Small size={30} color={C.ink} style={{ opacity: interpolate(f, [140, 155], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>Physio PROMs moves all three online, before the patient walks in.</Small>
    </AbsoluteFill>
  );
};

/// Journey strip (3 s): five roles in a row, the connecting line draws left to right, the current role lights up.
const ROLES: [Role, "user" | "family" | "stethoscope" | "referral" | "building"][] = [["Patient", "user"], ["Caregiver", "family"], ["Physiotherapist", "stethoscope"], ["Doctor", "referral"], ["HOD", "building"]];
export const Journey: React.FC<{ current: Role }> = ({ current }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const line = interpolate(f, [8, 50], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: C.canvas, alignItems: "center", justifyContent: "center", fontFamily: font }}>
      <div style={{ position: "relative", width: 1400, height: 220 }}>
        <div style={{ position: "absolute", left: 100, right: 100, top: 70, height: 4, background: C.mist, borderRadius: 2 }} />
        <div style={{ position: "absolute", left: 100, top: 70, height: 4, width: `calc(${line}% - ${line * 2}px)`, background: C.blue, borderRadius: 2 }} />
        <div style={{ display: "flex", justifyContent: "space-between", position: "absolute", left: 0, right: 0, top: 0 }}>
          {ROLES.map(([r, ic], i) => {
            const on = r === current;
            const s = spring({ frame: f - 10 - i * 6, fps, config: SPRING, durationInFrames: 20 });
            return (
              <div key={r} style={{ width: 200, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, opacity: on ? 1 : 0.6 * s, transform: `scale(${on ? interpolate(s, [0, 1], [1, 1.1]) : 1})` }}>
                <div style={{ width: 144, height: 144, borderRadius: 48, background: on ? C.blue : C.surface, border: `3px solid ${on ? C.blue : C.mist}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: on ? "0 16px 40px rgba(0,112,184,0.28)" : "none" }}>
                  <Icon name={ic} size={64} color={on ? "#fff" : C.blue} />
                </div>
                <div style={{ fontSize: 28, fontWeight: on ? 800 : 600, color: on ? C.ink : C.muted }}>{r}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/// Outro: counters 0 → value over 0.8 s, then the address and the two repositories, then "What's next".
export const Outro: React.FC<{ portrait?: boolean }> = ({ portrait }) => {
  const f = useCurrentFrame();
  const nums: [number, string, string][] = [[2, "min", "to answer"], [2, "reminders", "by SMS before the visit"], [0, "paper", "forms to transcribe"]];
  const next = ["First-visit branch and \"Begin session\" on the day", "Visit record for the therapist", "Real SMS and APNs push", "Singapore EQ-5D-5L value set", "Family: parents add members themselves"];
  return (
    <AbsoluteFill style={{ background: C.surface, alignItems: "center", justifyContent: "center", gap: 48, fontFamily: font }}>
      <div style={{ display: "flex", flexDirection: portrait ? "column" : "row", gap: portrait ? 36 : 120 }}>
        {nums.map(([n, unit, l], i) => {
          const v = Math.round(interpolate(f, [i * 6, i * 6 + 24], [0, n], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
          const o = interpolate(f, [i * 6, i * 6 + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={unit} style={{ textAlign: "center", opacity: o }}>
              <Big size={96} color={C.blue}>{v} <span style={{ fontSize: 44, fontWeight: 700 }}>{unit}</span></Big>
              <Small size={28}>{l}</Small>
            </div>
          );
        })}
      </div>
      <div style={{ opacity: interpolate(f, [45, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
        <Big size={40} weight={700}>cgh-physio-proms.vercel.app</Big>
        <Small size={26}>github.com/yorhagengyue/CGH-hackthon · github.com/yorhagengyue/CGH-ios</Small>
      </div>
      <div style={{ opacity: interpolate(f, [75, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), background: C.canvas, borderRadius: 20, padding: "22px 36px", display: "flex", gap: 40, alignItems: "center" }}>
        <Small size={26} color={C.blue} style={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: 2 }}>What's next</Small>
        <div style={{ display: "flex", gap: 28 }}>{next.map((t) => <Small key={t} size={24} color={C.ink}>{t}</Small>)}</div>
      </div>
      <Small size={22} style={{ position: "absolute", bottom: 36 }}>H.A.T. Incubator 2026 · Team 1B · Changi General Hospital · proof of concept, not for clinical use</Small>
    </AbsoluteFill>
  );
};
