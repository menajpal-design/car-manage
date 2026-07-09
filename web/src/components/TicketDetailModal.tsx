"use client";

import React, { useEffect, useState, useCallback } from "react";
import { 
  X, 
  Wrench, 
  Download, 
  Play, 
  Pause,
  AlertTriangle
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { TicketStatus, UserRole, ITicket, IInvoice, IPartsUsed, ITicketActivity } from "@fleetmaster/shared";
import PaymentModal from "./PaymentModal";

interface TicketDetailModalProps {
  ticketId: string;
  onClose: () => void;
  onRefresh: () => void;
}

export default function TicketDetailModal({ ticketId, onClose, onRefresh }: TicketDetailModalProps) {
  const [ticket, setTicket] = useState<ITicket | null>(null);
  const [technicians, setTechnicians] = useState<{ id?: string; _id?: string; name: string; role: string; isActive: boolean }[]>([]);
  const [selectedTech, setSelectedTech] = useState("");
  const [invoice, setInvoice] = useState<IInvoice | null>(null);

  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  // Voice note audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const fetchTicketDetails = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest(`/tickets/${ticketId}`);
      setTicket(data.ticket);
      if (data.ticket.assignedToId) {
        setSelectedTech((data.ticket.assignedToId.id || data.ticket.assignedToId._id) || "");
      }

      // Fetch invoice if ticket is solved/closed
      if (
        data.ticket.status === TicketStatus.SOLVED_PENDING_PAYMENT ||
        data.ticket.status === TicketStatus.CLOSED
      ) {
        try {
          const invData = await apiRequest(`/invoices/ticket/${ticketId}`);
          setInvoice(invData.invoice);
        } catch {
          // No invoice registered yet
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to load ticket details.");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  const fetchTechnicians = useCallback(async () => {
    try {
      const usersData = await apiRequest("/users");
      const list = usersData.users || [];
      setTechnicians(list.filter((u: { role: string; isActive: boolean }) => u.role === UserRole.TECHNICIAN && u.isActive));
    } catch (err) {
      console.error("Failed to load technicians:", err);
    }
  }, []);

  useEffect(() => {
    fetchTicketDetails();
    fetchTechnicians();
  }, [fetchTicketDetails, fetchTechnicians]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
      }
    };
  }, [audio]);

  const handleAudioPlayToggle = () => {
    if (!ticket?.voiceNoteUrl) return;

    if (!audio) {
      const newAudio = new Audio(ticket.voiceNoteUrl);
      newAudio.onended = () => setIsPlaying(false);
      newAudio.play();
      setAudio(newAudio);
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play();
        setIsPlaying(true);
      }
    }
  };

  const handleAssignTechnician = async () => {
    if (!selectedTech) return;
    setActionLoading(true);
    setError("");
    try {
      await apiRequest(`/tickets/${ticketId}/assign`, {
        method: "PUT",
        body: JSON.stringify({ assignedToId: selectedTech }),
      });
      fetchTicketDetails();
      onRefresh();
      alert("Technician assigned and SMS notification dispatched.");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Assignment failed.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
          Loading ticket profiles database console...
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
          <p className="text-sm text-slate-400">Ticket not found or deleted.</p>
          <button onClick={onClose} className="text-xs text-violet-400 font-bold hover:underline">Close modal</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-850 px-6 py-4">
          <div>
            <span className="text-2xs font-extrabold uppercase tracking-wider text-violet-400">
              {ticket.type} Ticket
            </span>
            <h3 className="font-bold text-white text-base flex items-center gap-2 mt-0.5">
              <span>{ticket.ticketNumber}</span>
              <span className="text-xs text-slate-500 font-medium">({ticket.vehicleId?.regNumber})</span>
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-center gap-2.5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Details Overview */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Description</span>
                <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                  {ticket.description}
                </p>
              </div>

              {/* Voice Note Player */}
              {ticket.voiceNoteUrl && (
                <div className="p-3.5 bg-slate-950/20 border border-slate-850 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleAudioPlayToggle}
                      className="h-9 w-9 rounded-full bg-violet-600/15 border border-violet-500/25 flex items-center justify-center text-violet-400 hover:bg-violet-600 hover:text-white transition-all shadow-md shadow-violet-600/5"
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                    </button>
                    <div>
                      <span className="text-xs font-bold text-slate-200">Voice memo explanation</span>
                      <p className="text-[10px] text-slate-500 font-semibold">Click play to listen to audio report</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Media Gallery */}
              {ticket.images && ticket.images.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Attachments</span>
                  <div className="grid grid-cols-3 gap-2.5">
                    {ticket.images.map((img: string, idx: number) => (
                      <a 
                        key={idx} 
                        href={img} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="aspect-square rounded-xl overflow-hidden border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition-colors"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt="Attachment" className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar telemetry */}
            <div className="bg-slate-950/20 border border-slate-850 p-4 rounded-xl space-y-4 text-xs h-fit">
              <h4 className="font-bold text-white text-xs border-b border-slate-850 pb-2">Status & Specs</h4>
              
              <div className="space-y-3 font-medium">
                <div>
                  <span className="text-[10px] text-slate-500 block">Status</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 mt-0.5 text-2xs font-semibold ${
                    ticket.status === TicketStatus.OPEN ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                    ticket.status === TicketStatus.ASSIGNED ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                    ticket.status === TicketStatus.IN_PROGRESS ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                    ticket.status === TicketStatus.SOLVED_PENDING_PAYMENT ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                    "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}>
                    {ticket.status}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block">Reported By</span>
                  <span className="text-slate-200 capitalize">{ticket.reportedById?.name || "N/A"} ({ticket.reportedByRole})</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block">Report Odometer</span>
                  <span className="text-slate-200">{ticket.odoAtReport?.toLocaleString()} km</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block">Assigned Technician</span>
                  <span className="text-slate-200 font-semibold">{ticket.assignedToId ? ticket.assignedToId.name : "Unassigned"}</span>
                </div>
              </div>

              {/* Assignment Controls */}
              {ticket.status === TicketStatus.OPEN && (
                <div className="pt-2 border-t border-slate-850 space-y-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Assign Technician</span>
                  <div className="flex gap-2">
                    <select
                      value={selectedTech}
                      onChange={(e) => setSelectedTech(e.target.value)}
                      className="h-8 rounded-lg border border-slate-800 bg-slate-950 px-2 text-[11px] text-slate-200 outline-none focus:border-violet-500 flex-1"
                    >
                      <option value="">Choose Tech</option>
                      {technicians.map((t) => (
                        <option key={t.id || t._id} value={t.id || t._id}>{t.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleAssignTechnician}
                      className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-2xs px-3 rounded-lg disabled:opacity-50"
                    >
                      Assign
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Solution & Invoice Section (FR-TICKET-05A) */}
          {ticket.solution && (
            <div className="rounded-xl border border-slate-850 bg-slate-950/10 p-5 space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5"><Wrench className="h-4.5 w-4.5 text-slate-400" /> Resolution & Maintenance Billing</h3>
              
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Solution description</span>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/30 p-3 rounded-lg border border-slate-850/80">
                  {ticket.solution.description}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 text-xs">
                {/* Cost Summary */}
                <div className="bg-slate-900/30 border border-slate-850/80 p-4 rounded-lg space-y-2">
                  <h4 className="font-bold text-slate-200">Cost Summary</h4>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Labor Fee</span>
                    <span className="font-semibold text-slate-200">${ticket.solution.laborCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Parts Material Cost</span>
                    <span className="font-semibold text-slate-200">
                      ${(ticket.solution.totalCost - ticket.solution.laborCost).toFixed(2)}
                    </span>
                  </div>
                  <div className="h-px bg-slate-850 my-1"></div>
                  <div className="flex justify-between font-bold text-slate-100">
                    <span>Grand Total</span>
                    <span>${ticket.solution.totalCost.toFixed(2)}</span>
                  </div>
                </div>

                {/* Parts list */}
                <div className="bg-slate-900/30 border border-slate-850/80 p-4 rounded-lg space-y-2">
                  <h4 className="font-bold text-slate-200">Parts Used</h4>
                  {ticket.solution.partsUsed.length === 0 ? (
                    <span className="text-slate-600 italic block">No parts materials logged.</span>
                  ) : (
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {ticket.solution?.partsUsed.map((p: IPartsUsed, idx: number) => (
                        <div key={idx} className="flex justify-between text-slate-400">
                          <span>{p.name} (x{p.quantity})</span>
                          <span>${(p.quantity * p.price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Invoice Download Action */}
              {invoice && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs">
                  <span className="font-semibold text-indigo-400">Invoice {invoice.invoiceNumber} is {invoice.status}</span>
                  <a
                    href={`http://localhost:5000/api/invoices/${invoice.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-lg shadow shadow-indigo-600/10 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> Printable Invoice
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Activity Logs Timeline */}
          <div className="space-y-3">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Activity logs</span>
            <div className="relative border-l border-slate-800 ml-2 space-y-4 py-1">
              {ticket.activityLog.map((log: ITicketActivity, idx: number) => (
                <div key={idx} className="relative pl-5">
                  <span className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full bg-slate-900 border border-violet-500"></span>
                  <div className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{log.action}</span>
                      <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{log.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer controls */}
        {ticket.status === TicketStatus.SOLVED_PENDING_PAYMENT && (
          <div className="border-t border-slate-850 px-6 py-4 bg-slate-950/20 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="h-10 px-4 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={actionLoading || !invoice}
              onClick={() => setShowPayModal(true)}
              className="h-10 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
            >
              Pay Invoice
            </button>
          </div>
        )}

      </div>
      
      {showPayModal && invoice && (
        <PaymentModal
          invoice={invoice}
          ticket={ticket}
          onClose={() => setShowPayModal(false)}
          onSuccess={() => {
            fetchTicketDetails();
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
