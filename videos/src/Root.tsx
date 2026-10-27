import React from "react";
import { AbsoluteFill, Composition, Sequence } from "remotion";
import { FPS } from "./theme";
import { scenes } from "./scenes";
import type { Scene } from "./scenes/types";
import { SceneView } from "./SceneView";
import { Intro, Journey, Outro, Problem } from "./components/Cards";

const INTRO = 4 * FPS, PROBLEM = 10 * FPS, JOURNEY = 3 * FPS, OUTRO = 9 * FPS;
const total = (list: Scene[]) => INTRO + PROBLEM + list.reduce((n, s) => n + s.seconds * FPS + (s.journey ? JOURNEY : 0), 0) + OUTRO;

const Film: React.FC<{ list: Scene[]; portrait?: boolean }> = ({ list, portrait }) => {
  const seq: React.ReactNode[] = [];
  let t = 0;
  seq.push(<Sequence key="intro" from={t} durationInFrames={INTRO}><Intro /></Sequence>); t += INTRO;
  seq.push(<Sequence key="problem" from={t} durationInFrames={PROBLEM}><Problem /></Sequence>); t += PROBLEM;
  for (const s of list) {
    if (s.journey) { seq.push(<Sequence key={s.id + "-j"} from={t} durationInFrames={JOURNEY}><Journey current={s.role} /></Sequence>); t += JOURNEY; }
    const d = s.seconds * FPS;
    seq.push(<Sequence key={s.id} from={t} durationInFrames={d}><SceneView scene={s} portrait={portrait} /></Sequence>);
    t += d;
  }
  seq.push(<Sequence key="outro" from={t} durationInFrames={OUTRO}><Outro portrait={portrait} /></Sequence>);
  return <AbsoluteFill>{seq}</AbsoluteFill>;
};

export const Root: React.FC = () => (
  <>
    <Composition id="Demo" component={Film} defaultProps={{ list: scenes }} durationInFrames={total(scenes)} fps={FPS} width={1920} height={1080} />
    <Composition id="DemoPortrait" component={Film} defaultProps={{ list: scenes.filter((s) => s.media.frame === "phone"), portrait: true }} durationInFrames={total(scenes.filter((s) => s.media.frame === "phone"))} fps={FPS} width={1080} height={1920} />
  </>
);
