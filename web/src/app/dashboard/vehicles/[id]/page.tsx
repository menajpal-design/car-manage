"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Truck, 
  Wrench, 
  FileText, 
  Fuel, 
  DollarSign, 
  ArrowLeft, 
  AlertCircle, 
  User, 
  Users, 
  ShieldCheck, 
  Download, 
  Trash2, 
  UploadCloud,
  MapPin
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { VehicleStatus, VehicleFuelType } from "@fleetmaster/shared";

interface DocumentItem {
  id: string;
  type: string;
  documentUrl: string;
  issueDate: string;
  expiryDate: string;
  isVerified: boolean;
}

interface VehicleDetails {
  id: string;
  regNumber: string;
  brand: string;
  model: string;
  year: number;
  engineNo: string;
  chassisNo: string;
  fuelType: VehicleFuelType;
  status: VehicleStatus;
  currentOdometer: number;
  lastServiceOdometer: number;
  lastFuelOdometer: number;
  documents: DocumentItem[];
  assignedDriver?: { id: string; name: string };
  assignedHelper?: { id: string; name: string };
  gpsDeviceId?: string;
  currentLocation?: {
    lat: number;
    lng: number;
    speed?: number;
    course?: number;
    lastUpdate?: string;
  };
}

interface ServiceRecord {
  id: string;
  date: string;
  type: string;
  odometer: number;
  cost: number;
  status: string;
  technician: string;
  notes: string;
}

interface FuelLog {
  id: string;
  date: string;
  gallons: number;
  cost: number;
  odometer: number;
  station: string;
}

interface ExpenseLog {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
}

export default function VehicleDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<VehicleDetails | null>(null);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<ExpenseLog[]>([]);

  const [activeTab, setActiveTab] = useState<"profile" | "documents" | "services" | "fuel" | "expenses" | "tracking">("profile");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [gpsInput, setGpsInput] = useState("");
  const [updatingGps, setUpdatingGps] = useState(false);
  const [gpsEditMode, setGpsEditMode] = useState(false);

  // Document Upload form states
  const [docForm, setDocForm] = useState({
    type: "Registration",
    issueDate: "",
    expiryDate: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchVehicleDetails = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest(`/vehicles/${vehicleId}`);
      setVehicle(data.vehicle);
      setServices(data.serviceHistory || []);
      setFuelLogs(data.fuelLogs || []);
      setExpenses(data.expenses || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to load vehicle details.");
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  const handleUpdateGps = async () => {
    setUpdatingGps(true);
    setError("");
    try {
      await apiRequest(`/vehicles/${vehicleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gpsDeviceId: gpsInput.trim() || null,
        }),
      });
      setGpsEditMode(false);
      fetchVehicleDetails();
    } catch {
      setError("Failed to update GPS Device ID.");
    } finally {
      setUpdatingGps(false);
    }
  };

  useEffect(() => {
    fetchVehicleDetails();
  }, [fetchVehicleDetails]);

  useEffect(() => {
    if (activeTab !== "tracking" || !vehicle) return;

    let mapInstance: any = null;
    let markerInstance: any = null;

    const initMap = () => {
      const L = (window as any).L;
      if (!L) return;

      const defaultLat = vehicle.currentLocation?.lat || 23.8103;
      const defaultLng = vehicle.currentLocation?.lng || 90.4125;

      const container = document.getElementById("vehicle-map");
      if (!container) return;

      mapInstance = L.map("vehicle-map").setView([defaultLat, defaultLng], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapInstance);

      const customIcon = L.divIcon({
        className: 'custom-vehicle-icon',
        html: `<div class="relative flex items-center justify-center h-10 w-10 bg-violet-600 border-2 border-white rounded-full shadow-lg text-white">
          <svg xmlns="http://www.w3.org/2050/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M21 16V10a2 2 0 00-2-2h-3v8m0 0H3m13 0h5" />
          </svg>
        </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      markerInstance = L.marker([defaultLat, defaultLng], { icon: customIcon }).addTo(mapInstance);
      markerInstance.bindPopup(`<b>${vehicle.regNumber}</b><br/>Speed: ${vehicle.currentLocation?.speed || 0} km/h`).openPopup();

      (window as any).vehicleMapInstance = mapInstance;
    };

    const loadLeaflet = () => {
      if ((window as any).L) {
        initMap();
        return;
      }

      const cssLink = document.createElement("link");
      cssLink.rel = "stylesheet";
      cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      cssLink.id = "leaflet-css";
      if (!document.getElementById("leaflet-css")) {
        document.head.appendChild(cssLink);
      }

      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.id = "leaflet-js";
      script.onload = () => {
        initMap();
      };
      if (!document.getElementById("leaflet-js")) {
        document.body.appendChild(script);
      } else {
        initMap();
      }
    };

    loadLeaflet();

    let socket: any = null;
    const getSocketUrl = () => {
      if (typeof window !== 'undefined') {
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          return window.location.origin;
        }
      }
      return process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5001";
    };
    const socketUrl = getSocketUrl();
    
    import("socket.io-client").then(({ io }) => {
      socket = io(socketUrl, { withCredentials: true });
      
      socket.on("vehicle:location", (data: any) => {
        if (data.vehicleId === vehicle.id) {
          console.log("[Socket Location Update]", data);
          const L = (window as any).L;
          if (L && mapInstance && markerInstance) {
            const newPos = [data.lat, data.lng];
            markerInstance.setLatLng(newPos);
            mapInstance.panTo(newPos);
            markerInstance.setPopupContent(`<b>${vehicle.regNumber}</b><br/>Speed: ${data.speed} km/h`).openPopup();
            
            setVehicle(prev => {
              if (!prev) return null;
              return {
                ...prev,
                currentLocation: {
                  lat: data.lat,
                  lng: data.lng,
                  speed: data.speed,
                  course: data.course,
                  lastUpdate: data.lastUpdate,
                }
              };
            });
          }
        }
      });
    });

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
      if (socket) {
        socket.disconnect();
      }
      if ((window as any).currentPathPolyline) {
        (window as any).currentPathPolyline.remove();
        (window as any).currentPathPolyline = null;
      }
    };
  }, [activeTab, vehicle?.id]);

  const showRouteHistory = async () => {
    const L = (window as any).L;
    const mapInstance = (window as any).vehicleMapInstance;
    if (!L || !mapInstance) return;
    try {
      const historyData = await apiRequest(`/vehicles/${vehicleId}/tracking-history`);
      if (historyData && historyData.length > 0) {
        const coordinates = historyData.map((log: any) => [log.lat, log.lng]);
        
        if ((window as any).currentPathPolyline) {
          (window as any).currentPathPolyline.remove();
        }

        const polyline = L.polyline(coordinates, {
          color: '#8b5cf6',
          weight: 4,
          opacity: 0.8,
          dashArray: '5, 10'
        }).addTo(mapInstance);

        (window as any).currentPathPolyline = polyline;
        
        const bounds = L.latLngBounds(coordinates);
        mapInstance.fitBounds(bounds);
      } else {
        alert("No movement history found for this vehicle.");
      }
    } catch (err) {
      console.error("Failed to load tracking history", err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Limit check: 10MB
      if (file.size > 10 * 1024 * 1024) {
        alert("File size exceeds the 10MB limit.");
        return;
      }

      // MIME verification
      const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        alert("Invalid file format. Only JPEG, PNG, and PDF files are allowed.");
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Please select a document file to upload.");
      return;
    }
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("type", docForm.type);
    formData.append("issueDate", docForm.issueDate);
    formData.append("expiryDate", docForm.expiryDate);

    try {
      const data = await apiRequest(`/vehicles/${vehicleId}/documents`, {
        method: "POST",
        body: formData, // Multer parses multipart forms
      });
      setVehicle(data.vehicle);
      setSelectedFile(null);
      setDocForm({ type: "Registration", issueDate: "", expiryDate: "" });
      alert("Document successfully scanned and vaulted.");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Threat scan blocked this upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleDocDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to permanently delete this document?")) return;
    setError("");
    try {
      const data = await apiRequest(`/vehicles/${vehicleId}/documents/${docId}`, {
        method: "DELETE",
      });
      setVehicle(data.vehicle);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to remove document.");
    }
  };

  const getExpiryStatus = (expiryDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDateStr);
    
    if (expiry < today) {
      return { label: "Expired", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
    }
    
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    if (expiry <= sevenDaysFromNow) {
      return { label: "Expiring Soon (7d)", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    }
    
    return { label: "Valid / Active", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-sm text-slate-400 font-semibold">Loading vehicle profiles console...</p>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-10 w-10 text-rose-500" />
        <p className="text-sm text-slate-400">Vehicle profile details could not be found.</p>
        <button onClick={() => router.push("/dashboard/vehicles")} className="text-xs text-violet-400 flex items-center gap-1 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Return to directory
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Back and Page Header */}
        <div className="space-y-4">
          <button 
            onClick={() => router.push("/dashboard/vehicles")}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Vehicles
          </button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">{vehicle.regNumber}</h1>
                <p className="text-xs text-slate-400 font-medium">{vehicle.brand} {vehicle.model} • Year {vehicle.year}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                vehicle.status === VehicleStatus.ACTIVE ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                vehicle.status === VehicleStatus.MAINTENANCE ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                'bg-blue-500/15 text-blue-400 border border-blue-500/30'
              }`}>
                {vehicle.status}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Controllers */}
        <div className="flex border-b border-slate-800 gap-6 overflow-x-auto text-sm font-semibold">
          <button 
            onClick={() => setActiveTab("profile")}
            className={`pb-3 transition-all flex items-center gap-1.5 border-b-2 ${activeTab === "profile" ? "border-violet-500 text-violet-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            <Truck className="h-4 w-4" /> Specs Profile
          </button>
          <button 
            onClick={() => setActiveTab("documents")}
            className={`pb-3 transition-all flex items-center gap-1.5 border-b-2 ${activeTab === "documents" ? "border-violet-500 text-violet-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            <FileText className="h-4 w-4" /> Document Vault ({vehicle.documents.length})
          </button>
          <button 
            onClick={() => setActiveTab("services")}
            className={`pb-3 transition-all flex items-center gap-1.5 border-b-2 ${activeTab === "services" ? "border-violet-500 text-violet-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            <Wrench className="h-4 w-4" /> Service Timeline
          </button>
          <button 
            onClick={() => setActiveTab("fuel")}
            className={`pb-3 transition-all flex items-center gap-1.5 border-b-2 ${activeTab === "fuel" ? "border-violet-500 text-violet-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            <Fuel className="h-4 w-4" /> Fuel Logs
          </button>
          <button 
            onClick={() => setActiveTab("expenses")}
            className={`pb-3 transition-all flex items-center gap-1.5 border-b-2 ${activeTab === "expenses" ? "border-violet-500 text-violet-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            <DollarSign className="h-4 w-4" /> Expenses
          </button>
          <button 
            onClick={() => setActiveTab("tracking")}
            className={`pb-3 transition-all flex items-center gap-1.5 border-b-2 ${activeTab === "tracking" ? "border-violet-500 text-violet-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            <MapPin className="h-4 w-4" /> Live Tracking
          </button>
        </div>

        {/* Tab Contents */}
        <div className="pt-2">
          {/* PROFILE SPECS TAB */}
          {activeTab === "profile" && (
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2 rounded-xl border border-slate-850 bg-slate-900/10 p-6 space-y-4">
                <h3 className="font-bold text-white text-base">Vehicle Specifications</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">Brand / Make</span>
                    <span className="font-medium text-slate-200">{vehicle.brand}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">Model</span>
                    <span className="font-medium text-slate-200">{vehicle.model}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">Year</span>
                    <span className="font-medium text-slate-200">{vehicle.year}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">Fuel Type</span>
                    <span className="font-medium text-slate-200">{vehicle.fuelType}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">Engine Number</span>
                    <span className="font-mono font-medium text-slate-200">{vehicle.engineNo}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">Chassis Number</span>
                    <span className="font-mono font-medium text-slate-200">{vehicle.chassisNo}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">GPS Device ID (IMEI)</span>
                    {gpsEditMode ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          value={gpsInput}
                          onChange={(e) => setGpsInput(e.target.value)}
                          className="h-8 w-44 rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 outline-none focus:border-violet-500"
                          placeholder="IMEI Number"
                        />
                        <button
                          onClick={handleUpdateGps}
                          disabled={updatingGps}
                          className="h-8 px-2.5 rounded bg-violet-600 hover:bg-violet-750 text-white text-xs font-semibold"
                        >
                          {updatingGps ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => setGpsEditMode(false)}
                          className="h-8 px-2.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono font-medium text-slate-200">{vehicle.gpsDeviceId || "None"}</span>
                        <button
                          onClick={() => {
                            setGpsInput(vehicle.gpsDeviceId || "");
                            setGpsEditMode(true);
                          }}
                          className="text-xs text-violet-400 hover:text-violet-300 font-semibold"
                        >
                          [Edit]
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-850 bg-slate-900/10 p-6 space-y-4">
                <h3 className="font-bold text-white text-base">Duty Telemetry</h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">Current Odometer</span>
                    <span className="text-lg font-bold text-slate-200">{vehicle.currentOdometer.toLocaleString()} km</span>
                  </div>
                  <div className="h-px bg-slate-800"></div>
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-slate-500" />
                    <div>
                      <span className="text-xs text-slate-500 block uppercase tracking-wider">Assigned Driver</span>
                      <span className="font-semibold text-slate-200">{vehicle.assignedDriver ? vehicle.assignedDriver.name : "Unassigned"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-slate-500" />
                    <div>
                      <span className="text-xs text-slate-500 block uppercase tracking-wider">Assigned Helper</span>
                      <span className="font-semibold text-slate-200">{vehicle.assignedHelper ? vehicle.assignedHelper.name : "Unassigned"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DOCUMENT VAULT TAB */}
          {activeTab === "documents" && (
            <div className="grid gap-6 md:grid-cols-3">
              {/* Vault list */}
              <div className="md:col-span-2 space-y-4">
                <h3 className="font-bold text-white text-base">Vaulted Certificates & Permits</h3>
                {vehicle.documents.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No files uploaded in this vehicle vault.</p>
                ) : (
                  <div className="grid gap-3">
                    {vehicle.documents.map((doc) => {
                      const status = getExpiryStatus(doc.expiryDate);
                      return (
                        <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/20">
                          <div className="space-y-1">
                            <span className="text-sm font-bold text-slate-200">{doc.type}</span>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span>Issued: {new Date(doc.issueDate).toLocaleDateString()}</span>
                              <span>Expires: {new Date(doc.expiryDate).toLocaleDateString()}</span>
                            </div>
                            <div className="pt-1 flex gap-2">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${status.color}`}>
                                {status.label}
                              </span>
                              {doc.isVerified && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                                  <ShieldCheck className="h-3 w-3" /> Verified
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2.5">
                            <a
                              href={doc.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg border border-slate-800 hover:border-slate-750 text-slate-300 hover:text-slate-100 transition-colors"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            <button
                              onClick={() => handleDocDelete(doc.id)}
                              className="p-2 rounded-lg border border-rose-950 hover:bg-rose-900/10 text-rose-400 hover:text-rose-350 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Upload Certificate Vault Form */}
              <div className="rounded-xl border border-slate-850 bg-slate-900/10 p-6 space-y-4 h-fit">
                <h3 className="font-bold text-white text-base">Vault New File</h3>
                
                <form onSubmit={handleUploadSubmit} className="space-y-4 text-sm">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Document Category</label>
                    <select
                      name="type"
                      value={docForm.type}
                      onChange={(e) => setDocForm(prev => ({ ...prev, type: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-violet-500"
                    >
                      <option value="Registration">Registration Certificate</option>
                      <option value="Insurance">Insurance Policy</option>
                      <option value="Road Permit">Road Permit</option>
                      <option value="Tax Token">Tax Token</option>
                      <option value="Fitness Certificate">Fitness Certificate</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Issue Date</label>
                    <input
                      type="date"
                      required
                      value={docForm.issueDate}
                      onChange={(e) => setDocForm(prev => ({ ...prev, issueDate: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-400 outline-none focus:border-violet-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Expiry Date</label>
                    <input
                      type="date"
                      required
                      value={docForm.expiryDate}
                      onChange={(e) => setDocForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-400 outline-none focus:border-violet-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">File Selection (JPEG, PNG, PDF &lt; 10MB)</label>
                    <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 transition-colors rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer relative bg-slate-950/40">
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,application/pdf"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <UploadCloud className="h-6 w-6 text-slate-500" />
                      <span className="text-xs font-medium text-slate-400">
                        {selectedFile ? selectedFile.name : "Choose document file"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={uploading}
                    className="w-full h-10 rounded-lg bg-violet-600 text-xs font-semibold hover:bg-violet-500 text-white disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-violet-600/10"
                  >
                    {uploading ? "Scanning & Uploading..." : "Scan & Vault Document"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* SERVICE HISTORY TIMELINE TAB */}
          {activeTab === "services" && (
            <div className="rounded-xl border border-slate-850 bg-slate-900/10 p-6 space-y-6">
              <h3 className="font-bold text-white text-base">Maintenance & Repair Timeline (FR-VEH-04)</h3>
              
              <div className="relative border-l-2 border-slate-800 ml-3.5 space-y-6 py-2">
                {services.map((srv) => (
                  <div key={srv.id} className="relative pl-7 group">
                    {/* Circle indicators */}
                    <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-slate-950 border-2 border-violet-500 group-hover:bg-violet-500 transition-colors flex items-center justify-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-500 group-hover:bg-white"></span>
                    </span>

                    <div className="space-y-1.5 bg-slate-900/20 border border-slate-850 p-4 rounded-xl max-w-2xl">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                        <span className="font-bold text-slate-200 text-sm">{srv.type}</span>
                        <div className="flex gap-2 text-2xs font-semibold uppercase tracking-wider">
                          <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">
                            {srv.id}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                            {srv.status}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 font-medium">{srv.notes}</p>

                      <div className="h-px bg-slate-850 my-2"></div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-500">
                        <div>
                          <span className="block text-[10px] text-slate-500 uppercase tracking-wide">Date Logged</span>
                          <span className="font-medium text-slate-350">{new Date(srv.date).toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-500 uppercase tracking-wide">Odometer</span>
                          <span className="font-mono font-medium text-slate-350">{srv.odometer.toLocaleString()} km</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-500 uppercase tracking-wide">Total Cost</span>
                          <span className="font-medium text-slate-350">${srv.cost.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-500 uppercase tracking-wide">Technician</span>
                          <span className="font-medium text-slate-350">{srv.technician}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FUEL LOGS TAB */}
          {activeTab === "fuel" && (
            <div className="rounded-xl border border-slate-850 bg-slate-900/10 p-6 space-y-4">
              <h3 className="font-bold text-white text-base">Fuel Refill Logs</h3>
              <div className="overflow-hidden rounded-lg border border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-900/60 text-slate-400 text-xs font-semibold">
                      <th className="p-3">Fill Date</th>
                      <th className="p-3">Volume (Gallons)</th>
                      <th className="p-3">Total Cost</th>
                      <th className="p-3">Odometer</th>
                      <th className="p-3">Refill Station</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs text-slate-300">
                    {fuelLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3 font-medium">{new Date(log.date).toLocaleDateString()}</td>
                        <td className="p-3 font-semibold">{log.gallons} G</td>
                        <td className="p-3 font-semibold text-emerald-400">${log.cost.toFixed(2)}</td>
                        <td className="p-3 font-mono">{log.odometer.toLocaleString()} km</td>
                        <td className="p-3 text-slate-400">{log.station}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* EXPENSES TAB */}
          {activeTab === "expenses" && (
            <div className="rounded-xl border border-slate-850 bg-slate-900/10 p-6 space-y-4">
              <h3 className="font-bold text-white text-base">Incident & Operational Expenses</h3>
              <div className="overflow-hidden rounded-lg border border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-900/60 text-slate-400 text-xs font-semibold">
                      <th className="p-3">Date</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs text-slate-300">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3 font-medium">{new Date(exp.date).toLocaleDateString()}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-semibold">
                            {exp.category}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-rose-400">${exp.amount.toFixed(2)}</td>
                        <td className="p-3 text-slate-400">{exp.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* LIVE TRACKING TAB */}
          {activeTab === "tracking" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-xl border border-slate-850 bg-slate-900/10">
                <div className="space-y-1">
                  <h3 className="font-bold text-white text-base">GPS Live Tracking Telemetry</h3>
                  <p className="text-xs text-slate-400">
                    {vehicle.gpsDeviceId 
                      ? `Connected to Device IMEI: ${vehicle.gpsDeviceId}` 
                      : "No physical GPS tracker IMEI linked to this vehicle. Link one in specifications to track live."}
                  </p>
                </div>
                {vehicle.gpsDeviceId && (
                  <div className="flex gap-3">
                    <button
                      onClick={showRouteHistory}
                      className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-750 text-white text-sm font-semibold transition-all shadow-md shadow-violet-600/10"
                    >
                      Show Today&apos;s Route
                    </button>
                  </div>
                )}
              </div>

              {vehicle.gpsDeviceId ? (
                <div className="grid gap-6 md:grid-cols-4">
                  <div className="md:col-span-3">
                    <div 
                      id="vehicle-map" 
                      style={{ height: "450px" }} 
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 shadow-lg relative overflow-hidden"
                    ></div>
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-850 bg-slate-900/10 p-5 space-y-3.5">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">Live Status</h4>
                      
                      <div className="space-y-2.5 text-xs">
                        <div>
                          <span className="text-slate-500 block uppercase font-semibold">Speed</span>
                          <span className="text-lg font-bold text-violet-400">
                            {vehicle.currentLocation?.speed !== undefined ? `${vehicle.currentLocation.speed} km/h` : "0 km/h"}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block uppercase font-semibold">Coordinates</span>
                          <span className="font-mono text-slate-300">
                            {vehicle.currentLocation?.lat !== undefined 
                              ? `${vehicle.currentLocation.lat.toFixed(5)}, ${vehicle.currentLocation.lng.toFixed(5)}` 
                              : "No data"}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block uppercase font-semibold">Course / Heading</span>
                          <span className="text-slate-300">
                            {vehicle.currentLocation?.course !== undefined ? `${vehicle.currentLocation.course}°` : "N/A"}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block uppercase font-semibold">Last Update received</span>
                          <span className="text-slate-300">
                            {vehicle.currentLocation?.lastUpdate 
                              ? new Date(vehicle.currentLocation.lastUpdate).toLocaleString() 
                              : "Never"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-800 rounded-xl bg-slate-900/5 text-slate-400 text-center space-y-3">
                  <MapPin className="h-10 w-10 text-slate-600 animate-pulse" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-sm">No GPS Link Active</h4>
                    <p className="text-xs max-w-md">
                      Go to the <b>Specs Profile</b> tab, click <b>[Edit]</b> next to GPS Device ID, and enter your SinoTrack ST-901 IMEI number to activate live telemetry tracking.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
