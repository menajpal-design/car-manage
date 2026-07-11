"use client";

import React, { useState, useEffect } from "react";
import { 
  Power, 
  Compass, 
  Play, 
  CheckCircle2, 
  AlertOctagon, 
  Phone
} from "lucide-react";
import { TripStatus } from "@fleetmaster/shared";

interface DriverProfile {
  id: string;
  name: string;
  role: string;
  assignedVehicleId?: string;
}

export default function MobileHome() {
  const [isTracking, setIsTracking] = useState(false);
  const [tripStatus, setTripStatus] = useState<TripStatus>(TripStatus.SCHEDULED);
  const [coords, setCoords] = useState({ lat: 29.7604, lng: -95.3698 }); // Houston, TX coordinates
  const [profile, setProfile] = useState<DriverProfile | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem("driver_profile");
    if (cached) {
      setProfile(JSON.parse(cached));
    }
  }, []);

  // Simulate GPS coordinates updating when tracking is active
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking) {
      interval = setInterval(() => {
        setCoords(prev => ({
          lat: prev.lat + (Math.random() - 0.5) * 0.001,
          lng: prev.lng + (Math.random() - 0.5) * 0.001
        }));
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isTracking]);

  const handleStatusChange = () => {
    if (tripStatus === TripStatus.SCHEDULED) {
      setTripStatus(TripStatus.IN_PROGRESS);
      setIsTracking(true);
    } else if (tripStatus === TripStatus.IN_PROGRESS) {
      setTripStatus(TripStatus.COMPLETED);
      setIsTracking(false);
    } else {
      setTripStatus(TripStatus.SCHEDULED);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "FM";
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  return (
    <div className="w-full p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      {/* Driver Info Header Bar */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl">
        <div className="flex items-center gap-3">
          <span className={`h-2 w-2 rounded-full ${isTracking ? "bg-emerald-500 animate-pulse" : "bg-slate-600"}`}></span>
          <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider">
            GPS tracking: {isTracking ? "ON" : "OFF"}
          </span>
        </div>
        {isTracking && (
          <div className="flex items-center gap-1.5 text-2xs font-mono text-violet-400 font-bold">
            <Compass className="h-3.5 w-3.5 animate-spin-slow" />
            <span>{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
          </div>
        )}
      </div>

      {/* Welcome Driver Card */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center font-bold text-violet-400 text-sm">
            {getInitials(profile?.name)}
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Driver Console</p>
            <h2 className="text-base font-black text-slate-100">{profile?.name || "David Miller"}</h2>
            <p className="text-xs text-violet-400 font-medium capitalize">Duty Status: Active {profile?.role || "Driver"}</p>
          </div>
        </div>
        <button 
          onClick={() => setIsTracking(!isTracking)}
          className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${
            isTracking 
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" 
              : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
          }`}
        >
          <Power className="h-5 w-5" />
        </button>
      </div>

      {/* Active Dispatched Job */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Shipment Details</h3>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/10 overflow-hidden shadow-md">
          {/* Header info */}
          <div className="bg-slate-900/50 px-5 py-4 border-b border-slate-800 flex justify-between items-center">
            <div>
              <span className="text-xs font-black text-violet-400">TRIP-3029</span>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Volvo VNL 860 (TX-9021)</p>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase ${
              tripStatus === TripStatus.SCHEDULED ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
              tripStatus === TripStatus.IN_PROGRESS ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
              "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }`}>
              {tripStatus}
            </span>
          </div>

          {/* Content Details */}
          <div className="p-5 space-y-5">
            {/* Timeline route */}
            <div className="space-y-5 relative before:absolute before:left-3 before:top-2.5 before:h-10 before:w-0.5 before:bg-slate-800">
              <div className="flex gap-3.5 items-start">
                <div className="h-6 w-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black z-10 text-emerald-400">
                  A
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Houston Cargo Terminal (Origin)</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Scheduled: July 8, 2026 - 10:00 AM</p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start">
                <div className="h-6 w-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black z-10 text-indigo-400">
                  B
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Dallas Distribution Hub (Destination)</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">ETA: July 8, 2026 - 02:30 PM</p>
                </div>
              </div>
            </div>

            {/* Helper & Cargo Info */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-800/80 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Partner Helper</span>
                <span className="font-semibold text-slate-350 mt-0.5 block">Marcus Chen</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Cargo Load</span>
                <span className="font-semibold text-slate-350 mt-0.5 block">Dry Goods (12.4 Tons)</span>
              </div>
            </div>

            {/* Action Button */}
            <button 
              onClick={handleStatusChange}
              className={`w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                tripStatus === TripStatus.SCHEDULED ? "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/10" :
                tripStatus === TripStatus.IN_PROGRESS ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/10" :
                "bg-slate-800 hover:bg-slate-750 text-slate-400 border border-slate-700"
              }`}
            >
              {tripStatus === TripStatus.SCHEDULED && (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" /> Start Active Duty Trip
                </>
              )}
              {tripStatus === TripStatus.IN_PROGRESS && (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark Shipment Complete
                </>
              )}
              {tripStatus === TripStatus.COMPLETED && "Duty Trip Completed"}
            </button>
          </div>
        </div>
      </div>

      {/* Emergency & Support */}
      <div className="grid grid-cols-2 gap-3.5">
        <button className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold text-xs hover:bg-rose-500/15 transition-all text-left">
          <AlertOctagon className="h-5 w-5" />
          <div>
            <span>Emergency SOS</span>
            <p className="text-[9px] text-rose-500/70 font-medium mt-0.5">Contact Fleet Dispatcher</p>
          </div>
        </button>
        <button className="flex items-center gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-850 transition-all text-left">
          <Phone className="h-5 w-5 text-slate-450" />
          <div>
            <span>Support Desk</span>
            <p className="text-[9px] text-slate-500 font-medium mt-0.5">Call Supervisor</p>
          </div>
        </button>
      </div>
    </div>
  );
}
