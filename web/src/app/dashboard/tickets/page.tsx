"use client";

import React, { useEffect, useState, useCallback } from "react";
import { 
  Wrench, 
  User, 
  Truck, 
  AlertTriangle
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import TicketDetailModal from "@/components/TicketDetailModal";
import { TicketStatus, TicketType } from "@fleetmaster/shared";
import io from "socket.io-client";

interface TicketCard {
  id: string;
  ticketNumber: string;
  vehicleId: { id: string; regNumber: string };
  reportedById: { id: string; name: string };
  reportedByRole: string;
  type: TicketType;
  status: TicketStatus;
  description: string;
  odoAtReport: number;
  assignedToId?: { id: string; name: string };
  images: string[];
  voiceNoteUrl?: string;
  createdAt: string;
}

export default function TicketsPage() {
  const [columns, setColumns] = useState<{ [key: string]: TicketCard[] }>({
    [TicketStatus.OPEN]: [],
    [TicketStatus.ASSIGNED]: [],
    [TicketStatus.IN_PROGRESS]: [],
    [TicketStatus.SOLVED_PENDING_PAYMENT]: [],
    [TicketStatus.SOLVED]: [],
    [TicketStatus.CLOSED]: [],
  });

  const [vehicles, setVehicles] = useState<{ id: string; regNumber: string }[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedType, setSelectedType] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  const fetchKanbanData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = `/tickets/kanban?vehicleId=${selectedVehicle}&type=${selectedType}`;
      const data = await apiRequest(query);
      setColumns(data.kanban || {});
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to load Kanban tickets.");
    } finally {
      setLoading(false);
    }
  }, [selectedVehicle, selectedType]);

  const fetchVehicles = useCallback(async () => {
    try {
      const data = await apiRequest("/vehicles");
      setVehicles(data.vehicles || []);
    } catch (err) {
      console.error("Failed to load vehicles list:", err);
    }
  }, []);

  // Initialize Socket connection for live dashboard alerts
  useEffect(() => {
    fetchVehicles();
    fetchKanbanData();

    const socket = io("http://localhost:5000");
    
    socket.on("notification", (data: { type: string; ticketId?: string; ticketNumber?: string; message?: string }) => {
      console.log("[Kanban Socket] Live alert received:", data);
      // Auto-reload board on any ticket actions
      if (
        data.type === "NEW_TICKET" ||
        data.type === "TICKET_ASSIGNED" ||
        data.type === "TICKET_SOLVED" ||
        data.type === "TICKET_CLOSED" ||
        data.type === "PREVENTIVE_TICKET"
      ) {
        fetchKanbanData();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchVehicles, fetchKanbanData]);

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    e.dataTransfer.setData("ticketId", ticketId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TicketStatus) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData("ticketId");
    if (!ticketId) return;

    // Find if the status actually changed
    let currentStatus: string | null = null;
    Object.keys(columns).forEach((status) => {
      if (columns[status].some((t) => t.id === ticketId)) {
        currentStatus = status;
      }
    });

    if (currentStatus === targetStatus) return;

    setError("");
    try {
      // API status shift logic
      if (targetStatus === TicketStatus.ASSIGNED) {
        // Requires assigning technician, open the detail modal instead
        setActiveTicketId(ticketId);
        alert("To transition to Assigned status, please select a technician inside the Ticket details.");
        return;
      }

      if (targetStatus === TicketStatus.CLOSED) {
        // Requires payment approval
        setActiveTicketId(ticketId);
        alert("To transition to Closed status, please approve payment inside the Ticket details.");
        return;
      }

      // Live status updates
      await apiRequest(`/tickets/${ticketId}/solve`, {
        method: "PUT",
        body: JSON.stringify({
          description: `Status transitioned via Kanban drag to ${targetStatus}`,
          partsUsed: [],
          laborCost: 0,
        }),
      });

      fetchKanbanData();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to update ticket status via Drag & Drop.");
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === TicketStatus.OPEN) return "Open Issue";
    if (status === TicketStatus.ASSIGNED) return "Assigned";
    if (status === TicketStatus.IN_PROGRESS) return "In Progress";
    if (status === TicketStatus.SOLVED_PENDING_PAYMENT) return "Solved (Pending)";
    if (status === TicketStatus.SOLVED) return "Solved / Fixed";
    return "Closed / Archive";
  };

  const getStatusColor = (status: string) => {
    if (status === TicketStatus.OPEN) return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    if (status === TicketStatus.ASSIGNED) return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (status === TicketStatus.IN_PROGRESS) return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    if (status === TicketStatus.SOLVED_PENDING_PAYMENT) return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    if (status === TicketStatus.SOLVED) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    return "bg-slate-800/40 text-slate-400 border-slate-700/30";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Maintenance Board</h1>
              <p className="text-xs text-slate-400 font-medium">Manage vehicle issues, mechanical solutions, and technicians Kanban dispatching</p>
            </div>
          </div>

          {/* Quick filters */}
          <div className="flex items-center gap-3 bg-slate-900/30 border border-slate-900 p-2 rounded-xl">
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="h-9 rounded-lg border border-slate-850 bg-slate-950 px-2 text-xs text-slate-350 outline-none focus:border-violet-500"
            >
              <option value="">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.regNumber}</option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-9 rounded-lg border border-slate-850 bg-slate-950 px-2 text-xs text-slate-350 outline-none focus:border-violet-500"
            >
              <option value="">All Categories</option>
              {Object.values(TicketType).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <button
              onClick={fetchKanbanData}
              className="bg-violet-600 hover:bg-violet-500 text-white font-semibold text-2xs h-9 px-3 rounded-lg"
            >
              Reload
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Kanban Board columns */}
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Syncing board cards...</div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-[1200px] h-[75vh]">
              {Object.keys(columns).map((status) => (
                <div
                  key={status}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, status as TicketStatus)}
                  className="flex-1 bg-slate-900/10 border border-slate-900/60 rounded-xl flex flex-col p-3 overflow-hidden min-w-[200px]"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className={`inline-flex items-center gap-1 rounded px-2.5 py-0.5 text-2xs font-semibold border ${getStatusColor(status)}`}>
                      {getStatusLabel(status)}
                    </span>
                    <span className="text-2xs text-slate-500 font-bold">{columns[status].length}</span>
                  </div>

                  {/* Cards Container */}
                  <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                    {columns[status].length === 0 ? (
                      <div className="border border-dashed border-slate-900 p-6 text-center text-2xs text-slate-600 rounded-lg">
                        Drop items here
                      </div>
                    ) : (
                      columns[status].map((ticket) => (
                        <div
                          key={ticket.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, ticket.id)}
                          onClick={() => setActiveTicketId(ticket.id)}
                          className="bg-slate-900/40 border border-slate-850 hover:border-slate-700 transition-all rounded-xl p-3.5 space-y-3 cursor-grab active:cursor-grabbing shadow-sm"
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-2xs font-extrabold text-violet-400 uppercase tracking-wide">
                              {ticket.type}
                            </span>
                            <span className="text-2xs text-slate-500 font-mono">
                              {ticket.ticketNumber}
                            </span>
                          </div>

                          <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                            {ticket.description}
                          </p>

                          <div className="h-px bg-slate-850"></div>

                          <div className="flex items-center justify-between text-2xs text-slate-500 font-semibold">
                            <div className="flex items-center gap-1">
                              <Truck className="h-3 w-3" />
                              <span>{ticket.vehicleId?.regNumber}</span>
                            </div>
                            
                            {ticket.assignedToId && (
                              <div className="flex items-center gap-1 text-slate-400">
                                <User className="h-3 w-3" />
                                <span>{ticket.assignedToId.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal display portal */}
        {activeTicketId && (
          <TicketDetailModal
            ticketId={activeTicketId}
            onClose={() => setActiveTicketId(null)}
            onRefresh={fetchKanbanData}
          />
        )}

      </div>
    </div>
  );
}
