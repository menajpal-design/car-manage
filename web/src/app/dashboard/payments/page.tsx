"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  DollarSign, 
  CheckCircle, 
  Download, 
  Search, 
  AlertTriangle,
  Eye
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { PaymentMethod, TransactionStatus, UserRole } from "@fleetmaster/shared";

interface PendingRecord {
  id: string;
  invoiceId: { id: string; invoiceNumber: string; totalAmount: number; vehicleId?: { regNumber: string } };
  ticketId: { id: string; ticketNumber: string; description: string };
  amount: number;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  createdAt: string;
}

interface TransactionRecord {
  id: string;
  invoiceId?: { invoiceNumber: string };
  ticketId?: { ticketNumber: string };
  amount: number;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  status: TransactionStatus;
  verifiedBy?: { name: string };
  createdAt: string;
  notes?: string;
}

export default function PaymentsPage() {
  const router = useRouter();

  // Tabs
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");

  // Pending verification states
  const [pendingList, setPendingList] = useState<PendingRecord[]>([]);
  const [selectedPending, setSelectedPending] = useState<PendingRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  // History states
  const [historyList, setHistoryList] = useState<TransactionRecord[]>([]);
  
  // History filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const checkUserAccess = useCallback(() => {
    const cached = localStorage.getItem("owner_profile");
    if (!cached) {
      router.push("/login");
      return;
    }
    const profile = JSON.parse(cached);

    // Limit access to Owner or Accountant only
    if (profile.role !== UserRole.OWNER && profile.role !== UserRole.ACCOUNTANT) {
      alert("Unauthorized access. Command restricted.");
      router.push("/");
    }
  }, [router]);

  const fetchPendingPayments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/payments/pending");
      setPendingList(data.pending || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to load pending payments.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTransactionHistory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = `/transactions?startDate=${startDate}&endDate=${endDate}&paymentMethod=${filterMethod}&status=${filterStatus}`;
      const data = await apiRequest(query);
      setHistoryList(data.transactions || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to load transaction history.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, filterMethod, filterStatus]);

  useEffect(() => {
    checkUserAccess();
  }, [checkUserAccess]);

  useEffect(() => {
    if (activeTab === "pending") {
      fetchPendingPayments();
    } else {
      fetchTransactionHistory();
    }
  }, [activeTab, fetchPendingPayments, fetchTransactionHistory]);

  const handleVerifyPayment = async (id: string) => {
    if (!confirm("Are you sure you want to verify this payment? This will close the ticket.")) return;
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/payments/${id}/verify`, { method: "PUT" });
      setSuccess("Payment verified successfully. Ticket closed.");
      setSelectedPending(null);
      fetchPendingPayments();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Verification failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPayment = async (id: string) => {
    if (!rejectReason.trim()) {
      alert("Please provide a rejection note/reason.");
      return;
    }
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/payments/${id}/reject`, {
        method: "PUT",
        body: JSON.stringify({ notes: rejectReason.trim() }),
      });
      setSuccess("Payment transaction rejected. Ticket remains open.");
      setSelectedPending(null);
      setRejectReason("");
      setShowRejectInput(false);
      fetchPendingPayments();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Rejection failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    // Generate CSV export link
    const query = `startDate=${startDate}&endDate=${endDate}&paymentMethod=${filterMethod}&status=${filterStatus}`;
    const exportUrl = `http://localhost:5000/api/transactions/export?${query}`;
    window.open(exportUrl, "_blank");
  };

  const filteredHistory = historyList.filter((tx) => {
    const term = searchTerm.toLowerCase();
    const invNum = tx.invoiceId?.invoiceNumber?.toLowerCase() || "";
    const tixNum = tx.ticketId?.ticketNumber?.toLowerCase() || "";
    const transId = tx.transactionId?.toLowerCase() || "";
    const notes = tx.notes?.toLowerCase() || "";
    return invNum.includes(term) || tixNum.includes(term) || transId.includes(term) || notes.includes(term);
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Payment Operations</h1>
              <p className="text-xs text-slate-400 font-medium">Verify incoming deposits, evaluate invoices, and manage transaction legers</p>
            </div>
          </div>

          {/* Tab toggles */}
          <div className="flex bg-slate-900/40 p-1 border border-slate-900 rounded-xl w-fit">
            <button
              onClick={() => { setActiveTab("pending"); setError(""); setSuccess(""); }}
              className={`h-9 px-4 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "pending"
                  ? "bg-violet-600 text-white shadow shadow-violet-600/15"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Pending Verification ({pendingList.length})
            </button>
            <button
              onClick={() => { setActiveTab("history"); setError(""); setSuccess(""); }}
              className={`h-9 px-4 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "history"
                  ? "bg-violet-600 text-white shadow shadow-violet-600/15"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Transaction Ledger
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

        {/* LOADING SHIM */}
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500 font-semibold animate-pulse">Syncing payment records...</div>
        ) : activeTab === "pending" ? (
          
          /* PENDING VERIFICATION PANEL (FR-PAY-04) */
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Verification Queue</h3>
              
              <div className="overflow-hidden rounded-xl border border-slate-900 bg-slate-900/20">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/50 border-b border-slate-900 text-slate-400 font-bold">
                      <th className="p-4">Invoice No</th>
                      <th className="p-4">Plate</th>
                      <th className="p-4">Payment Method</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Transaction ID</th>
                      <th className="p-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {pendingList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 italic">No mobile deposits pending verification.</td>
                      </tr>
                    ) : (
                      pendingList.map((rec) => (
                        <tr
                          key={rec.id}
                          onClick={() => { setSelectedPending(rec); setShowRejectInput(false); }}
                          className={`hover:bg-slate-900/30 transition-colors cursor-pointer ${
                            selectedPending?.id === rec.id ? "bg-slate-900/50 border-l-2 border-violet-500" : ""
                          }`}
                        >
                          <td className="p-4 font-bold text-slate-200">{rec.invoiceId?.invoiceNumber}</td>
                          <td className="p-4 text-slate-350">{rec.invoiceId?.vehicleId?.regNumber || "N/A"}</td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 font-bold uppercase text-[10px] text-violet-400 border border-violet-500/10">
                              {rec.paymentMethod}
                            </span>
                          </td>
                          <td className="p-4 font-semibold text-slate-200">${rec.amount?.toFixed(2)}</td>
                          <td className="p-4 font-mono text-slate-400">{rec.transactionId || "N/A"}</td>
                          <td className="p-4 text-slate-500">{new Date(rec.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Verification Detail Sidebar */}
            <div className="bg-slate-900/20 border border-slate-900 p-5 rounded-xl space-y-4 h-fit">
              <h3 className="text-xs font-bold text-white border-b border-slate-900 pb-2">Record Preview</h3>
              
              {!selectedPending ? (
                <div className="p-6 text-center text-xs text-slate-650 italic">Select a transaction row from the queue to verify details.</div>
              ) : (
                <div className="space-y-4 text-xs font-semibold">
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900 space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Invoice Reference</span>
                      <span className="text-white font-bold">{selectedPending.invoiceId?.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Owed Amount</span>
                      <span className="text-violet-400 font-bold">${selectedPending.amount?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Method selected</span>
                      <span className="text-white capitalize">{selectedPending.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Transaction ID</span>
                      <span className="text-amber-400 font-mono font-bold uppercase">{selectedPending.transactionId}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 block">Reported Maintenance Ticket</span>
                    <p className="text-slate-300 leading-normal bg-slate-950/20 p-3 rounded border border-slate-900">
                      <strong>{selectedPending.ticketId?.ticketNumber}</strong>: {selectedPending.ticketId?.description}
                    </p>
                  </div>

                  {/* Actions buttons */}
                  {!showRejectInput ? (
                    <div className="flex gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowRejectInput(true)}
                        className="flex-1 h-9 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 text-rose-450 border border-rose-500/20 font-bold text-2xs uppercase"
                      >
                        Reject Payment
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleVerifyPayment(selectedPending.id)}
                        className="flex-1 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-2xs uppercase flex items-center justify-center gap-1 shadow shadow-emerald-600/5"
                      >
                        Verify & Approve
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2 border-t border-slate-900 animate-in slide-in-from-bottom-2 duration-150">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-500 block">Rejection Reason</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Transaction code not found in statement"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 outline-none focus:border-violet-500"
                        />
                      </div>
                      <div className="flex gap-2 text-2xs font-bold uppercase">
                        <button
                          type="button"
                          onClick={() => setShowRejectInput(false)}
                          className="h-8 px-3 rounded bg-slate-950 border border-slate-850 text-slate-400"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleRejectPayment(selectedPending.id)}
                          className="h-8 px-4 rounded bg-rose-600 hover:bg-rose-500 text-white flex-1"
                        >
                          Confirm Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Printable Invoice Link */}
                  <div className="pt-2 border-t border-slate-900 text-center">
                    <a
                      href={`http://localhost:5000/api/invoices/${selectedPending.invoiceId?.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-violet-400 hover:underline"
                    >
                      <Eye className="h-3.5 w-3.5" /> Preview Invoice Document
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          
          /* TRANSACTION HISTORY PANEL (FR-PAY-04) */
          <div className="space-y-4">
            
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/20 border border-slate-900 p-4 rounded-xl text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-850 text-slate-350">
                  <Search className="h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search invoices, tickets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent outline-none border-none text-xs text-slate-200 placeholder-slate-550 w-44"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Method</span>
                  <select
                    value={filterMethod}
                    onChange={(e) => setFilterMethod(e.target.value)}
                    className="h-8 rounded bg-slate-950 border border-slate-850 px-2 text-xs outline-none"
                  >
                    <option value="">All</option>
                    <option value={PaymentMethod.CASH}>Cash</option>
                    <option value={PaymentMethod.BKASH}>bKash</option>
                    <option value={PaymentMethod.NAGAD}>Nagad</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Status</span>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="h-8 rounded bg-slate-950 border border-slate-850 px-2 text-xs outline-none"
                  >
                    <option value="">All</option>
                    <option value={TransactionStatus.COMPLETED}>Completed</option>
                    <option value={TransactionStatus.PENDING}>Pending</option>
                    <option value={TransactionStatus.REJECTED}>Rejected</option>
                  </select>
                </div>

                {/* Date pickers */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-8 rounded bg-slate-950 border border-slate-850 px-2 text-xs outline-none text-slate-300"
                  />
                  <span className="text-slate-650">➔</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-8 rounded bg-slate-950 border border-slate-850 px-2 text-xs outline-none text-slate-300"
                  />
                </div>
              </div>

              {/* Export ledger */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1 bg-violet-600 hover:bg-violet-500 text-white font-bold h-8.5 px-3 rounded-lg shadow shadow-violet-600/10 transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-slate-900 bg-slate-900/20 text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/50 border-b border-slate-900 text-slate-400 font-bold">
                    <th className="p-4">Invoice No</th>
                    <th className="p-4">Ticket No</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Method</th>
                    <th className="p-4">Transaction ID</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Notes / Audited By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 italic">No ledger transaction logs matched.</td>
                    </tr>
                  ) : (
                    filteredHistory.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-900/15 transition-colors">
                        <td className="p-4 font-bold text-slate-200">{tx.invoiceId?.invoiceNumber || "N/A"}</td>
                        <td className="p-4 text-slate-350">{tx.ticketId?.ticketNumber || "N/A"}</td>
                        <td className="p-4 font-semibold text-slate-200">${tx.amount?.toFixed(2)}</td>
                        <td className="p-4 capitalize">{tx.paymentMethod}</td>
                        <td className="p-4 font-mono text-slate-450 uppercase">{tx.transactionId || "N/A"}</td>
                        <td className="p-4 text-slate-500">{new Date(tx.createdAt).toLocaleDateString()}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-0.5 rounded px-2 py-0.5 font-bold uppercase text-[9px] border ${
                            tx.status === TransactionStatus.COMPLETED || tx.status === TransactionStatus.VERIFIED
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : tx.status === TransactionStatus.PENDING
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400 leading-normal">
                          {tx.notes && <p className="italic text-slate-500 text-3xs font-semibold mb-0.5">Note: {tx.notes}</p>}
                          {tx.verifiedBy && <p className="text-3xs text-slate-500">Auditor: {tx.verifiedBy.name}</p>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
