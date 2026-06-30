import { CreditCard } from "lucide-react";

interface VirtualCardProps {
  cardNumber?: string;
  cardholderName?: string;
  expiry?: string;
  cvv?: string;
  isLoading?: boolean;
}

export function VirtualCard({ cardNumber, cardholderName, expiry, cvv, isLoading }: VirtualCardProps) {
  if (isLoading) {
    return (
      <div className="w-[340px] h-[214px] rounded-2xl bg-slate-200 animate-pulse" />
    );
  }

  // Format card number to show only last 4
  const formattedNumber = cardNumber 
    ? `•••• •••• •••• ${cardNumber.slice(-4)}`
    : "•••• •••• •••• ••••";

  return (
    <div className="relative w-[340px] h-[214px] rounded-2xl overflow-hidden shadow-2xl group transition-transform hover:-translate-y-1">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950" />
      
      {/* Decorative patterns */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500 via-transparent to-transparent" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/20 blur-3xl rounded-full" />
      
      {/* Content */}
      <div className="relative h-full p-6 flex flex-col justify-between text-white">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-amber-500 rounded-sm flex items-center justify-center shadow-lg">
              <span className="text-slate-900 font-serif font-bold text-sm leading-none">P</span>
            </div>
            <span className="font-serif text-sm tracking-widest text-slate-100">PYRAM STERLING</span>
          </div>
          <CreditCard className="text-slate-400 w-8 h-8 opacity-50" />
        </div>

        <div className="space-y-4">
          <div className="font-mono text-xl tracking-[0.2em] text-slate-100 drop-shadow-md">
            {formattedNumber}
          </div>
          
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Cardholder</p>
              <p className="font-medium tracking-wider text-sm truncate max-w-[180px]">
                {cardholderName || "CARDHOLDER NAME"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Valid Thru</p>
              <p className="font-medium tracking-wider text-sm">{expiry || "MM/YY"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
