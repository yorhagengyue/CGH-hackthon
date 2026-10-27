import React from "react";
import type { IconName } from "../scenes";
// Simple line icons, 2 px stroke, in the brand blue. No emoji, no filled glyph soup.
const paths: Record<IconName, React.ReactNode> = {
  home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  family: <><circle cx="8" cy="8" r="3.5" /><circle cx="17" cy="9" r="3" /><path d="M2 20c0-3.5 3-5.5 6-5.5s6 2 6 5.5" /><path d="M14 20c0-3 2-4.5 3-4.5s5 1.5 5 4.5" /></>,
  sms: <><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9h8M8 12h5" /></>,
  clipboard: <><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4V3h6v1" /><path d="M9 10h6M9 14h6M9 18h4" /></>,
  chart: <><path d="M4 20h16" /><path d="M5 15l4-4 4 3 6-7" /></>,
  chat: <><path d="M4 5h11v8H8l-4 3z" /><path d="M13 10h7v7h-3l-3 2v-2h-1" /></>,
  stethoscope: <><path d="M6 3v6a4 4 0 0 0 8 0V3" /><path d="M10 13v3a4 4 0 0 0 8 0v-2" /><circle cx="18" cy="12" r="2" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></>,
  doc: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /><path d="M9 12h6M9 16h6" /></>,
  referral: <><path d="M4 18V9a3 3 0 0 1 3-3h10" /><path d="M14 3l4 3-4 3" /></>,
  building: <><rect x="4" y="3" width="16" height="18" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3" /></>,
  numbers: <><path d="M5 17V7l4 10V7" /><path d="M13 7h5l-3 10" /></>,
};
export const Icon: React.FC<{ name: IconName; size?: number; color?: string }> = ({ name, size = 44, color = "#0070B8" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
);
