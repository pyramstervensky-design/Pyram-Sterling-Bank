import { ShieldAlert } from "lucide-react";
import { Link } from "wouter";

const DARK_BLUE = "#1a2e6e";
const GOLD = "#d4960a";

export default function AccessDenied() {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-sm p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-serif tracking-tight mb-3" style={{ color: DARK_BLUE }}>
          Aksè Refize
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          Ou pa gen otorizasyon pou w antre nan seksyon administrasyon an. Sèlman itilizatè ki gen wòl
          administratè ka jwenn aksè nan paj sa a.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 w-full"
          style={{ backgroundColor: GOLD }}
        >
          Retounen nan Tablo de bò
        </Link>
      </div>
    </div>
  );
}
