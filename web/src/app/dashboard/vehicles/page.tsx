"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Truck, 
  Search, 
  Plus, 
  Eye, 
  AlertCircle, 
  X, 
  User, 
  Users
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { VehicleStatus, VehicleFuelType } from "@fleetmaster/shared";

interface DriverOrHelper {
  id: string;
  name: string;
  role: string;
}

interface VehicleRecord {
  id: string;
  regNumber: string;
  brand: string;
  model: string;
  year: number;
  fuelType: VehicleFuelType;
  status: VehicleStatus;
  currentOdometer: number;
  assignedDriver?: { id: string; name: string };
  assignedHelper?: { id: string; name: string };
}

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [drivers, setDrivers] = useState<DriverOrHelper[]>([]);
  const [helpers, setHelpers] = useState<DriverOrHelper[]>([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fuelFilter, setFuelFilter] = useState("");
  const [sortBy, setSortBy] = useState<"regNumber" | "currentOdometer" | "year">("regNumber");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    regNumber: "",
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    engineNo: "",
    chassisNo: "",
    fuelType: "Diesel",
    currentOdometer: 0,
    assignedDriver: "",
    assignedHelper: "",
    gpsDeviceId: "",
  });

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const vehicleData = await apiRequest("/vehicles");
      setVehicles(vehicleData.vehicles || []);

      const userData = await apiRequest("/users");
      const usersList = userData.users || [];
      
      setDrivers(usersList.filter((u: { role: string; isActive: boolean }) => u.role === "driver" && u.isActive));
      setHelpers(usersList.filter((u: { role: string; isActive: boolean }) => u.role === "helper" && u.isActive));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to load directory data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.name === "year" || e.target.name === "currentOdometer" 
        ? Number(e.target.value) 
        : e.target.value,
    }));
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await apiRequest("/vehicles", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setIsAddModalOpen(false);
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to register vehicle.");
    }
  };

  const filteredVehicles = vehicles
    .filter((v) => {
      const matchesSearch = 
        v.regNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.model.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter ? v.status === statusFilter : true;
      const matchesFuel = fuelFilter ? v.fuelType === fuelFilter : true;

      return matchesSearch && matchesStatus && matchesFuel;
    })
    .sort((a, b) => {
      if (sortBy === "regNumber") return a.regNumber.localeCompare(b.regNumber);
      if (sortBy === "currentOdometer") return a.currentOdometer - b.currentOdometer;
      if (sortBy === "year") return a.year - b.year;
      return 0;
    });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Vehicle Directory</h1>
              <p className="text-xs text-slate-400 font-medium">Manage vehicle profiles, odometers, and document vault uploads</p>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-violet-500 transition-all self-start sm:self-center"
          >
            <Plus className="h-4 w-4" /> Add New Vehicle
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 bg-slate-900/30 border border-slate-850 p-4 rounded-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search plate, brand..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500"
            />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-sm text-slate-300 outline-none focus:border-violet-500"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
              <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
              <option value="IDLE">IDLE</option>
            </select>
          </div>

          <div className="relative">
            <select
              value={fuelFilter}
              onChange={(e) => setFuelFilter(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-sm text-slate-300 outline-none focus:border-violet-500"
            >
              <option value="">All Fuel Types</option>
              <option value="Petrol">Petrol</option>
              <option value="Diesel">Diesel</option>
              <option value="CNG">CNG</option>
              <option value="Electric">Electric</option>
            </select>
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "regNumber" | "currentOdometer" | "year")}
              className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-sm text-slate-300 outline-none focus:border-violet-500"
            >
              <option value="regNumber">Sort by Plate Number</option>
              <option value="currentOdometer">Sort by Odometer</option>
              <option value="year">Sort by Year</option>
            </select>
          </div>
        </div>

        {/* Directory table */}
        <div className="overflow-hidden rounded-xl border border-slate-850 bg-slate-900/20 backdrop-blur-sm">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500 font-medium">Fetching fleet profiles...</div>
          ) : filteredVehicles.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 font-medium">No vehicle profiles registered.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-xs font-medium uppercase tracking-wider">
                    <th className="p-4">Vehicle Specs</th>
                    <th className="p-4">Engine details</th>
                    <th className="p-4">Assigned Crew</th>
                    <th className="p-4">Fuel & Odometer</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredVehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                            <Truck className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-200">{vehicle.regNumber}</div>
                            <div className="text-xs text-slate-500">{vehicle.brand} {vehicle.model} ({vehicle.year})</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-slate-300">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold">Fuel: {vehicle.fuelType}</span>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-slate-300">
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-1"><User className="h-3 w-3 text-slate-500" /> Driver: {vehicle.assignedDriver ? vehicle.assignedDriver.name : <span className="text-slate-600 italic">Unassigned</span>}</span>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3 text-slate-500" /> Helper: {vehicle.assignedHelper ? vehicle.assignedHelper.name : <span className="text-slate-600 italic">Unassigned</span>}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs text-slate-300 font-semibold">{vehicle.currentOdometer.toLocaleString()} km</div>
                        <div className="text-[10px] text-slate-500">Service: {vehicle.currentOdometer - (vehicle.currentOdometer % 5000)} km</div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          vehicle.status === VehicleStatus.ACTIVE ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          vehicle.status === VehicleStatus.MAINTENANCE ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                          vehicle.status === VehicleStatus.IDLE ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                          "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            vehicle.status === VehicleStatus.ACTIVE ? "bg-emerald-500" :
                            vehicle.status === VehicleStatus.MAINTENANCE ? "bg-amber-500" :
                            vehicle.status === VehicleStatus.IDLE ? "bg-blue-500" :
                            "bg-rose-500"
                          }`}></span>
                          {vehicle.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => router.push(`/dashboard/vehicles/${vehicle.id}`)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-slate-100 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" /> Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Add Vehicle */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                <h3 className="font-bold text-white text-base">Register Vehicle Profile</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-200 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Registration Number (Plate)</label>
                    <input
                      type="text"
                      name="regNumber"
                      required
                      value={formData.regNumber}
                      onChange={handleInputChange}
                      className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 text-sm text-slate-200 outline-none focus:border-violet-500"
                      placeholder="TX-9021"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Fuel Type</label>
                    <select
                      name="fuelType"
                      value={formData.fuelType}
                      onChange={handleInputChange}
                      className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-violet-500"
                    >
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="CNG">CNG</option>
                      <option value="Electric">Electric</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Brand / Make</label>
                    <input
                      type="text"
                      name="brand"
                      required
                      value={formData.brand}
                      onChange={handleInputChange}
                      className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 text-sm text-slate-200 outline-none focus:border-violet-500"
                      placeholder="Volvo"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Model</label>
                    <input
                      type="text"
                      name="model"
                      required
                      value={formData.model}
                      onChange={handleInputChange}
                      className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 text-sm text-slate-200 outline-none focus:border-violet-500"
                      placeholder="VNL 860"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Year</label>
                    <input
                      type="number"
                      name="year"
                      required
                      value={formData.year}
                      onChange={handleInputChange}
                      className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 text-sm text-slate-200 outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Engine Number</label>
                    <input
                      type="text"
                      name="engineNo"
                      required
                      value={formData.engineNo}
                      onChange={handleInputChange}
                      className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 text-sm text-slate-200 outline-none focus:border-violet-500"
                      placeholder="ENG-1928374"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Chassis Number</label>
                    <input
                      type="text"
                      name="chassisNo"
                      required
                      value={formData.chassisNo}
                      onChange={handleInputChange}
                      className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 text-sm text-slate-200 outline-none focus:border-violet-500"
                      placeholder="CHS-928374829"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Odometer (km)</label>
                    <input
                      type="number"
                      name="currentOdometer"
                      value={formData.currentOdometer}
                      onChange={handleInputChange}
                      className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 text-sm text-slate-200 outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Assign Driver</label>
                    <select
                      name="assignedDriver"
                      value={formData.assignedDriver}
                      onChange={handleInputChange}
                      className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-violet-500"
                    >
                      <option value="">Unassigned</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Assign Helper</label>
                    <select
                      name="assignedHelper"
                      value={formData.assignedHelper}
                      onChange={handleInputChange}
                      className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-violet-500"
                    >
                      <option value="">Unassigned</option>
                      {helpers.map((h) => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-semibold text-slate-400">GPS Tracker Device ID (IMEI)</label>
                    <input
                      type="text"
                      name="gpsDeviceId"
                      value={formData.gpsDeviceId}
                      onChange={handleInputChange}
                      className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 text-sm text-slate-200 outline-none focus:border-violet-500"
                      placeholder="e.g. 863205021234567 (SinoTrack IMEI)"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="h-10 px-4 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-10 px-5 rounded-lg bg-violet-600 text-xs font-semibold hover:bg-violet-500 text-white transition-colors"
                  >
                    Establish Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
