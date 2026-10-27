import { respondLinkAction } from "@/app/actions";
const pronoun = (rel: string) => /daughter|mother|wife|grandmother|sister/i.test(rel) ? "She" : /son|father|husband|grandson|brother/i.test(rel) ? "He" : "They";
/** The parent's Allow / Decline card for one pending caregiver link. */
export function LinkRequestCard({ r }: { r: { id: number; name: string; relationship: string } }) {
  return <div className="bg-white rounded-2xl shadow-card p-6 border-2 border-cgh-sky/40">
    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-cgh-blue">Your {r.relationship} wants to help</div>
    <div className="text-[22px] font-extrabold text-cgh-ink mt-1 leading-tight">{r.name}</div>
    <div className="text-lg text-slate-700 mt-1">{pronoun(r.relationship)} will be able to see your answers and fill in questionnaires for you.</div>
    <div className="mt-5 flex gap-3">
      <form action={respondLinkAction}><input type="hidden" name="link_id" value={r.id} /><input type="hidden" name="accept" value="1" /><button className="px-6 py-3 rounded-xl bg-cgh-blue text-white font-bold hover:bg-cgh-blue-dark">Allow</button></form>
      <form action={respondLinkAction}><input type="hidden" name="link_id" value={r.id} /><input type="hidden" name="accept" value="0" /><button className="px-6 py-3 rounded-xl bg-white border border-slate-300 font-bold text-slate-700 hover:border-danger hover:text-danger">Decline</button></form>
    </div>
  </div>;
}
