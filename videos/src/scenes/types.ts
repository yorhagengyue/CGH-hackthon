export type Role = "Patient" | "Caregiver" | "Physiotherapist" | "Doctor" | "HOD";
export type Frame = "phone" | "browser" | "none";
export type IconName = "home" | "user" | "family" | "sms" | "clipboard" | "chart" | "chat" | "stethoscope" | "search" | "doc" | "referral" | "building" | "numbers" | "paper" | "pen" | "eye";
export type Highlight = { at: number; for?: number; x: number; y: number; w: number; h: number };   // fractions of the media box, seconds from scene start
export type Ripple = { at: number; x: number; y: number };
export type Zoom = { at: number; for?: number; x: number; y: number; w: number; h: number };            // 1.5× inset of this region of the media box                                              // fractions of the media box
export type Scene = {
  id: string;
  role: Role;
  title: string;            // role card: a few words
  icon: IconName;
  what: string;             // caption line 1 (bold): what this is
  why: string;              // caption line 2: why it matters
  seconds: number;
  media: { kind: "image" | "video"; src: string; frame: Frame; offsetSeconds?: number; simulated?: boolean };
  highlights?: Highlight[];
  ripples?: Ripple[];
  zooms?: Zoom[];
  journey?: boolean;        // show the 3 s journey strip before this scene
};
