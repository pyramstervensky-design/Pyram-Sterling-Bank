import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

type Status = "online" | "weak" | "offline";

function getNetworkStatus(): Status {
  if (!navigator.onLine) return "offline";
  const conn = (navigator as any).connection ?? (navigator as any).mozConnection ?? (navigator as any).webkitConnection;
  if (conn && (conn.effectiveType === "slow-2g" || conn.effectiveType === "2g")) return "weak";
  return "online";
}

export function NetworkStatusIndicator() {
  const [status, setStatus] = useState<Status>("online");

  useEffect(() => {
    setStatus(getNetworkStatus());
    const handler = () => setStatus(getNetworkStatus());
    window.addEventListener("online", handler);
    window.addEventListener("offline", handler);
    const conn = (navigator as any).connection ?? (navigator as any).mozConnection ?? (navigator as any).webkitConnection;
    conn?.addEventListener("change", handler);
    return () => {
      window.removeEventListener("online", handler);
      window.removeEventListener("offline", handler);
      conn?.removeEventListener("change", handler);
    };
  }, []);

  if (status === "online") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        Konekte
      </div>
    );
  }
  if (status === "weak") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        Koneksyon Fèb
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
      <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
      Pa Konekte
    </div>
  );
}

export function NetworkStatusBanner() {
  const [status, setStatus] = useState<Status>("online");

  useEffect(() => {
    setStatus(getNetworkStatus());
    const handler = () => setStatus(getNetworkStatus());
    window.addEventListener("online", handler);
    window.addEventListener("offline", handler);
    const conn = (navigator as any).connection ?? (navigator as any).mozConnection ?? (navigator as any).webkitConnection;
    conn?.addEventListener("change", handler);
    return () => {
      window.removeEventListener("online", handler);
      window.removeEventListener("offline", handler);
      conn?.removeEventListener("change", handler);
    };
  }, []);

  if (status === "online") return null;

  if (status === "weak") {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-8 py-2 flex items-center gap-3">
        <Wifi className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <p className="text-sm text-amber-800">
          Koneksyon entènèt ou fèb. Kèk operasyon ka pran plis tan pase nòmal.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-rose-50 border-b border-rose-200 px-8 py-2 flex items-center gap-3">
      <WifiOff className="w-4 h-4 text-rose-600 flex-shrink-0" />
      <p className="text-sm text-rose-800">
        Pa gen koneksyon entènèt. Ou ka wè enfòmasyon ki te chaje anvan, men tranzaksyon bankè pa disponib pou kounye a.
      </p>
    </div>
  );
}
