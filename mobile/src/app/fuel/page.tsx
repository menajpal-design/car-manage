"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Fuel, 
  Camera, 
  AlertTriangle, 
  WifiOff, 
  CheckCircle
} from "lucide-react";
import { apiRequest } from "@/lib/api";

interface DriverProfile {
  id: string;
  name: string;
  phone: string;
  companyId: string;
  assignedVehicleId?: string;
}

interface AssignedVehicle {
  id: string;
  regNumber: string;
  currentOdometer: number;
}

export default function DriverFuelPage() {
  const router = useRouter();
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [vehicle, setVehicle] = useState<AssignedVehicle | null>(null);

  // Form states
  const [odoReading, setOdoReading] = useState("");
  const [liters, setLiters] = useState("");
  const [pricePerLiter, setPricePerLiter] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [fuelStation, setFuelStation] = useState("");
  
  const [previousOdo, setPreviousOdo] = useState(0);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Status states
  const [isOnline, setIsOnline] = useState(true);
  const [syncCount, setSyncCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [warningMsg, setWarningMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchOdometer = useCallback(async () => {
    // Check cached credentials
    const cachedProfile = localStorage.getItem("driver_profile");
    const cachedVehicle = localStorage.getItem("assigned_vehicle");

    if (!cachedProfile) {
      router.push("/login");
      return;
    }

    const parsedProfile = JSON.parse(cachedProfile) as DriverProfile;
    setDriver(parsedProfile);

    if (cachedVehicle) {
      const parsedVehicle = JSON.parse(cachedVehicle) as AssignedVehicle;
      setVehicle(parsedVehicle);
      setPreviousOdo(parsedVehicle.currentOdometer || 0);

      // Attempt online fetch to sync current odometer
      if (navigator.onLine) {
        try {
          const data = await apiRequest(`/vehicles/${parsedVehicle.id}`);
          if (data.vehicle) {
            const freshOdo = data.vehicle.lastFuelOdometer || data.vehicle.currentOdometer || 0;
            setPreviousOdo(freshOdo);
            
            // Update cache
            parsedVehicle.currentOdometer = freshOdo;
            localStorage.setItem("assigned_vehicle", JSON.stringify(parsedVehicle));
          }
        } catch (err) {
          console.warn("Failed to fetch fresh odometer, using cached value:", err);
        }
      }
    }
  }, [router]);

  // Sync offline records
  const syncOfflineQueue = useCallback(async () => {
    const queueStr = localStorage.getItem("offline_fuel_logs");
    if (!queueStr) return;

    try {
      const queue = JSON.parse(queueStr);
      if (queue.length === 0) return;

      console.log(`[PWA Sync] Syncing ${queue.length} offline fuel logs...`);
      let successCount = 0;

      for (const item of queue) {
        const formData = new FormData();
        formData.append("vehicleId", item.vehicleId);
        formData.append("odoReading", item.odoReading.toString());
        formData.append("liters", item.liters.toString());
        formData.append("pricePerLiter", item.pricePerLiter.toString());
        formData.append("totalCost", item.totalCost.toString());
        formData.append("fuelStation", item.fuelStation || "");
        formData.append("fuelDate", item.fuelDate);

        // Convert base64 cached photo back to blob
        if (item.photoBase64) {
          const res = await fetch(item.photoBase64);
          const blob = await res.blob();
          formData.append("file", blob, "odometer_capture.jpg");
        }

        await apiRequest("/fuel-logs", {
          method: "POST",
          body: formData,
        });
        successCount++;
      }

      // Clear queue
      localStorage.removeItem("offline_fuel_logs");
      setSyncCount(0);
      setSuccessMsg(`Successfully synchronized ${successCount} offline fuel logs with server!`);
      setTimeout(() => setSuccessMsg(""), 5000);
      
      // Refresh vehicle odometer
      fetchOdometer();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[PWA Sync] Sync failed:", message);
      setErrorMsg("Failed to synchronize offline queue. Will retry later.");
    }
  }, [fetchOdometer]);

  // Init online checks and profile loads
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const goOnline = () => {
        setIsOnline(true);
        syncOfflineQueue();
      };
      const goOffline = () => setIsOnline(false);

      window.addEventListener("online", goOnline);
      window.addEventListener("offline", goOffline);

      fetchOdometer();

      // Read initial queue length
      const queueStr = localStorage.getItem("offline_fuel_logs");
      if (queueStr) {
        setSyncCount(JSON.parse(queueStr).length);
      }

      return () => {
        window.removeEventListener("online", goOnline);
        window.removeEventListener("offline", goOffline);
      };
    }
  }, [syncOfflineQueue, fetchOdometer]);

  // Recalculate total cost if liters or price changes
  useEffect(() => {
    const l = Number(liters);
    const p = Number(pricePerLiter);
    if (l > 0 && p > 0) {
      setTotalCost((l * p).toFixed(2));
    }
  }, [liters, pricePerLiter]);

  // Odometer reading warnings
  useEffect(() => {
    const current = Number(odoReading);
    if (odoReading && current < previousOdo) {
      setWarningMsg(`Odometer reading is less than previous (${previousOdo} km). Please verify before logging.`);
    } else {
      setWarningMsg("");
    }
  }, [odoReading, previousOdo]);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      // Render image preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    if (!vehicle || !driver) {
      setErrorMsg("No vehicle assigned to your profile.");
      setSubmitting(false);
      return;
    }

    const currentOdo = Number(odoReading);
    const numLiters = Number(liters);
    const numPrice = Number(pricePerLiter);
    const numCost = Number(totalCost);

    // 1. OFFLINE QUEUE SUBMISSION
    if (!isOnline) {
      try {
        const offlineEntry = {
          vehicleId: vehicle.id,
          odoReading: currentOdo,
          liters: numLiters,
          pricePerLiter: numPrice,
          totalCost: numCost,
          fuelStation,
          fuelDate: new Date().toISOString(),
          photoBase64: photoPreview, // base64 representation of captured photo
        };

        const existingQueueStr = localStorage.getItem("offline_fuel_logs") || "[]";
        const existingQueue = JSON.parse(existingQueueStr);
        existingQueue.push(offlineEntry);
        localStorage.setItem("offline_fuel_logs", JSON.stringify(existingQueue));

        // Update local odometer cache to let driver log next refill continuously
        const cachedVehicle = JSON.parse(localStorage.getItem("assigned_vehicle") || "{}");
        cachedVehicle.currentOdometer = currentOdo;
        localStorage.setItem("assigned_vehicle", JSON.stringify(cachedVehicle));
        setPreviousOdo(currentOdo);

        setSyncCount(existingQueue.length);
        setSuccessMsg("Logged offline! Refill queued. It will sync when connection is restored.");
        resetForm();
      } catch {
        setErrorMsg("Failed to queue offline entry.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // 2. ONLINE LIVE SUBMISSION
    try {
      const formData = new FormData();
      formData.append("vehicleId", vehicle.id);
      formData.append("odoReading", currentOdo.toString());
      formData.append("liters", numLiters.toString());
      formData.append("pricePerLiter", numPrice.toString());
      formData.append("totalCost", numCost.toString());
      formData.append("fuelStation", fuelStation);
      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      await apiRequest("/fuel-logs", {
        method: "POST",
        body: formData,
      });

      // Update vehicle cached state
      const cachedVehicle = JSON.parse(localStorage.getItem("assigned_vehicle") || "{}");
      cachedVehicle.currentOdometer = currentOdo;
      localStorage.setItem("assigned_vehicle", JSON.stringify(cachedVehicle));
      setPreviousOdo(currentOdo);

      setSuccessMsg("Refilling log successfully saved and verified.");
      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(message || "Failed to submit log to server.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setOdoReading("");
    setLiters("");
    setPricePerLiter("");
    setTotalCost("");
    setFuelStation("");
    setPhotoPreview(null);
    setSelectedFile(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("driver_profile");
    localStorage.removeItem("assigned_vehicle");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Offline Alert Header Banner */}
      {!isOnline && (
        <div className="bg-amber-650 text-amber-50 px-4 py-3 text-xs font-semibold flex items-center gap-2 shadow-md animate-pulse">
          <WifiOff className="h-4.5 w-4.5" />
          <span>Offline Mode Active. Log refills locally. They sync automatically when back online.</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-md mx-auto p-4 space-y-4 pb-12">
        
        {/* Driver Header Info */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
              <Fuel className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Log Refueling</h2>
              {vehicle && <p className="text-[10px] text-slate-400 font-semibold">Vehicle: {vehicle.regNumber}</p>}
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="text-xs text-slate-500 hover:text-slate-300 font-bold border border-slate-900 rounded-lg px-3 py-1.5"
          >
            Logout
          </button>
        </div>

        {/* Sync Count Badge */}
        {syncCount > 0 && (
          <div className="bg-violet-600/10 border border-violet-600/20 p-3 rounded-xl flex items-center justify-between text-xs text-violet-400 font-medium">
            <span>{syncCount} items queued offline</span>
            {isOnline && (
              <button 
                onClick={syncOfflineQueue} 
                className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-3 py-1 rounded-lg"
              >
                Sync Now
              </button>
            )}
          </div>
        )}

        {/* Notices */}
        {successMsg && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <CheckCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
            <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Refuel Input Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          
          {/* Odometer Card */}
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl space-y-3.5">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wide">
              <span>Odometer Record</span>
              <span className="text-slate-500">Prev: {previousOdo} km</span>
            </div>

            <div className="space-y-1">
              <input
                type="number"
                required
                pattern="[0-9]*"
                inputMode="numeric"
                placeholder="Current Odometer (km)"
                value={odoReading}
                onChange={(e) => setOdoReading(e.target.value)}
                className="h-12 w-full rounded-xl bg-slate-950 border border-slate-800 focus:border-violet-500 outline-none text-center font-bold text-lg text-white"
              />
            </div>

            {warningMsg && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-2xs font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{warningMsg}</span>
              </div>
            )}
          </div>

          {/* Pricing Card */}
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl space-y-4">
            <h3 className="text-xs text-slate-400 font-bold uppercase tracking-wide">Fuel details</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-2xs font-bold text-slate-500 uppercase tracking-wide">Liters</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  inputMode="decimal"
                  placeholder="0.00"
                  value={liters}
                  onChange={(e) => setLiters(e.target.value)}
                  className="h-11 w-full rounded-lg bg-slate-950 border border-slate-800 focus:border-violet-500 outline-none px-3 font-semibold text-sm text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold text-slate-500 uppercase tracking-wide">Price / Liter</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  inputMode="decimal"
                  placeholder="0.00"
                  value={pricePerLiter}
                  onChange={(e) => setPricePerLiter(e.target.value)}
                  className="h-11 w-full rounded-lg bg-slate-950 border border-slate-800 focus:border-violet-500 outline-none px-3 font-semibold text-sm text-slate-200"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-2xs font-bold text-slate-500 uppercase tracking-wide">Total Cost ($)</label>
              <input
                type="number"
                step="0.01"
                required
                inputMode="decimal"
                placeholder="Total Refill Cost"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                className="h-12 w-full rounded-lg bg-slate-950/60 border border-slate-800/80 outline-none px-4 font-bold text-slate-200 text-base"
              />
            </div>

            <div className="space-y-1">
              <label className="text-2xs font-bold text-slate-500 uppercase tracking-wide">Fuel Station (Optional)</label>
              <input
                type="text"
                placeholder="Shell, Exxon, Pilot..."
                value={fuelStation}
                onChange={(e) => setFuelStation(e.target.value)}
                className="h-11 w-full rounded-lg bg-slate-950 border border-slate-800 focus:border-violet-500 outline-none px-3 text-sm text-slate-200"
              />
            </div>
          </div>

          {/* Camera Capture Card (FR-FUEL-04) */}
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl space-y-3">
            <h3 className="text-xs text-slate-400 font-bold uppercase tracking-wide">Odometer Photo Capture</h3>
            
            <div className="relative border-2 border-dashed border-slate-800 hover:border-slate-700 transition-colors rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-950/40">
              <input
                type="file"
                accept="image/*"
                capture="environment" // Forces native mobile camera launch
                onChange={handlePhotoCapture}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {photoPreview ? (
                <div className="flex flex-col items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={photoPreview} 
                    alt="Odometer preview" 
                    className="max-h-32 rounded-lg object-contain border border-slate-800"
                  />
                  <span className="text-[10px] text-violet-400 font-semibold">Change Photo</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-slate-500">
                  <Camera className="h-6 w-6" />
                  <span className="text-2xs font-bold uppercase tracking-wider">Tap to Capture Odometer</span>
                </div>
              )}
            </div>
          </div>

          {/* Submit Trigger Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold text-sm text-white disabled:opacity-50 transition-colors shadow-lg shadow-violet-600/10 flex items-center justify-center gap-1.5"
          >
            {submitting ? "Saving record..." : "Log Refill Entry"}
          </button>

        </form>

      </div>
    </div>
  );
}
