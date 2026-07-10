"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, AlertCircle, Phone, Lock } from "lucide-react";
import { apiRequest } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    phone: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      if (data.user) {
        localStorage.setItem("owner_profile", JSON.stringify(data.user));
        
        const role = data.user.role;
        if (role === "driver") {
          localStorage.setItem("driver_profile", JSON.stringify(data.user));
          if (data.assignedVehicle) {
            localStorage.setItem("assigned_vehicle", JSON.stringify(data.assignedVehicle));
          }
          window.location.href = "/driver";
        } else if (role === "manager") {
          router.push("/dashboard/users"); // Redirect manager to their profile/employee directory
        } else if (role === "admin") {
          router.push("/dashboard/analytics"); // Redirect admin to full analytics
        } else {
          router.push("/");
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 shadow-lg shadow-indigo-500/20">
            <Truck className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome to FleetMaster Pro</h2>
          <p className="text-sm text-slate-400">Sign in to manage your operations</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. +15550199"
                className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-violet-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-400">Password</label>
              <a href="#" className="text-xs text-violet-400 hover:underline">Forgot password?</a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-violet-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg bg-violet-600 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50 transition-colors shadow-lg shadow-violet-600/10"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="text-center pt-2 text-xs text-slate-500">
          <span>Don&apos;t have an account? </span>
          <a href="/register" className="text-violet-400 hover:underline">Register Company</a>
        </div>
      </div>
    </div>
  );
}
