"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  X, 
  Download, 
  AlertTriangle,
  CheckCircle,
  Filter
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { apiRequest, getBaseUrl } from "@/lib/api";
import { ExpenseCategory, IncomeSource } from "@fleetmaster/shared";

interface VehicleRecord {
  id: string;
  regNumber: string;
}

interface ExpenseRecord {
  id: string;
  vehicleId?: { regNumber: string };
  category: ExpenseCategory;
  amount: number;
  date: string;
  notes?: string;
}

interface IncomeRecord {
  id: string;
  vehicleId?: { regNumber: string };
  source: IncomeSource;
  amount: number;
  date: string;
  description: string;
}

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6", "#6366f1", "#64748b"];

interface FuelTrendItem {
  name: string;
  fuelCost: number;
  fuelLiters: number;
  mileage: number;
}

interface ExpenseBreakdownItem {
  name: string;
  value: number;
}

interface ExpenseTrendItem {
  name: string;
  amount: number;
}

export default function AnalyticsPage() {
  const router = useRouter();

  // General Filter options
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState("");

  // Report States
  const [plSummary, setPlSummary] = useState({
    totalRevenues: 0,
    totalExpenditures: 0,
    netProfit: 0,
    incomes: [] as IncomeRecord[],
    expenses: [] as ExpenseRecord[],
  });

  const [fuelTrend, setFuelTrend] = useState<FuelTrendItem[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseBreakdownItem[]>([]);
  const [expenseTrend, setExpenseTrend] = useState<ExpenseTrendItem[]>([]);

  // Modal / Input Drawer States
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    vehicleId: "",
    category: ExpenseCategory.OTHER,
    amount: "",
    date: new Date().toISOString().split("T")[0],
    odoReading: "",
    notes: "",
  });
  const [incomeForm, setIncomeForm] = useState({
    vehicleId: "",
    source: IncomeSource.TRIP_FARE,
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const checkAccess = useCallback(() => {
    const cached = localStorage.getItem("owner_profile");
    if (!cached) {
      router.push("/login");
      return;
    }
    const profile = JSON.parse(cached);
    if (profile.role !== "owner" && profile.role !== "accountant") {
      alert("Unauthorized entry.");
      router.push("/");
    }
  }, [router]);

  const fetchDropdowns = useCallback(async () => {
    try {
      const data = await apiRequest("/vehicles");
      setVehicles(data.vehicles || []);
    } catch (err) {
      console.error("Failed to load vehicle options", err);
    }
  }, []);

  const fetchFinancials = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch Profit & Loss ledger summary
      const query = `/reports/profit-loss?vehicleId=${selectedVehicle}&month=${selectedMonth}&year=${selectedYear}`;
      const plData = await apiRequest(query);
      setPlSummary(plData);

      // 2. Fetch Fuel efficiency/mileage analytics trend
      const fuelQuery = `/fuel-logs/mileage-trend?vehicleId=${selectedVehicle}&year=${selectedYear}`;
      const fuelData = await apiRequest(fuelQuery);
      setFuelTrend(fuelData.trend || []);

      // 3. Fetch Category-wise expense breakdown
      const expBreakQuery = `/reports/expense-breakdown?month=${selectedMonth}&year=${selectedYear}`;
      const expBreakData = await apiRequest(expBreakQuery);
      setExpenseBreakdown(expBreakData.breakdown || []);
      setExpenseTrend(expBreakData.trend || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to load financial report data.");
    } finally {
      setLoading(false);
    }
  }, [selectedVehicle, selectedMonth, selectedYear]);

  useEffect(() => {
    checkAccess();
    fetchDropdowns();
  }, [checkAccess, fetchDropdowns]);

  useEffect(() => {
    fetchFinancials();
  }, [fetchFinancials]);

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!expenseForm.vehicleId || !expenseForm.amount) {
      alert("Please select vehicle and specify expense amount.");
      return;
    }
    setActionLoading(true);
    try {
      await apiRequest("/expenses", {
        method: "POST",
        body: JSON.stringify({
          ...expenseForm,
          amount: Number(expenseForm.amount),
          odoReading: expenseForm.odoReading ? Number(expenseForm.odoReading) : undefined,
        }),
      });
      setSuccess("Expense record created successfully.");
      setShowExpenseModal(false);
      setExpenseForm({
        vehicleId: "",
        category: ExpenseCategory.OTHER,
        amount: "",
        date: new Date().toISOString().split("T")[0],
        odoReading: "",
        notes: "",
      });
      fetchFinancials();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to log expense.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!incomeForm.vehicleId || !incomeForm.amount || !incomeForm.description) {
      alert("Please complete vehicle, amount, and description fields.");
      return;
    }
    setActionLoading(true);
    try {
      await apiRequest("/incomes", {
        method: "POST",
        body: JSON.stringify({
          ...incomeForm,
          amount: Number(incomeForm.amount),
        }),
      });
      setSuccess("Income record logged successfully.");
      setShowIncomeModal(false);
      setIncomeForm({
        vehicleId: "",
        source: IncomeSource.TRIP_FARE,
        amount: "",
        date: new Date().toISOString().split("T")[0],
        description: "",
      });
      fetchFinancials();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to log income.");
    } finally {
      setActionLoading(false);
    }
  };

  const triggerPDFDownload = () => {
    const query = `vehicleId=${selectedVehicle}&month=${selectedMonth}&year=${selectedYear}`;
    const downloadUrl = `${getBaseUrl()}/reports/profit-loss/pdf?${query}`;
    window.open(downloadUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Title bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-900 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Financial Intelligence</h1>
              <p className="text-xs text-slate-400 font-medium">Profit & Loss ledger audits, fuel consumption mileage trends, and cost reports</p>
            </div>
          </div>

          <div className="flex gap-2 text-2xs uppercase font-bold">
            <button
              onClick={() => setShowExpenseModal(true)}
              className="inline-flex items-center gap-1 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 h-9 px-4 rounded-xl"
            >
              <Plus className="h-3.5 w-3.5" /> Record Expense
            </button>
            <button
              onClick={() => setShowIncomeModal(true)}
              className="inline-flex items-center gap-1 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-450 border border-emerald-500/20 h-9 px-4 rounded-xl"
            >
              <Plus className="h-3.5 w-3.5" /> Record Income
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-450 text-xs">
            <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2.5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 text-xs">
            <CheckCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Dynamic Filters panel */}
        <div className="flex flex-wrap items-center gap-4 bg-slate-900/20 border border-slate-900 p-4 rounded-xl text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-violet-400" />
            <span className="text-slate-400">Ledger Filters:</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-500 uppercase text-[10px]">Vehicle</span>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="h-8.5 rounded bg-slate-950 border border-slate-850 px-2 text-xs outline-none text-slate-200"
            >
              <option value="">All Fleet Vehicles</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.regNumber}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-500 uppercase text-[10px]">Year</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-8.5 rounded bg-slate-950 border border-slate-850 px-2 text-xs outline-none text-slate-200"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-500 uppercase text-[10px]">Month</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-8.5 rounded bg-slate-950 border border-slate-850 px-2 text-xs outline-none text-slate-200"
            >
              <option value="">Full Year</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>

          <button
            onClick={triggerPDFDownload}
            className="ml-auto inline-flex items-center gap-1 bg-violet-600 hover:bg-violet-500 text-white font-bold h-8.5 px-3.5 rounded-lg shadow transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Export P&L PDF
          </button>
        </div>

        {/* Overview cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-900 bg-slate-900/30 p-5 space-y-2.5">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Period Revenue</span>
              <ArrowUpRight className="h-4.5 w-4.5 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">${plSummary.totalRevenues?.toFixed(2)}</h3>
            <p className="text-[10px] text-slate-500">Trip fares and custom leases</p>
          </div>

          <div className="rounded-xl border border-slate-900 bg-slate-900/30 p-5 space-y-2.5">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Period Expenditure</span>
              <ArrowDownRight className="h-4.5 w-4.5 text-rose-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">${plSummary.totalExpenditures?.toFixed(2)}</h3>
            <p className="text-[10px] text-slate-500">Fuel, maintenance, salaries and tolls</p>
          </div>

          <div className="rounded-xl border border-slate-900 bg-slate-900/30 p-5 space-y-2.5">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Net Profit Balance</span>
              <div className={`h-2.5 w-2.5 rounded-full ${plSummary.netProfit >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}></div>
            </div>
            <h3 className={`text-2xl font-bold ${plSummary.netProfit >= 0 ? "text-emerald-450" : "text-rose-455"}`}>
              ${plSummary.netProfit?.toFixed(2)}
            </h3>
            <p className="text-[10px] text-slate-500">Post-expenditures surplus</p>
          </div>
        </div>

        {/* Charts & Visualization Grids */}
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-550 font-semibold animate-pulse">Running financial analysis matrices...</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            
            {/* FUEL MILEAGE TRENDS */}
            <div className="bg-slate-900/10 border border-slate-900 p-5 rounded-xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Fuel Cost & Efficiency Trend</h3>
                <p className="text-[10px] text-slate-500 font-semibold">Monthly refuel cost vs mileage efficiency ratios</p>
              </div>
              
              <div className="h-64 text-slate-400 text-xs">
                {fuelTrend.length === 0 ? (
                  <div className="h-full flex items-center justify-center italic text-slate-650">No refuel logs cataloged.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={fuelTrend}>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                      <XAxis dataKey="name" stroke="#64748b" />
                      <YAxis yAxisId="left" stroke="#64748b" />
                      <YAxis yAxisId="right" orientation="right" stroke="#64748b" />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }} />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="fuelCost" name="Fuel Cost ($)" stroke="#ec4899" strokeWidth={2} activeDot={{ r: 6 }} />
                      <Line yAxisId="right" type="monotone" dataKey="mileage" name="Mileage (km/L)" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* EXPENSE CATEGORY BREAKDOWN */}
            <div className="bg-slate-900/10 border border-slate-900 p-5 rounded-xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Expense Category Distribution</h3>
                <p className="text-[10px] text-slate-500 font-semibold">Percentage breakdown of fleet expenditure categories</p>
              </div>

              <div className="h-64 text-slate-400 text-xs flex flex-col sm:flex-row items-center gap-6 justify-center">
                {expenseBreakdown.length === 0 ? (
                  <div className="italic text-slate-650">No expense records found.</div>
                ) : (
                  <>
                    <div className="h-full w-48 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expenseBreakdown}
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {expenseBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex-1 grid grid-cols-2 gap-2 text-2xs">
                      {expenseBreakdown.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                          <span className="text-slate-400">{item.name}:</span>
                          <span className="text-white font-bold">${item.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* MONTHLY EXPENSE TRENDS */}
            <div className="bg-slate-900/10 border border-slate-900 p-5 rounded-xl space-y-4 lg:col-span-2">
              <div>
                <h3 className="text-sm font-bold text-white">Monthly Expense Trend</h3>
                <p className="text-[10px] text-slate-500 font-semibold">Total cost aggregates of month by month ledger entries</p>
              </div>

              <div className="h-60 text-slate-400 text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseTrend}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }} />
                    <Bar dataKey="amount" name="Total Expense ($)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ITEMISED TRANSACTION LEDGER (FR-RPT-03) */}
            <div className="bg-slate-900/10 border border-slate-900 p-5 rounded-xl space-y-4 lg:col-span-2">
              <div>
                <h3 className="text-sm font-bold text-white">Itemized Ledger Transaction Log</h3>
                <p className="text-[10px] text-slate-500 font-semibold">Listing all incomes and expenses registered under the filter criteria</p>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-900 bg-slate-950/20 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/40 border-b border-slate-900 text-slate-400 font-bold">
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">Vehicle</th>
                      <th className="p-3.5">Category / Source</th>
                      <th className="p-3.5">Amount</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Description / Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {plSummary.incomes.length === 0 && plSummary.expenses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 italic">No ledger inputs registered in this scope.</td>
                      </tr>
                    ) : (
                      <>
                        {/* Revenues list */}
                        {plSummary.incomes.map((inc) => (
                          <tr key={inc.id} className="hover:bg-slate-900/10 transition-colors">
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 font-bold uppercase text-[9px]">
                                Income
                              </span>
                            </td>
                            <td className="p-3.5 font-bold text-slate-350">{inc.vehicleId?.regNumber || "N/A"}</td>
                            <td className="p-3.5 font-semibold text-slate-200 capitalize">{inc.source}</td>
                            <td className="p-3.5 font-bold text-emerald-450">+${inc.amount?.toFixed(2)}</td>
                            <td className="p-3.5 text-slate-500">{new Date(inc.date).toLocaleDateString()}</td>
                            <td className="p-3.5 text-slate-400">{inc.description}</td>
                          </tr>
                        ))}

                        {/* Expenditures list */}
                        {plSummary.expenses.map((exp) => (
                          <tr key={exp.id} className="hover:bg-slate-900/10 transition-colors">
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-450 border border-rose-500/20 font-bold uppercase text-[9px]">
                                Expense
                              </span>
                            </td>
                            <td className="p-3.5 font-bold text-slate-350">{exp.vehicleId?.regNumber || "N/A"}</td>
                            <td className="p-3.5 font-semibold text-slate-200 capitalize">{exp.category}</td>
                            <td className="p-3.5 font-bold text-rose-450">-${exp.amount?.toFixed(2)}</td>
                            <td className="p-3.5 text-slate-500">{new Date(exp.date).toLocaleDateString()}</td>
                            <td className="p-3.5 text-slate-400">{exp.notes || "N/A"}</td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* EXPENSE LOG MODAL */}
        {showExpenseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                <h3 className="text-sm font-bold text-white">Record Manual Fleet Expense</h3>
                <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleExpenseSubmit} className="space-y-4 text-xs font-semibold">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase">Select Target Vehicle</label>
                  <select
                    required
                    value={expenseForm.vehicleId}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, vehicleId: e.target.value }))}
                    className="h-9 w-full rounded border border-slate-850 bg-slate-950 px-3 outline-none text-slate-200"
                  >
                    <option value="">-- Choose reg plate --</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.regNumber}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase">Category</label>
                    <select
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value as ExpenseCategory }))}
                      className="h-9 w-full rounded border border-slate-855 bg-slate-955 px-3 outline-none text-slate-200"
                    >
                      {Object.values(ExpenseCategory).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase">Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="h-9 w-full rounded border border-slate-850 bg-slate-950 px-3 outline-none text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase">Odometer reading (Optional)</label>
                    <input
                      type="number"
                      placeholder="Current km"
                      value={expenseForm.odoReading}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, odoReading: e.target.value }))}
                      className="h-9 w-full rounded border border-slate-850 bg-slate-950 px-3 outline-none text-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase">Date</label>
                    <input
                      type="date"
                      required
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                      className="h-9 w-full rounded border border-slate-850 bg-slate-950 px-3 outline-none text-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase">Description Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Highway toll recharge card, tire repair..."
                    value={expenseForm.notes}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="h-9 w-full rounded border border-slate-850 bg-slate-950 px-3 outline-none text-slate-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="h-9.5 w-full bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg uppercase text-2xs shadow shadow-violet-600/10"
                >
                  Save Expense Entry
                </button>
              </form>
            </div>
          </div>
        )}

        {/* INCOME LOG MODAL */}
        {showIncomeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                <h3 className="text-sm font-bold text-white">Record Manual Fleet Income</h3>
                <button onClick={() => setShowIncomeModal(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleIncomeSubmit} className="space-y-4 text-xs font-semibold">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase">Select Target Vehicle</label>
                  <select
                    required
                    value={incomeForm.vehicleId}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, vehicleId: e.target.value }))}
                    className="h-9 w-full rounded border border-slate-850 bg-slate-950 px-3 outline-none text-slate-200"
                  >
                    <option value="">-- Choose reg plate --</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.regNumber}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase">Income Source</label>
                    <select
                      value={incomeForm.source}
                      onChange={(e) => setIncomeForm(prev => ({ ...prev, source: e.target.value as IncomeSource }))}
                      className="h-9 w-full rounded border border-slate-855 bg-slate-955 px-3 outline-none text-slate-200"
                    >
                      {Object.values(IncomeSource).map(src => (
                        <option key={src} value={src}>{src}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase">Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={incomeForm.amount}
                      onChange={(e) => setIncomeForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="h-9 w-full rounded border border-slate-850 bg-slate-950 px-3 outline-none text-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase">Date</label>
                  <input
                    type="date"
                    required
                    value={incomeForm.date}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, date: e.target.value }))}
                    className="h-9 w-full rounded border border-slate-850 bg-slate-950 px-3 outline-none text-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase">Source Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fare from trip #TRIP-3029, monthly tenant contract..."
                    value={incomeForm.description}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, description: e.target.value }))}
                    className="h-9 w-full rounded border border-slate-850 bg-slate-950 px-3 outline-none text-slate-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="h-9.5 w-full bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg uppercase text-2xs shadow shadow-violet-600/10"
                >
                  Save Income Entry
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
