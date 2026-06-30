import { SignIn } from "@clerk/react";

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] w-full flex bg-slate-50">
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24">
        <div className="max-w-md w-full mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-serif text-slate-900 tracking-tight">Pyram Sterling Bank</h1>
            <p className="text-slate-500 mt-2">Premium Digital Banking</p>
          </div>
          <SignIn routing="hash" />
        </div>
      </div>
      <div className="hidden lg:flex flex-1 bg-slate-900 flex-col items-center justify-center p-12">
        <div className="max-w-lg text-center">
          <h2 className="text-4xl font-serif text-white mb-6">Manage wealth with absolute confidence.</h2>
          <p className="text-slate-300 text-lg leading-relaxed">
            The digital equivalent of walking into a marble-floored international bank with a personal banker at the ready.
          </p>
        </div>
      </div>
    </div>
  );
}
