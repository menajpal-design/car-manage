"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  User, 
  Truck, 
  Bell, 
  Power, 
  Compass, 
  Play, 
  CheckCircle2, 
  AlertOctagon, 
  Phone,
  Fuel
} from "lucide-react";
import { TripStatus } from "@fleetmaster/shared";

export default function MobileHome() {
  const router = useRouter();
  const [isTracking, setIsTracking] = useState(false);
  const [tripStatus, setTripStatus] = useState<TripStatus>(TripStatus.SCHEDULED);
  const [coords, setCoords] = useState({ lat: 29.7604, lng: -95.3698 }); // Houston, TX coordinates
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    const profile = localStorage.getItem("driver_profile");
    if (!profile) {
      window.location.href = "/login";
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans max-w-md mx-auto border-x border-slate-900 shadow-2xl relative">
      {/* Mobile PWA Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center">
            <Truck className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight">DriverPortal</h1>
            <p className="text-[10px] text-slate-400 font-semibold">FleetMaster PWA v1.0</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-full border border-slate-800">
            <span className={`h-1.5 w-1.5 rounded-full ${isTracking ? "bg-emerald-500 animate-pulse" : "bg-slate-600"}`}></span>
            <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">{isTracking ? "GPS ON" : "GPS OFF"}</span>
          </div>

          <button className="h-8 w-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main App Content Area */}
      <main className="flex-1 p-4 space-y-4 pb-20 overflow-y-auto">
        {/* Welcome Driver Card */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center font-bold text-violet-400">
              JD
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Welcome Back</p>
              <h2 className="text-sm font-bold text-slate-100">David Miller</h2>
              <p className="text-xs text-violet-400 font-medium">Duty Status: Active Driver</p>
            </div>
          </div>
          <button 
            onClick={() => setIsTracking(!isTracking)}
            className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all ${
              isTracking 
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" 
                : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
            }`}
          >
            <Power className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* GPS Live Telemetry */}
        {isTracking && (
          <div className="rounded-xl bg-slate-900/40 border border-slate-850 p-3 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 text-slate-400">
              <Compass className="h-4 w-4 text-violet-500 animate-spin-slow" />
              <span>Simulated GPS Coordinates</span>
            </div>
            <span className="font-mono text-violet-400 font-bold bg-violet-500/5 px-2.5 py-0.5 rounded border border-violet-500/10">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </span>
          </div>
        )}

        {/* Active Dispatched Job */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Shipment</h3>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
            {/* Header info */}
            <div className="bg-slate-900/60 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-xs font-black text-violet-400">TRIP-3029</span>
                <p className="text-[10px] text-slate-500 font-semibold">Volvo VNL 860 (TX-9021)</p>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                tripStatus === TripStatus.SCHEDULED ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                tripStatus === TripStatus.IN_PROGRESS ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              }`}>
                {tripStatus}
              </span>
            </div>

            {/* Content Details */}
            <div className="p-4 space-y-4">
              {/* Timeline route */}
              <div className="space-y-4 relative before:absolute before:left-3 before:top-2.5 before:h-8 before:w-0.5 before:bg-slate-800">
                <div className="flex gap-3 items-start">
                  <div className="h-6 w-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black z-10 text-emerald-400">
                    A
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Houston Cargo Terminal (Origin)</h4>
                    <p className="text-[10px] text-slate-500">Scheduled: July 8, 2026 - 10:00 AM</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="h-6 w-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black z-10 text-indigo-400">
                    B
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Dallas Distribution Hub (Destination)</h4>
                    <p className="text-[10px] text-slate-500">ETA: July 8, 2026 - 02:30 PM</p>
                  </div>
                </div>
              </div>

              {/* Helper & Cargo Info */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Partner Helper</span>
                  <span className="font-semibold text-slate-300">Marcus Chen</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Cargo Load</span>
                  <span className="font-semibold text-slate-300">Dry Goods (12.4 Tons)</span>
                </div>
              </div>

              {/* Action Button */}
              <button 
                onClick={handleStatusChange}
                className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
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

        {/* Emergency & Maintenance Support */}
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold text-xs hover:bg-rose-500/15 transition-all text-left">
            <AlertOctagon className="h-4 w-4" />
            <div>
              <span>Emergency</span>
              <p className="text-[9px] text-rose-500/70 font-medium">SOS Dispatch</p>
            </div>
          </button>
          <button className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-850 transition-all text-left">
            <Phone className="h-4 w-4 text-slate-400" />
            <div>
              <span>Support Desk</span>
              <p className="text-[9px] text-slate-500 font-medium">Call Supervisor</p>
            </div>
          </button>
        </div>
      </main>

      {/* Mobile PWA Bottom Tab Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 h-16 bg-slate-950 border-t border-slate-900 px-6 flex justify-between items-center">
        <button 
          onClick={() => setActiveTab("home")}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === "home" ? "text-violet-500" : "text-slate-500"}`}
        >
          <Truck className="h-5 w-5" />
          <span className="text-[9px] font-bold">Duty Home</span>
        </button>

        <button 
          onClick={() => router.push("/fuel")}
          className="flex flex-col items-center gap-1 transition-colors text-slate-500 hover:text-violet-400"
        >
          <Fuel className="h-5 w-5" />
          <span className="text-[9px] font-bold">Fuel Log</span>
        </button>

        <button 
          onClick={() => setActiveTab("profile")}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === "profile" ? "text-violet-500" : "text-slate-500"}`}
        >
          <User className="h-5 w-5" />
          <span className="text-[9px] font-bold">Profile</span>
        </button>
      </nav>
    </div>
  );
}
