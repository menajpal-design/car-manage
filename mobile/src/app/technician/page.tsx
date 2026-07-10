"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Wrench, 
  Clock, 
  CheckCircle,
  Plus, 
  Trash,
  AlertTriangle,
  LogOut,
  Truck
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { TicketStatus, TicketType } from "@fleetmaster/shared";

interface PartItem {
  name: string;
  quantity: number;
  price: number;
}

interface TicketRecord {
  id: string;
  ticketNumber: string;
  vehicleId: { id: string; regNumber: string; brand: string; model: string };
  reportedById: { id: string; name: string };
  assignedToId?: { id: string; name: string; _id?: string } | string;
  type: TicketType;
  status: TicketStatus;
  description: string;
  odoAtReport: number;
  createdAt: string;
}

export default function TechnicianDashboard() {
  const router = useRouter();
  const [techName, setTechName] = useState("");
  
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);

  // Solution log form states
  const [solutionDesc, setSolutionDesc] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [partsUsed, setPartsUsed] = useState<PartItem[]>([]);

  // Status flags
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const loadProfileAndTickets = useCallback(async () => {
    setLoading(true);
    setError("");

    const cachedProfile = localStorage.getItem("driver_profile");
    if (!cachedProfile) {
      window.location.href = "/login";
      return;
    }

    const parsedProfile = JSON.parse(cachedProfile);
    setTechName(parsedProfile.name || "Technician");

    try {
      const ticketsData = await apiRequest("/tickets");
      const list = ticketsData.tickets || [];
      
      // Filter tickets assigned to this technician that are not closed
      const currentTechId = parsedProfile.id || parsedProfile._id;
      const assigned = list.filter((t: { assignedToId?: { id: string; name: string; _id?: string } | string; status: TicketStatus }) => {
        const assignedVal = t.assignedToId;
        const assignedId = typeof assignedVal === "object" && assignedVal ? (assignedVal.id || assignedVal._id) : assignedVal;
        return assignedId === currentTechId && t.status !== TicketStatus.CLOSED;
      });

      setTickets(assigned);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to load technician tickets.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadProfileAndTickets();
  }, [loadProfileAndTickets]);

  const handleAddPartRow = () => {
    setPartsUsed((prev) => [...prev, { name: "", quantity: 1, price: 0 }]);
  };

  const handleRemovePartRow = (index: number) => {
    setPartsUsed((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePartInputChange = (index: number, field: keyof PartItem, value: string | number) => {
    setPartsUsed((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: field === "name" ? value : Number(value),
      };
      return updated;
    });
  };

  // Live calculations
  const partsTotal = partsUsed.reduce((acc, p) => acc + (p.quantity * p.price), 0);
  const totalCost = partsTotal + Number(laborCost || 0);

  const handleSolutionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/tickets/${selectedTicket.id}/solve`, {
        method: "PUT",
        body: JSON.stringify({
          description: solutionDesc,
          partsUsed,
          laborCost: Number(laborCost || 0),
        }),
      });

      setSuccess("Solution logged. Billing Invoice generated successfully.");
      setSelectedTicket(null);
      setSolutionDesc("");
      setLaborCost("");
      setPartsUsed([]);
      loadProfileAndTickets();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to submit solution details.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("driver_profile");
    localStorage.removeItem("assigned_vehicle");
    localStorage.removeItem("owner_profile");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased p-4">
      <div className="max-w-md mx-auto space-y-4 pb-12">
        
        {/* Header portal */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Technician Portal</h2>
              <p className="text-[10px] text-slate-400 font-semibold">Logged in as: {techName}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-lg border border-slate-900 hover:border-slate-800 text-slate-450 hover:text-slate-200 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* Notices */}
        {success && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <CheckCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
            <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading your tickets...</div>
        ) : !selectedTicket ? (
          
          /* TICKETS LIST VIEW */
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">My Assigned Tickets ({tickets.length})</h3>
            
            {tickets.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-900 rounded-xl text-center text-sm text-slate-500 italic bg-slate-950/20">
                No active maintenance tickets assigned to you.
              </div>
            ) : (
              <div className="grid gap-3">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className="p-4 rounded-xl border border-slate-900 bg-slate-900/30 hover:border-slate-800 transition-all cursor-pointer space-y-3"
                  >
                    <div className="flex items-center justify-between text-2xs">
                      <span className="font-extrabold text-violet-400 uppercase tracking-wider">{t.type}</span>
                      <span className={`px-2 py-0.5 rounded-full font-semibold border ${
                        t.status === TicketStatus.SOLVED_PENDING_PAYMENT 
                          ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/25" 
                          : "bg-amber-500/10 text-amber-400 border-amber-500/25"
                      }`}>
                        {t.status === TicketStatus.SOLVED_PENDING_PAYMENT ? "Solved (Pending)" : t.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-sm font-bold text-slate-200">{t.ticketNumber}</span>
                      <p className="text-xs text-slate-400 line-clamp-2">{t.description}</p>
                    </div>

                    <div className="h-px bg-slate-900"></div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                      <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> {t.vehicleId?.regNumber} ({t.vehicleId?.brand} {t.vehicleId?.model})</span>
                      <span className="flex items-center gap-0.5"><Clock className="h-3.5 w-3.5" /> {new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          
          /* LOG SOLUTION DETAIL FORM VIEW */
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="text-xs text-violet-400 font-bold hover:underline"
              >
                Back to List
              </button>
              <span className="text-slate-600">/</span>
              <span className="text-xs font-semibold text-slate-350">Log Solution</span>
            </div>

            {/* Ticket Summary Card */}
            <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="font-bold text-slate-200">{selectedTicket.ticketNumber}</span>
                <span className="text-slate-500">{selectedTicket.vehicleId?.regNumber}</span>
              </div>
              <p className="text-slate-400">{selectedTicket.description}</p>
              <div className="text-[10px] text-slate-500">Reported Odometer: {selectedTicket.odoAtReport?.toLocaleString()} km</div>
            </div>

            {/* Solution Form */}
            <form onSubmit={handleSolutionSubmit} className="space-y-4">
              
              {/* Solution Description */}
              <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block">Solution & Action details</label>
                <textarea
                  required
                  rows={4}
                  value={solutionDesc}
                  onChange={(e) => setSolutionDesc(e.target.value)}
                  placeholder="Explain what steps were taken to resolve the mechanical problem..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-200 outline-none focus:border-violet-500 resize-none"
                />
              </div>

              {/* Cost Inputs */}
              <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl space-y-4">
                <h3 className="text-xs text-slate-400 font-bold uppercase tracking-wide">Maintenance Cost Logs</h3>
                
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-slate-500 uppercase tracking-wide">Labor Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    inputMode="decimal"
                    placeholder="0.00"
                    value={laborCost}
                    onChange={(e) => setLaborCost(e.target.value)}
                    className="h-11 w-full rounded-lg bg-slate-950 border border-slate-800 focus:border-violet-500 outline-none px-3 text-sm text-slate-200 font-bold"
                  />
                </div>
              </div>

              {/* Dynamic Parts List */}
              <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs text-slate-400 font-bold uppercase tracking-wide">Parts Replaced</h3>
                  <button
                    type="button"
                    onClick={handleAddPartRow}
                    className="inline-flex items-center gap-1 text-2xs text-violet-400 font-extrabold uppercase hover:underline"
                  >
                    <Plus className="h-3 w-3" /> Add Part
                  </button>
                </div>

                {partsUsed.length === 0 ? (
                  <span className="text-[10px] text-slate-500 italic block">No parts logged.</span>
                ) : (
                  <div className="space-y-3.5">
                    {partsUsed.map((part, index) => (
                      <div key={index} className="flex gap-2 items-center bg-slate-950/40 p-2.5 rounded-lg border border-slate-900/60 relative">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            required
                            placeholder="Part Name"
                            value={part.name}
                            onChange={(e) => handlePartInputChange(index, "name", e.target.value)}
                            className="h-8 w-full rounded bg-slate-950 border border-slate-800 outline-none px-2 text-2xs text-slate-250"
                          />
                          
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              required
                              placeholder="Qty"
                              value={part.quantity}
                              onChange={(e) => handlePartInputChange(index, "quantity", e.target.value)}
                              className="h-8 w-full rounded bg-slate-950 border border-slate-800 outline-none px-2 text-2xs text-slate-250 text-center"
                            />
                            <input
                              type="number"
                              step="0.01"
                              required
                              placeholder="Price"
                              value={part.price || ""}
                              onChange={(e) => handlePartInputChange(index, "price", e.target.value)}
                              className="h-8 w-full rounded bg-slate-950 border border-slate-800 outline-none px-2 text-2xs text-slate-250 text-center"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemovePartRow(index)}
                          className="p-1 rounded bg-rose-950/10 text-rose-450 hover:bg-rose-950/30 self-center"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Live Cost Summary Banner */}
              <div className="p-4 bg-slate-900 border border-slate-850 rounded-xl flex items-center justify-between text-xs font-bold text-slate-350">
                <span>Estimated Total Bill:</span>
                <span className="text-emerald-450 text-sm">${totalCost.toFixed(2)}</span>
              </div>

              {/* Submit Resolution */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold text-sm text-white disabled:opacity-50 transition-colors shadow-lg shadow-violet-600/10"
              >
                {submitting ? "Establishing solution & billing..." : "Resolve Ticket & Generate Invoice"}
              </button>

            </form>
          </div>
        )}

      </div>
    </div>
  );
}
