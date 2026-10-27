import React from "react";
import { AbsoluteFill, Composition, Sequence } from "remotion";
import { FPS } from "./theme";
import { sample, scenes, type Scene } from "./scenes";
import { SceneView } from "./SceneView";
import { Intro, Outro } from "./components/Cards";

const INTRO = 2 * FPS, OUTRO = 6 * FPS;
const total = (list: Scene[]) => INTRO + list.reduce((n, s) => n + s.seconds * FPS, 0) + OUTRO;

const Film: React.FC<{ list: Scene[]; portrait?: boolean; intro?: boolean }> = ({ list, portrait, intro = true }) => {
  let t = 0;
  const seq: React.ReactNode[] = [];
  if (intro) { seq.push(<Sequence key="intro" from={0} durationInFrames={INTRO}><Intro /></Sequence>); t = INTRO; }
  for (const s of list) {
    const d = s.seconds * FPS;
    seq.push(<Sequence key={s.id} from={t} durationInFrames={d}><SceneView scene={s} portrait={portrait} /></Sequence>);
    t += d;
  }
  if (intro) seq.push(<Sequence key="outro" from={t} durationInFrames={OUTRO}><Outro portrait={portrait} /></Sequence>);
  return <AbsoluteFill>{seq}</AbsoluteFill>;
};

export const Root: React.FC = () => (
  <>
    <Composition id="Demo" component={Film} defaultProps={{ list: scenes }} durationInFrames={total(scenes)} fps={FPS} width={1920} height={1080} />
    <Composition id="DemoPortrait" component={Film} defaultProps={{ list: scenes, portrait: true }} durationInFrames={total(scenes)} fps={FPS} width={1080} height={1920} />
    <Composition id="Sample" component={Film} defaultProps={{ list: sample, intro: false }} durationInFrames={sample.reduce((n, s) => n + s.seconds * FPS, 0)} fps={FPS} width={1920} height={1080} />
  </>
);
