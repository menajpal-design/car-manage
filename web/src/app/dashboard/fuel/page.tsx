"use client";

import React, { useEffect, useState, useCallback } from "react";
import { 
  Fuel, 
  AlertTriangle, 
  Check, 
  ExternalLink,
  ShieldAlert
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";

interface FuelLogRecord {
  id: string;
  vehicleId: { id: string; regNumber: string };
  driverId: { id: string; name: string };
  fuelDate: string;
  odoReading: number;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  fuelStation?: string;
  previousOdo: number;
  mileageCalculated: number;
  isOdoPhotoVerified: boolean;
  odoPhotoUrl?: string;
}

interface MileageTrendItem {
  name: string;
  fuelCost: number;
  fuelLiters: number;
  mileage: number;
}

interface LowMileageAlert {
  vehicleId: string;
  regNumber: string;
  averageEfficiency: number;
  message: string;
}

export default function FuelDashboard() {
  const [vehicles, setVehicles] = useState<{ id: string; regNumber: string }[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // Statistics states
  const [totalCost, setTotalCost] = useState(0);
  const [totalLiters, setTotalLiters] = useState(0);
  const [averagePrice, setAveragePrice] = useState(0);
  const [averageEfficiency, setAverageEfficiency] = useState(0);
  const [lowMileageAlerts, setLowMileageAlerts] = useState<LowMileageAlert[]>([]);

  // Chart and Log states
  const [trendData, setTrendData] = useState<MileageTrendItem[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLogRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchVehiclesList = useCallback(async () => {
    try {
      const data = await apiRequest("/vehicles");
      setVehicles(data.vehicles || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Failed to load vehicles list:", message);
    }
  }, []);

  const fetchFuelAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const statsQuery = `/fuel-logs/stats?vehicleId=${selectedVehicle}&year=${selectedYear}`;
      const stats = await apiRequest(statsQuery);
      setTotalCost(stats.totalCost || 0);
      setTotalLiters(stats.totalLiters || 0);
      setAveragePrice(stats.averagePrice || 0);
      setAverageEfficiency(stats.averageEfficiency || 0);
      setLowMileageAlerts(stats.lowMileageAlerts || []);

      const trendQuery = `/fuel-logs/mileage-trend?vehicleId=${selectedVehicle}&year=${selectedYear}`;
      const trend = await apiRequest(trendQuery);
      setTrendData(trend.trend || []);

      const logsQuery = `/fuel-logs?vehicleId=${selectedVehicle}&year=${selectedYear}`;
      const logs = await apiRequest(logsQuery);
      setFuelLogs(logs.fuelLogs || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to load fuel statistics.");
    } finally {
      setLoading(false);
    }
  }, [selectedVehicle, selectedYear]);

  useEffect(() => {
    fetchVehiclesList();
  }, [fetchVehiclesList]);

  useEffect(() => {
    fetchFuelAnalytics();
  }, [fetchFuelAnalytics]);

  const handleVerifyOdo = async (logId: string) => {
    try {
      await apiRequest(`/fuel-logs/${logId}/verify-odo`, {
        method: "POST",
      });
      alert("Odometer reading verified successfully.");
      fetchFuelAnalytics(); // Refreshes logs and status lists
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`Verification failed: ${message}`);
    }
  };

  // Generate data for Per-Vehicle Fuel Efficiency Comparison
  const getPerVehicleComparisonData = () => {
    const vehicleStats: { [key: string]: { name: string; totalDist: number; totalLit: number } } = {};
    for (const log of fuelLogs) {
      if (log.vehicleId && log.mileageCalculated > 0) {
        const reg = log.vehicleId.regNumber;
        if (!vehicleStats[reg]) {
          vehicleStats[reg] = { name: reg, totalDist: 0, totalLit: 0 };
        }
        vehicleStats[reg].totalDist += (log.odoReading - log.previousOdo);
        vehicleStats[reg].totalLit += log.liters;
      }
    }

    return Object.values(vehicleStats)
      .map((item) => ({
        name: item.name,
        efficiency: item.totalLit > 0 ? Number((item.totalDist / item.totalLit).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.efficiency - a.efficiency);
  };

  const vehicleComparisonData = getPerVehicleComparisonData();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Widget */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400">
              <Fuel className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Fuel Analytics</h1>
              <p className="text-xs text-slate-400 font-medium">Monitor fuel costs, calculate mileage metrics, and verify driver submissions</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-3 bg-slate-900/30 border border-slate-900 p-2 rounded-xl self-start sm:self-center">
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="h-9 rounded-lg border border-slate-800 bg-slate-950 px-2 text-xs text-slate-300 outline-none focus:border-violet-500"
            >
              <option value="">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.regNumber}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-9 rounded-lg border border-slate-800 bg-slate-950 px-2 text-xs text-slate-300 outline-none focus:border-violet-500"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Low Mileage Warning Alerts */}
        {lowMileageAlerts.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
              <ShieldAlert className="h-4.5 w-4.5" />
              <span>Low Mileage Alerts ({lowMileageAlerts.length} Vehicles Affected)</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {lowMileageAlerts.map((alert, idx) => (
                <div key={idx} className="bg-slate-950/40 p-2.5 rounded-lg border border-amber-500/10 text-slate-300 text-[10px] font-semibold flex items-center justify-between">
                  <span>Vehicle: {alert.regNumber}</span>
                  <span className="text-amber-400 font-bold">Avg: {alert.averageEfficiency} km/L</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statistics Grid cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-850 bg-slate-900/10 p-5 space-y-1.5">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">Total fuel Spent</span>
            <div className="text-xl font-extrabold text-white">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <span className="text-[10px] text-slate-400 block font-medium">Refilled total of {totalLiters.toLocaleString()} L</span>
          </div>

          <div className="rounded-xl border border-slate-850 bg-slate-900/10 p-5 space-y-1.5">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">Average Price</span>
            <div className="text-xl font-extrabold text-white">${averagePrice.toFixed(2)}/L</div>
            <span className="text-[10px] text-slate-400 block font-medium">Refueling station rates</span>
          </div>

          <div className="rounded-xl border border-slate-850 bg-slate-900/10 p-5 space-y-1.5">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">Average efficiency</span>
            <div className="text-xl font-extrabold text-emerald-400">{averageEfficiency.toFixed(2)} km/L</div>
            <span className="text-[10px] text-slate-400 block font-medium">Target range &gt; 5.0 km/L</span>
          </div>

          <div className="rounded-xl border border-slate-850 bg-slate-900/10 p-5 space-y-1.5">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">Logged Entries</span>
            <div className="text-xl font-extrabold text-white">{fuelLogs.length} Refills</div>
            <span className="text-[10px] text-slate-400 block font-medium">Logged this fiscal year</span>
          </div>
        </div>

        {/* Charts Grid visualizers */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Monthly Fuel Cost Chart */}
          <div className="rounded-xl border border-slate-850 bg-slate-900/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Monthly Refill Cost & Liters</h3>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Year {selectedYear}</span>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#f8fafc" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area name="Cost ($)" type="monotone" dataKey="fuelCost" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorCost)" strokeWidth={2} />
                  <Area name="Liters" type="monotone" dataKey="fuelLiters" stroke="#0ea5e9" fill="none" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mileage Trend Line Chart (FR-FUEL-03) */}
          <div className="rounded-xl border border-slate-850 bg-slate-900/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Mileage Efficiency Trend</h3>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Avg km/L</span>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorMileage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#f8fafc" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area name="Mileage (km/L)" type="monotone" dataKey="mileage" stroke="#10b981" fillOpacity={1} fill="url(#colorMileage)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Efficiency Comparison Bar Chart */}
          <div className="rounded-xl border border-slate-850 bg-slate-900/10 p-5 space-y-4 md:col-span-2">
            <h3 className="font-bold text-white text-sm">Per-Vehicle Fuel Efficiency Comparison (km/L)</h3>
            <div className="h-72 w-full">
              {vehicleComparisonData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-slate-500 italic">No mileage comparison data available.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vehicleComparisonData}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#f8fafc" }} />
                    <Bar name="Efficiency (km/L)" dataKey="efficiency" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                      {vehicleComparisonData.map((entry, index) => (
                        <span key={index}></span>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Verification Queue & Recent Logs */}
        <div className="rounded-xl border border-slate-850 bg-slate-900/10 p-5 space-y-4">
          <h3 className="font-bold text-white text-sm">Odometer photo verification queue & logs</h3>
          
          <div className="overflow-hidden rounded-lg border border-slate-800">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Fetching verification log lines...</div>
            ) : fuelLogs.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No logs found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 text-xs font-semibold">
                      <th className="p-3">Fuel Date</th>
                      <th className="p-3">Vehicle</th>
                      <th className="p-3">Driver</th>
                      <th className="p-3">Odometer (km)</th>
                      <th className="p-3">Refill Volume</th>
                      <th className="p-3">Calculated Efficiency</th>
                      <th className="p-3">Odo Photo Preview</th>
                      <th className="p-3 text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs text-slate-350">
                    {fuelLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/20 transition-colors">
                        <td className="p-3 font-medium">{new Date(log.fuelDate).toLocaleDateString()}</td>
                        <td className="p-3 font-semibold text-slate-200">{log.vehicleId?.regNumber || "N/A"}</td>
                        <td className="p-3 text-slate-400">{log.driverId?.name || "N/A"}</td>
                        <td className="p-3 font-mono">{log.odoReading.toLocaleString()}</td>
                        <td className="p-3 font-semibold">{log.liters} L (${log.totalCost.toFixed(2)})</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-semibold ${
                            log.mileageCalculated >= 5 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}>
                            {log.mileageCalculated.toFixed(2)} km/L
                          </span>
                        </td>
                        <td className="p-3">
                          {log.odoPhotoUrl ? (
                            <a
                              href={log.odoPhotoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300 hover:underline font-bold"
                            >
                              <ExternalLink className="h-3 w-3" /> View Photo
                            </a>
                          ) : (
                            <span className="text-slate-600 italic">No photo</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {log.isOdoPhotoVerified ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                              <Check className="h-3.5 w-3.5" /> Verified
                            </span>
                          ) : log.odoPhotoUrl ? (
                            <button
                              onClick={() => handleVerifyOdo(log.id)}
                              className="inline-flex items-center gap-1 rounded bg-violet-600 px-2.5 py-1 text-2xs font-bold text-white hover:bg-violet-500 transition-colors"
                            >
                              Verify Odo
                            </button>
                          ) : (
                            <span className="text-slate-500 font-semibold">Pending upload</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
