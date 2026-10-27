// The edit, one entry per feature. Media paths are relative to videos/assets (Remotion's public dir).
// kind "image" is a still (sample cut); kind "video" is a screen recording from record/ (final cut).
export type Frame = "phone" | "browser" | "none";
export type Scene = {
  id: string;
  title: string;        // 1 s title card: a few words
  icon: IconName;
  caption: string;      // one sentence, bottom left, stays for the whole scene
  seconds: number;      // 8–20
  media: { kind: "image" | "video"; src: string; frame: Frame; offsetSeconds?: number };
};
export type IconName = "home" | "user" | "family" | "sms" | "clipboard" | "chart" | "chat" | "stethoscope" | "search" | "doc" | "referral" | "building" | "numbers";

export const scenes: Scene[] = [
  { id: "01-landing",    title: "Physio PROMs",                icon: "home",        seconds: 8,  caption: "One questionnaire before every physiotherapy visit, on the web or on the phone.", media: { kind: "video", src: "media/web/01-landing.mp4", frame: "browser" } },
  { id: "02-register",   title: "A daughter registers",        icon: "user",        seconds: 14, caption: "Mei Ling registers with her NRIC and asks to help her father with his questionnaires.", media: { kind: "video", src: "media/web/02-register.mp4", frame: "browser" } },
  { id: "03-allow",      title: "Father says yes",             icon: "family",      seconds: 10, caption: "On his phone, Mr Tan sees who is asking and taps Allow.", media: { kind: "video", src: "media/ios/03-allow.mp4", frame: "phone" } },
  { id: "04-sms",        title: "A reminder by SMS",           icon: "sms",         seconds: 8,  caption: "The day before the visit, and two hours before, an SMS reminds him if the questionnaire is still open.", media: { kind: "image", src: "media/phone/04-sms.png", frame: "phone" } },
  { id: "05-survey",     title: "Seven questions, two minutes", icon: "clipboard",  seconds: 20, caption: "Five EQ-5D-5L questions in his own words, pain from 0 to 10, and how he feels today.", media: { kind: "video", src: "media/ios/05-survey.mp4", frame: "phone" } },
  { id: "06-progress",   title: "How am I doing?",             icon: "chart",       seconds: 16, caption: "A plain verdict, one chart with the numbers on it, and every past answer one swipe away.", media: { kind: "video", src: "media/ios/06-progress.mp4", frame: "phone" } },
  { id: "07-ask",        title: "Ask",                         icon: "chat",        seconds: 16, caption: "Questions about his own visits and answers, answered from his record on the server.", media: { kind: "video", src: "media/ios/07-ask.mp4", frame: "phone" } },
  { id: "08-clinic",     title: "The clinic list",             icon: "stethoscope", seconds: 14, caption: "Before the first patient arrives: who has answered, who has improved, and who needs attention.", media: { kind: "video", src: "media/ios/08-clinic.mp4", frame: "phone" } },
  { id: "09-search",     title: "Find a patient",              icon: "search",      seconds: 14, caption: "Knee, three to six months after surgery, or no surgery at all: one search.", media: { kind: "video", src: "media/ios/09-search.mp4", frame: "phone" } },
  { id: "10-detail",     title: "One patient, one page",       icon: "doc",         seconds: 16, caption: "Trend, answers now and last time, and the clinical note copied in one tap.", media: { kind: "video", src: "media/ios/10-detail.mp4", frame: "phone" } },
  { id: "11-referral",   title: "A referral in one minute",    icon: "referral",    seconds: 12, caption: "The doctor picks the patient, the diagnosis and the physiotherapist. Reminders are queued.", media: { kind: "video", src: "media/web/11-referral.mp4", frame: "browser" } },
  { id: "12-hod",        title: "The whole department",        icon: "building",    seconds: 12, caption: "Outcomes by region, workload by physiotherapist, and today's clinic across the department.", media: { kind: "video", src: "media/web/12-hod.mp4", frame: "browser" } },
  { id: "13-caregiver",  title: "Filling in for mother",       icon: "family",      seconds: 12, caption: "Mei Ling answers for her mother, who prefers not to use a phone.", media: { kind: "video", src: "media/ios/13-caregiver.mp4", frame: "phone" } },
];

// The 20-second sample for the style review, cut from existing screenshots.
export const sample: Scene[] = [
  { id: "s1", title: "Seven questions, two minutes", icon: "clipboard", seconds: 7, caption: "Five EQ-5D-5L questions in his own words, pain from 0 to 10, and how he feels today.", media: { kind: "image", src: "screens/03-survey-q1-light.png", frame: "phone" } },
  { id: "s2", title: "How am I doing?", icon: "chart", seconds: 7, caption: "A plain verdict, one chart with the numbers on it, and every past answer one swipe away.", media: { kind: "image", src: "screens/v3-01-progress-trend.png", frame: "phone" } },
  { id: "s3", title: "The clinic list", icon: "stethoscope", seconds: 6, caption: "Who has answered, who has improved, and who needs attention.", media: { kind: "image", src: "screens/v6-03-clinic-needs-attention.png", frame: "phone" } },
];
