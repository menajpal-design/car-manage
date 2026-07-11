"use client";

import { useEffect } from "react";

export default function MobileLoginRedirect() {
  useEffect(() => {
    window.location.href = "/login";
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <p className="text-slate-400 text-sm animate-pulse">Redirecting to login...</p>
    </div>
  );
}
