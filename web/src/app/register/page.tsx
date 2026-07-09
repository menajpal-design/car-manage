"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, AlertCircle, Building2, User, Phone, Lock, Mail } from "lucide-react";
import { apiRequest } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    companyName: "",
    name: "",
    phone: "",
    email: "",
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
      await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      router.push("/"); // Redirect to dashboard
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Registration failed. Try again.");
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
          <h2 className="text-2xl font-bold tracking-tight">Register Company Owner</h2>
          <p className="text-sm text-slate-400">Establish your FleetMaster Pro organization</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Company Name</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                name="companyName"
                required
                value={formData.companyName}
                onChange={handleChange}
                placeholder="e.g. Titan Logistics"
                className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-violet-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Owner Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. John Doe"
                className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-violet-500"
              />
            </div>
          </div>

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
            <label className="text-xs font-semibold text-slate-400">Email Address (Optional)</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. owner@titan.com"
                className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-violet-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Password</label>
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
            {loading ? "Registering..." : "Create Organization"}
          </button>
        </form>

        <div className="text-center pt-2 text-xs text-slate-500">
          <span>Already have an account? </span>
          <a href="/login" className="text-violet-400 hover:underline">Sign In</a>
        </div>
      </div>
    </div>
  );
}
