"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  X,
  Filter,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  FileText,
  Truck,
  AlertCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { apiRequest } from "@/lib/api";
import { ExpenseCategory, IncomeSource } from "@fleetmaster/shared";
import { useI18n } from "@/lib/i18n-context";

interface ExpenseRecord {
  id: string;
  vehicleId?: { id: string; regNumber: string };
  category: ExpenseCategory;
  amount: number;
  date: string;
  notes?: string;
  recordedBy?: { name: string };
  ticketId?: { ticketNumber: string };
}

interface IncomeRecord {
  id: string;
  vehicleId?: { id: string; regNumber: string };
  source: IncomeSource;
  amount: number;
  date: string;
  description: string;
  recordedBy?: { name: string };
}

interface VehicleOption {
  id: string;
  regNumber: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Fuel: "#f59e0b",
  Service: "#8b5cf6",
  Toll: "#3b82f6",
  Parking: "#10b981",
  DriverSalary: "#ec4899",
  HelperSalary: "#14b8a6",
  Tyre: "#ef4444",
  DocumentRenewal: "#6366f1",
  Other: "#64748b",
};

const INCOME_COLORS: Record<string, string> = {
  TripFare: "#10b981",
  MonthlyRent: "#3b82f6",
  Other: "#8b5cf6",
};

const PIE_COLORS = Object.values(CATEGORY_COLORS);

export default function ExpensesPage() {
  const { tr } = useI18n();

  const [activeTab, setActiveTab] = useState<"expenses" | "income">("expenses");
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);

  // Filters
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Totals
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);

  // Chart data
  const [categoryPieData, setCategoryPieData] = useState<{ name: string; value: number }[]>([]);
  const [monthlyBarData, setMonthlyBarData] = useState<{ name: string; expenses: number; income: number }[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);

  // Expense form
  const [expenseForm, setExpenseForm] = useState({
    vehicleId: "",
    category: ExpenseCategory.OTHER,
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    odoReading: "",
    notes: "",
  });
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [expenseError, setExpenseError] = useState("");
  const [expenseSuccess, setExpenseSuccess] = useState("");

  // Income form
  const [incomeForm, setIncomeForm] = useState({
    vehicleId: "",
    source: IncomeSource.TRIP_FARE,
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    description: "",
  });
  const [incomeLoading, setIncomeLoading] = useState(false);
  const [incomeError, setIncomeError] = useState("");
  const [incomeSuccess, setIncomeSuccess] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filterVehicle) params.set("vehicleId", filterVehicle);
      if (filterCategory) params.set("category", filterCategory);
      if (filterStartDate) params.set("startDate", filterStartDate);
      if (filterEndDate) params.set("endDate", filterEndDate);

      const [expData, incData, vehData] = await Promise.all([
        apiRequest(`/expenses?${params.toString()}`),
        apiRequest(`/incomes?${params.toString()}`),
        apiRequest("/vehicles"),
      ]);

      const expList: ExpenseRecord[] = expData.expenses || [];
      const incList: IncomeRecord[] = incData.incomes || [];
      const vehList: VehicleOption[] = (vehData.vehicles || []).map((v: { id?: string; _id?: string; regNumber: string }) => ({
        id: v.id || v._id || "",
        regNumber: v.regNumber,
      }));

      setExpenses(expList);
      setIncomes(incList);
      setVehicles(vehList);

      const tExp = expList.reduce((s, e) => s + e.amount, 0);
      const tInc = incList.reduce((s, i) => s + i.amount, 0);
      setTotalExpenses(tExp);
      setTotalIncome(tInc);

      // Category pie
      const catMap: Record<string, number> = {};
      expList.forEach((e) => {
        catMap[e.category] = (catMap[e.category] || 0) + e.amount;
      });
      setCategoryPieData(
        Object.entries(catMap)
          .filter(([, v]) => v > 0)
          .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      );

      // Monthly bar data (last 6 months)
      const months: { name: string; expenses: number; income: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const label = d.toLocaleString("default", { month: "short" });
        const yr = d.getFullYear();
        const mo = d.getMonth();
        const mExp = expList
          .filter((e) => {
            const ed = new Date(e.date);
            return ed.getFullYear() === yr && ed.getMonth() === mo;
          })
          .reduce((s, e) => s + e.amount, 0);
        const mInc = incList
          .filter((inc) => {
            const id = new Date(inc.date);
            return id.getFullYear() === yr && id.getMonth() === mo;
          })
          .reduce((s, inc) => s + inc.amount, 0);
        months.push({ name: label, expenses: Number(mExp.toFixed(2)), income: Number(mInc.toFixed(2)) });
      }
      setMonthlyBarData(months);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [filterVehicle, filterCategory, filterStartDate, filterEndDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseLoading(true);
    setExpenseError("");
    setExpenseSuccess("");
    try {
      await apiRequest("/expenses", {
        method: "POST",
        body: JSON.stringify({
          ...expenseForm,
          amount: Number(expenseForm.amount),
          odoReading: expenseForm.odoReading ? Number(expenseForm.odoReading) : undefined,
        }),
      });
      setExpenseSuccess("Expense logged successfully!");
      setExpenseForm({
        vehicleId: "",
        category: ExpenseCategory.OTHER,
        amount: "",
        date: new Date().toISOString().slice(0, 10),
        odoReading: "",
        notes: "",
      });
      fetchData();
      setTimeout(() => {
        setShowExpenseModal(false);
        setExpenseSuccess("");
      }, 1500);
    } catch (err) {
      setExpenseError(err instanceof Error ? err.message : "Failed to log expense.");
    } finally {
      setExpenseLoading(false);
    }
  };

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIncomeLoading(true);
    setIncomeError("");
    setIncomeSuccess("");
    try {
      await apiRequest("/incomes", {
        method: "POST",
        body: JSON.stringify({
          ...incomeForm,
          amount: Number(incomeForm.amount),
        }),
      });
      setIncomeSuccess("Income logged successfully!");
      setIncomeForm({
        vehicleId: "",
        source: IncomeSource.TRIP_FARE,
        amount: "",
        date: new Date().toISOString().slice(0, 10),
        description: "",
      });
      fetchData();
      setTimeout(() => {
        setShowIncomeModal(false);
        setIncomeSuccess("");
      }, 1500);
    } catch (err) {
      setIncomeError(err instanceof Error ? err.message : "Failed to log income.");
    } finally {
      setIncomeLoading(false);
    }
  };

  const netBalance = totalIncome - totalExpenses;

  const inputCls =
    "w-full h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500 transition-colors";
  const labelCls = "block text-xs font-semibold text-slate-400 mb-1";

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">{tr.expenses.title}</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Track all fleet expenses and income streams
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="h-9 w-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-rose-600/20"
          >
            <Plus className="h-4 w-4" />
            {tr.expenses.addExpense}
          </button>
          <button
            onClick={() => setShowIncomeModal(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-emerald-600/20"
          >
            <Plus className="h-4 w-4" />
            {tr.expenses.addIncome}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {tr.expenses.totalExpenses}
            </span>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <ArrowDownRight className="h-4 w-4 text-rose-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-400">
            ৳{totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {tr.expenses.totalIncome}
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400">
            ৳{totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {tr.expenses.netBalance}
            </span>
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                netBalance >= 0 ? "bg-violet-500/10" : "bg-rose-500/10"
              }`}
            >
              <Wallet
                className={`h-4 w-4 ${netBalance >= 0 ? "text-violet-400" : "text-rose-400"}`}
              />
            </div>
          </div>
          <p
            className={`text-2xl font-black ${
              netBalance >= 0 ? "text-violet-400" : "text-rose-400"
            }`}
          >
            {netBalance < 0 ? "-" : ""}৳
            {Math.abs(netBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-200 mb-4">6-Month Trend</h3>
          {monthlyBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyBarData} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#f1f5f9" }}
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
                <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-600 text-sm">
              No data to chart
            </div>
          )}
        </div>

        {/* Expense Category Pie */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-200 mb-4">Expense by Category</h3>
          {categoryPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={categoryPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {categoryPieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CATEGORY_COLORS[entry.name] || PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#f1f5f9" }}
                  formatter={(v: number) => [`৳${v.toFixed(2)}`, "Amount"]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-600 text-sm">
              No expenses yet
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filters</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <select
            value={filterVehicle}
            onChange={(e) => setFilterVehicle(e.target.value)}
            className={inputCls}
          >
            <option value="">All Vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.regNumber}
              </option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={inputCls}
          >
            <option value="">All Categories</option>
            {Object.values(ExpenseCategory).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            className={inputCls}
            placeholder="Start Date"
          />
          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            className={inputCls}
            placeholder="End Date"
          />
        </div>
      </div>

      {/* Tabs + Tables */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab("expenses")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              activeTab === "expenses"
                ? "text-rose-400 border-b-2 border-rose-400 bg-rose-500/5"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Expenses ({expenses.length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab("income")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              activeTab === "income"
                ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Income ({incomes.length})
            </span>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="m-4 flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm animate-pulse">
            Loading records...
          </div>
        ) : activeTab === "expenses" ? (
          <div className="overflow-x-auto">
            {expenses.length === 0 ? (
              <div className="p-12 text-center text-slate-600 text-sm">
                No expense records found. Add one above.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-800">
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Vehicle
                    </th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                      Notes
                    </th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-slate-300 text-xs">
                        {new Date(exp.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {exp.vehicleId ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-300">
                            <Truck className="h-3 w-3 text-slate-500" />
                            {exp.vehicleId.regNumber}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            backgroundColor:
                              (CATEGORY_COLORS[exp.category] || "#64748b") + "20",
                            color: CATEGORY_COLORS[exp.category] || "#94a3b8",
                          }}
                        >
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-rose-400">
                        ৳{exp.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell max-w-[180px] truncate">
                        {exp.notes || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                        {exp.ticketId ? (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {exp.ticketId.ticketNumber}
                          </span>
                        ) : exp.recordedBy ? (
                          exp.recordedBy.name
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {incomes.length === 0 ? (
              <div className="p-12 text-center text-slate-600 text-sm">
                No income records found. Add one above.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-800">
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Vehicle
                    </th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                      Description
                    </th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                      Recorded By
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {incomes.map((inc) => (
                    <tr key={inc.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-slate-300 text-xs">
                        {new Date(inc.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {inc.vehicleId ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-300">
                            <Truck className="h-3 w-3 text-slate-500" />
                            {inc.vehicleId.regNumber}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            backgroundColor:
                              (INCOME_COLORS[inc.source] || "#64748b") + "20",
                            color: INCOME_COLORS[inc.source] || "#94a3b8",
                          }}
                        >
                          {inc.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-400">
                        ৳{inc.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell max-w-[200px] truncate">
                        {inc.description}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                        {inc.recordedBy?.name || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ── Add Expense Modal ── */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="font-bold text-slate-200 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-rose-400" />
                {tr.expenses.addExpense}
              </h3>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="text-slate-500 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleExpenseSubmit} className="p-5 space-y-3">
              {expenseError && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {expenseError}
                </div>
              )}
              {expenseSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                  {expenseSuccess}
                </div>
              )}

              <div>
                <label className={labelCls}>Vehicle *</label>
                <select
                  required
                  value={expenseForm.vehicleId}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, vehicleId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.regNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Category *</label>
                  <select
                    required
                    value={expenseForm.category}
                    onChange={(e) =>
                      setExpenseForm((p) => ({ ...p, category: e.target.value as ExpenseCategory }))
                    }
                    className={inputCls}
                  >
                    {Object.values(ExpenseCategory).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Amount (৳) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Date *</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm((p) => ({ ...p, date: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Odometer (km)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Optional"
                    value={expenseForm.odoReading}
                    onChange={(e) => setExpenseForm((p) => ({ ...p, odoReading: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Notes</label>
                <textarea
                  placeholder="Optional notes..."
                  rows={2}
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500 transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 h-9 rounded-lg border border-slate-700 text-slate-400 text-sm font-semibold hover:bg-slate-800 transition-colors"
                >
                  {tr.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={expenseLoading}
                  className="flex-1 h-9 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                >
                  {expenseLoading ? "Saving..." : "Log Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Income Modal ── */}
      {showIncomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="font-bold text-slate-200 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                {tr.expenses.addIncome}
              </h3>
              <button
                onClick={() => setShowIncomeModal(false)}
                className="text-slate-500 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleIncomeSubmit} className="p-5 space-y-3">
              {incomeError && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {incomeError}
                </div>
              )}
              {incomeSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                  {incomeSuccess}
                </div>
              )}

              <div>
                <label className={labelCls}>Vehicle *</label>
                <select
                  required
                  value={incomeForm.vehicleId}
                  onChange={(e) => setIncomeForm((p) => ({ ...p, vehicleId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.regNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Income Source *</label>
                  <select
                    required
                    value={incomeForm.source}
                    onChange={(e) =>
                      setIncomeForm((p) => ({ ...p, source: e.target.value as IncomeSource }))
                    }
                    className={inputCls}
                  >
                    {Object.values(IncomeSource).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Amount (৳) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={incomeForm.amount}
                    onChange={(e) => setIncomeForm((p) => ({ ...p, amount: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Date *</label>
                <input
                  type="date"
                  required
                  value={incomeForm.date}
                  onChange={(e) => setIncomeForm((p) => ({ ...p, date: e.target.value }))}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Description *</label>
                <textarea
                  required
                  placeholder="e.g. Trip fare from Dhaka to Chittagong..."
                  rows={2}
                  value={incomeForm.description}
                  onChange={(e) => setIncomeForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500 transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowIncomeModal(false)}
                  className="flex-1 h-9 rounded-lg border border-slate-700 text-slate-400 text-sm font-semibold hover:bg-slate-800 transition-colors"
                >
                  {tr.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={incomeLoading}
                  className="flex-1 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                >
                  {incomeLoading ? "Saving..." : "Log Income"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
