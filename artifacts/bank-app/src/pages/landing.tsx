import { SignIn } from "@clerk/react";

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] w-full flex bg-slate-50">
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24">
        <div className="max-w-md w-full mx-auto">
          <div className="mb-8">
            <img src="/pyram-logo.png" alt="Pyram Sterling Bank" className="h-28 w-auto object-contain mb-2" style={{ maxWidth: "280px" }} />
            <p className="text-slate-500 text-sm">Bankè Nimerik Premye Kalite</p>
          </div>
          <SignIn routing="hash" />
        </div>
      </div>
      <div className="hidden lg:flex flex-1 bg-slate-900 flex-col items-center justify-center p-12">
        <div className="max-w-lg text-center">
          <h2 className="text-4xl font-serif text-white mb-6">Jere richès ou avèk konfyans absoli.</h2>
          <p className="text-slate-300 text-lg leading-relaxed">
            Ekvalan nimerik antre nan yon bank entènasyonal, ak yon bankye pèsonèl ki prè pou ede ou.
          </p>
        </div>
      </div>
    </div>
  );
}
