"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, Lock, Phone, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/api";

export default function MobileLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ phone, password }),
      });

      // Cache session user profile details in LocalStorage for offline PWA reference
      localStorage.setItem("driver_profile", JSON.stringify(data.user));
      if (data.assignedVehicle) {
        localStorage.setItem("assigned_vehicle", JSON.stringify(data.assignedVehicle));
      } else {
        localStorage.removeItem("assigned_vehicle");
      }

      const role = data.user.role;
      if (role === "driver") {
        router.push("/fuel");
      } else {
        // If an owner/manager/admin accidentally logs in here, redirect to the main web app
        localStorage.setItem("owner_profile", JSON.stringify(data.user));
        window.location.href = "/";
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Invalid phone number or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center px-6 py-12 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-6">
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 mb-4 shadow-lg shadow-violet-600/5">
            <Truck className="h-6 w-6" />
          </div>
          <h2 className="text-center text-xl font-bold tracking-tight text-white">
            FleetMaster Driver Portal
          </h2>
          <p className="mt-1 text-center text-xs text-slate-400 font-medium">
            Log in to submit refills and odometer records
          </p>
        </div>

        <div className="bg-slate-900/30 border border-slate-900 px-6 py-8 rounded-2xl shadow-xl backdrop-blur-sm">
          {error && (
            <div className="mb-4 flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> Phone Number
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+15551234567"
                className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-violet-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" /> Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-violet-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full h-11 rounded-xl bg-violet-600 text-xs font-bold hover:bg-violet-500 text-white disabled:opacity-50 transition-colors shadow-md shadow-violet-600/10"
            >
              {loading ? "Authenticating..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
