"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Truck, 
  Wrench, 
  TrendingUp, 
  Activity, 
  Plus, 
  Search,
  Bell,
  Settings,
  Fuel,
  DollarSign,
  AlertTriangle,
  FileText
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { VehicleStatus } from "@fleetmaster/shared";

interface DashboardSummary {
  activeVehicles: number;
  openTickets: number;
  fuelTotalThisMonth: number;
  fuelTrendIncrease: number;
  profitSnapshot: {
    revenues: number;
    expenses: number;
    netProfit: number;
  };
  expiringDocsAlerts: Array<{
    regNumber: string;
    docType: string;
    daysLeft: number;
    expiryDate: string;
  }>;
  activities: Array<{
    timestamp: string;
    type: string;
    message: string;
  }>;
}

interface VehicleRecord {
  id: string;
  regNumber: string;
  brand: string;
  model: string;
  status: VehicleStatus;
  currentOdometer: number;
  assignedDriver?: { name: string };
  fuelType: string;
}

export default function Home() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ name: string; role: string } | null>(null);

  const fetchDashboardData = async () => {
    try {
      const summaryData = await apiRequest("/reports/dashboard-summary");
      setSummary(summaryData);

      const vehicleData = await apiRequest("/vehicles");
      setVehicles(vehicleData.vehicles || []);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = localStorage.getItem("owner_profile");
    if (!cached) {
      router.push("/login");
      return;
    }
    const profile = JSON.parse(cached);
    setUserProfile(profile);

    if (profile.role === "driver") {
      window.location.href = "/driver";
      return;
    }

    if (profile.role === "manager") {
      router.push("/dashboard/users");
      return;
    }

    if (profile.role === "accountant") {
      router.push("/dashboard/payments");
      return;
    }

    fetchDashboardData();
  }, [router]);

  const filteredVehicles = vehicles.filter(v => 
    v.regNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.assignedDriver?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { 
      label: "Active Fleet", 
      value: summary?.activeVehicles || 0, 
      icon: Truck, 
      color: "text-blue-500", 
      bg: "bg-blue-500/10", 
      trend: "Registered vehicles active" 
    },
    { 
      label: "Open Tickets", 
      value: summary?.openTickets || 0, 
      icon: Wrench, 
      color: "text-amber-500", 
      bg: "bg-amber-500/10", 
      trend: "Awaiting mechanics check" 
    },
    { 
      label: "Refuel This Month", 
      value: `$${(summary?.fuelTotalThisMonth || 0).toFixed(2)}`, 
      icon: Fuel, 
      color: "text-rose-500", 
      bg: "bg-rose-500/10", 
      trend: `${summary?.fuelTrendIncrease || 0}% change vs last month` 
    },
    { 
      label: "Profit / Loss", 
      value: `$${(summary?.profitSnapshot?.netProfit || 0).toFixed(2)}`, 
      icon: DollarSign, 
      color: (summary?.profitSnapshot?.netProfit || 0) >= 0 ? "text-emerald-500" : "text-rose-500", 
      bg: (summary?.profitSnapshot?.netProfit || 0) >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10", 
      trend: `Revenue: $${(summary?.profitSnapshot?.revenues || 0).toFixed(2)}` 
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 shadow-lg shadow-indigo-500/20">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                FleetMaster Pro
              </h1>
              <p className="text-xs text-slate-400 font-medium">Enterprise Admin Console</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Quick search vehicle, driver..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-64 rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-550 outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 transition-colors">
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-violet-500"></span>
            </button>

            <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 transition-colors">
              <Settings className="h-4.5 w-4.5" />
            </button>

            <div className="h-8 w-px bg-slate-800"></div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-sm font-bold text-violet-400 border border-slate-700">
                {userProfile?.name ? userProfile.name.slice(0, 2).toUpperCase() : "FM"}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-medium text-slate-200">{userProfile?.name || "Loading..."}</p>
                <p className="text-xs text-slate-400 capitalize">{userProfile?.role || "Fleet Owner"}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="container mx-auto p-6 space-y-6 max-w-7xl">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-900/60 to-indigo-950/80 border border-violet-800/40 p-6 md:p-8">
          <div className="relative z-10 max-w-xl space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300 ring-1 ring-inset ring-violet-500/20">
              <Activity className="h-3 w-3 animate-pulse" /> Live Status: 100% Operational
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">System Command Overview</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Track vehicle coordinates, manage driver dispatches, evaluate fuel consumption ratios, and inspect maintenance tickets in real-time.
            </p>
          </div>
          <div className="absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-500/20 via-transparent to-transparent pointer-events-none"></div>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500 font-semibold animate-pulse">Syncing fleet diagnostics...</div>
        ) : (
          <>
            {/* Stats Grid */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:bg-slate-900 hover:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-400">{stat.label}</span>
                      <div className={`rounded-lg p-2 ${stat.bg} ${stat.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-3xl font-bold tracking-tight">{stat.value}</h3>
                      <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-slate-400" />
                        {stat.trend}
                      </p>
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Main Content Details */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Active Fleet List */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-200">Live Vehicle Directory</h3>
                    <p className="text-xs text-slate-400">Total list of vehicles and live operations status</p>
                  </div>
                  <button 
                    onClick={() => router.push("/dashboard/vehicles")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-violet-500 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Vehicle
                  </button>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/30">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-xs font-medium">
                          <th className="p-4">Vehicle Details</th>
                          <th className="p-4">Assigned Driver</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Odometer</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-xs">
                        {filteredVehicles.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-slate-500 italic">No vehicles registered in fleet.</td>
                          </tr>
                        ) : (
                          filteredVehicles.map((vehicle) => (
                            <tr 
                              key={vehicle.id} 
                              onClick={() => router.push(`/dashboard/vehicles/${vehicle.id}`)}
                              className="hover:bg-slate-900/40 transition-colors cursor-pointer"
                            >
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                                    <Truck className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-200">{vehicle.regNumber}</p>
                                    <p className="text-2xs text-slate-500 font-semibold">{vehicle.brand} {vehicle.model}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 font-medium text-slate-300">{vehicle.assignedDriver?.name || "Unassigned"}</td>
                              <td className="p-4">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-3xs font-bold ${
                                  vehicle.status === VehicleStatus.ACTIVE ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' :
                                  vehicle.status === VehicleStatus.MAINTENANCE ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20' :
                                  vehicle.status === VehicleStatus.IDLE ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20' :
                                  'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
                                }`}>
                                  <span className={`h-1 w-1 rounded-full ${
                                    vehicle.status === VehicleStatus.ACTIVE ? 'bg-emerald-500' :
                                    vehicle.status === VehicleStatus.MAINTENANCE ? 'bg-amber-500' :
                                    vehicle.status === VehicleStatus.IDLE ? 'bg-blue-500' :
                                    'bg-red-500'
                                  }`}></span>
                                  {vehicle.status}
                                </span>
                              </td>
                              <td className="p-4 text-slate-300 font-mono font-semibold">{vehicle.currentOdometer.toLocaleString()} km</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Sidebar - Expiries & Activity Feed */}
              <div className="space-y-6">
                
                {/* Expiring Vault Documents (FR-RPT-01) */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />
                      Document Expiries (7d)
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold">Vault document deadlines expiring soon</p>
                  </div>

                  <div className="space-y-2 text-xs">
                    {!summary?.expiringDocsAlerts || summary.expiringDocsAlerts.length === 0 ? (
                      <p className="text-slate-500 italic text-center py-2">No documents expiring within 7 days.</p>
                    ) : (
                      summary.expiringDocsAlerts.map((alert, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/10">
                          <div>
                            <p className="font-bold text-slate-200">{alert.regNumber}</p>
                            <p className="text-[10px] text-slate-500 uppercase">{alert.docType}</p>
                          </div>
                          <span className="px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-350 font-bold uppercase text-[9px]">
                            {alert.daysLeft} days left
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Recent activity log */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-violet-500" />
                      Command Activity log
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold">Real-time status changes and ticket logs</p>
                  </div>

                  <div className="space-y-3 text-xs">
                    {!summary?.activities || summary.activities.length === 0 ? (
                      <p className="text-slate-550 italic text-center py-2">No recent system activities.</p>
                    ) : (
                      summary.activities.map((act, idx) => (
                        <div key={idx} className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-1">
                          <div className="flex justify-between items-center text-[10px] text-slate-500">
                            <span className="font-bold uppercase text-violet-400">{act.type}</span>
                            <span>{new Date(act.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-slate-300 font-semibold leading-normal">{act.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* System Navigation links */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-200">System Command Shortcuts</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <a href="/dashboard/vehicles" className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-center transition-all group">
                      <Truck className="h-5 w-5 text-violet-400 group-hover:scale-110 transition-transform mb-1.5" />
                      <span className="text-xs font-semibold text-slate-300">Vehicles Directory</span>
                    </a>
                    <a href="/dashboard/tickets" className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-center transition-all group">
                      <Wrench className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform mb-1.5" />
                      <span className="text-xs font-semibold text-slate-300">Kanban Board</span>
                    </a>
                    <a href="/dashboard/fuel" className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-center transition-all group">
                      <TrendingUp className="h-5 w-5 text-emerald-400 group-hover:scale-110 transition-transform mb-1.5" />
                      <span className="text-xs font-semibold text-slate-300">Fuel Analytics</span>
                    </a>
                    <a href="/dashboard/payments" className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-center transition-all group">
                      <DollarSign className="h-5 w-5 text-rose-400 group-hover:scale-110 transition-transform mb-1.5" />
                      <span className="text-xs font-semibold text-slate-300">Payments Ledger</span>
                    </a>
                    <a href="/dashboard/analytics" className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-center transition-all group col-span-2">
                      <FileText className="h-5 w-5 text-indigo-400 group-hover:scale-110 transition-transform mb-1.5" />
                      <span className="text-xs font-semibold text-slate-300">Financial Reports & P&L</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
