"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  Truck, 
  Fuel, 
  Wrench, 
  AlertTriangle, 
  LogOut, 
  Menu, 
  X
} from "lucide-react";
import { apiRequest } from "@/lib/api";

interface DriverProfile {
  id: string;
  name: string;
  role: string;
  assignedVehicleId?: string;
}

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<DriverProfile | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem("driver_profile");
    if (!cached) {
      window.location.href = "/login";
      return;
    }
    try {
      setProfile(JSON.parse(cached));
    } catch {
      window.location.href = "/login";
    }
  }, []);

  const handleLogout = async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch {}
    localStorage.removeItem("driver_profile");
    localStorage.removeItem("assigned_vehicle");
    localStorage.removeItem("owner_profile");
    window.location.href = "/login";
  };

  const navItems = [
    {
      href: "/driver",
      icon: <Truck className="h-5 w-5" />,
      label: "Duty Home",
    },
    {
      href: "/driver/fuel",
      icon: <Fuel className="h-5 w-5" />,
      label: "Fuel Log",
    },
    {
      href: "/driver/tickets/create",
      icon: <AlertTriangle className="h-5 w-5" />,
      label: "Report Issue",
    },
  ];

  // If technician, add technician portal link
  if (profile?.role === "technician" || profile?.role === "mechanic") {
    navItems.push({
      href: "/driver/technician",
      icon: <Wrench className="h-5 w-5" />,
      label: "Technician Portal",
    });
  }

  const isActive = (href: string) => {
    if (href === "/driver") return pathname === "/driver";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* ── Desktop Top Navbar ── */}
      <header className="hidden md:flex sticky top-0 z-40 bg-slate-900 border-b border-slate-800 h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-600/20 shrink-0">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white">DriverPortal</h1>
            <p className="text-[10px] text-slate-500 font-semibold">FleetMaster PWA v1.0</p>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                isActive(item.href)
                  ? "bg-violet-600/15 text-violet-400 border border-violet-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {profile && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center font-bold text-violet-400 text-sm shrink-0">
                {profile.name?.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-250 leading-tight">{profile.name}</p>
                <p className="text-[10px] text-slate-500 capitalize leading-none">{profile.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-450 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        )}
      </header>

      {/* ── Mobile Top Header ── */}
      <header className="md:hidden sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 rounded-lg border border-slate-800 hover:bg-slate-900 text-slate-450 hover:text-white"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center">
            <Truck className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-xs font-extrabold tracking-tight text-white">DriverPortal</h1>
            <p className="text-[9px] text-slate-500">v1.0</p>
          </div>
        </div>

        {profile && (
          <div className="h-8 w-8 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center font-bold text-violet-400 text-xs shrink-0">
            {profile.name?.charAt(0).toUpperCase()}
          </div>
        )}
      </header>

      {/* ── Mobile Drawer Sidebar ── */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-5 animate-in slide-in-from-left duration-200 md:hidden">
            <div className="flex items-center justify-between pb-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center">
                  <Truck className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-bold text-white">Navigation</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 py-6 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive(item.href)
                      ? "bg-violet-600/15 text-violet-400 border border-violet-500/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            {profile && (
              <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-9 w-9 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center font-bold text-violet-400 text-sm shrink-0">
                    {profile.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-250">{profile.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{profile.role}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-rose-450 hover:bg-rose-500/10 border border-rose-950/30 transition-all"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </aside>
        </>
      )}

      {/* ── Main Content Area ── */}
      <main className="flex-1 flex flex-col min-w-0">
        {children}
      </main>
    </div>
  );
}
