"use client";

import React, { useEffect, useState, useCallback } from "react";
import { 
  Users, 
  Search, 
  Plus, 
  Edit2, 
  UserMinus, 
  AlertCircle, 
  X, 
  Phone, 
  Mail, 
  FileText,
  Clock,
  Calendar,
  CheckCircle2
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { UserRole } from "@fleetmaster/shared";

interface UserRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  licenseNumber?: string;
  licenseExpiry?: string;
  baseSalary?: number;
  isActive: boolean;
}



export default function UsersManagementPage() {
  const [activeTab, setActiveTab] = useState<"directory" | "attendance">("directory");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Attendance states
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState<{ [userId: string]: 'Present' | 'Absent' | 'Late' | 'Leave' }>({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSavedMsg, setAttendanceSavedMsg] = useState("");

  // Modal control states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    role: "driver",
    licenseNumber: "",
    licenseExpiry: "",
    baseSalary: "0",
  });

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/users");
      setUsers(data.users || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to load users list.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = useCallback(async (date: string) => {
    setAttendanceLoading(true);
    try {
      const data = await apiRequest(`/attendance?date=${date}`);
      const list = data.records || [];
      const map: { [userId: string]: 'Present' | 'Absent' | 'Late' | 'Leave' } = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      list.forEach((rec: any) => {
        const uid = typeof rec.userId === 'object' && rec.userId ? (rec.userId.id || rec.userId._id) : rec.userId;
        map[uid] = rec.status;
      });
      setAttendanceMap(map);
    } catch (err) {
      console.error("Failed to load attendance:", err);
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (activeTab === "attendance") {
      fetchAttendance(attendanceDate);
    }
  }, [activeTab, attendanceDate, fetchAttendance]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const openAddModal = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      role: "driver",
      licenseNumber: "",
      licenseExpiry: "",
      baseSalary: "0",
    });
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await apiRequest("/users", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          baseSalary: Number(formData.baseSalary)
        }),
      });
      setIsAddModalOpen(false);
      fetchUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to add employee.");
    }
  };

  const openEditModal = (user: UserRecord) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      phone: user.phone,
      email: user.email || "",
      role: user.role,
      licenseNumber: user.licenseNumber || "",
      licenseExpiry: user.licenseExpiry ? new Date(user.licenseExpiry).toISOString().split('T')[0] : "",
      baseSalary: String(user.baseSalary || 0),
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setError("");
    try {
      await apiRequest(`/users/${selectedUser.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...formData,
          baseSalary: Number(formData.baseSalary)
        }),
      });
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to update employee.");
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate (soft-delete) this user?")) return;
    setError("");
    try {
      await apiRequest(`/users/${id}`, {
        method: "DELETE",
      });
      fetchUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to deactivate user.");
    }
  };

  // Mark attendance status dynamically
  const handleMarkAttendance = async (userId: string, status: 'Present' | 'Absent' | 'Late' | 'Leave') => {
    try {
      setAttendanceMap(prev => ({ ...prev, [userId]: status }));
      await apiRequest("/attendance", {
        method: "POST",
        body: JSON.stringify({
          userId,
          date: attendanceDate,
          status
        })
      });
      setAttendanceSavedMsg("Attendance auto-saved successfully.");
      setTimeout(() => setAttendanceSavedMsg(""), 3000);
    } catch {
      alert("Failed to save attendance change.");
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone.includes(searchTerm) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Employee & Team Management</h1>
              <p className="text-xs text-slate-400 font-medium">Add staff members, manage salaries, and track daily attendance</p>
            </div>
          </div>

          <div className="flex gap-2.5 self-start sm:self-center">
            {activeTab === "directory" && (
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-violet-500 transition-all"
              >
                <Plus className="h-4 w-4" /> Add New Employee
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="border-b border-slate-900 flex gap-4">
          <button
            onClick={() => setActiveTab("directory")}
            className={`pb-2.5 text-sm font-bold border-b-2 transition-all ${
              activeTab === "directory" 
                ? "border-violet-500 text-violet-400 font-black" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Employee Directory
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            className={`pb-2.5 text-sm font-bold border-b-2 transition-all ${
              activeTab === "attendance" 
                ? "border-violet-500 text-violet-400 font-black" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Attendance Board
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* ── DIRECTORY TAB ── */}
        {activeTab === "directory" && (
          <>
            {/* Search controls */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name, role, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-violet-500"
              />
            </div>

            {/* User Table Card */}
            <div className="overflow-hidden rounded-xl border border-slate-850 bg-slate-900/20 backdrop-blur-sm">
              {loading ? (
                <div className="p-8 text-center text-sm text-slate-500 font-medium">Fetching directory database...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500 font-medium">No matching employee records found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-xs font-medium uppercase tracking-wider">
                        <th className="p-4">Staff details</th>
                        <th className="p-4">Contact Info</th>
                        <th className="p-4">Corporate Role</th>
                        <th className="p-4">Base Salary</th>
                        <th className="p-4">License Data</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="p-4">
                            <div className="font-semibold text-slate-200">{user.name}</div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-0.5 text-xs text-slate-300">
                              <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-slate-500" /> {user.phone}</span>
                              {user.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-slate-500" /> {user.email}</span>}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                              user.role === UserRole.OWNER ? "bg-violet-500/10 text-violet-400 border-violet-500/20" :
                              user.role === UserRole.DRIVER ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                              user.role === UserRole.HELPER ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" :
                              "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-slate-200">
                            {user.role !== UserRole.OWNER ? (
                              user.baseSalary ? `$${user.baseSalary.toLocaleString()}/mo` : "$0/mo"
                            ) : (
                              <span className="text-slate-550 font-normal italic">N/A</span>
                            )}
                          </td>
                          <td className="p-4">
                            {user.licenseNumber ? (
                              <div className="flex flex-col gap-0.5 text-xs text-slate-300">
                                <span className="flex items-center gap-1 font-semibold"><FileText className="h-3 w-3 text-slate-500" /> {user.licenseNumber}</span>
                                {user.licenseExpiry && <span className="flex items-center gap-1 text-slate-500"><Clock className="h-3 w-3" /> Exp: {new Date(user.licenseExpiry).toLocaleDateString()}</span>}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-600 italic">None</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                              user.isActive 
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                              {user.isActive ? "Active" : "Deactivated"}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2.5">
                              <button
                                onClick={() => openEditModal(user)}
                                className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              {user.isActive && user.role !== UserRole.OWNER && (
                                <button
                                  onClick={() => handleDeactivate(user.id)}
                                  className="p-1.5 rounded-lg border border-rose-950 hover:bg-rose-900/10 text-rose-400 hover:text-rose-350 transition-colors"
                                >
                                  <UserMinus className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── ATTENDANCE TAB ── */}
        {activeTab === "attendance" && (
          <div className="space-y-4">
            
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/30 border border-slate-900 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-violet-400" />
                <span className="text-sm font-semibold text-slate-200">Select Date for Board:</span>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="h-9 rounded-lg border border-slate-850 bg-slate-950 px-3 text-xs text-slate-200 outline-none focus:border-violet-500"
                />
              </div>

              {attendanceSavedMsg && (
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold animate-pulse">
                  <CheckCircle2 className="h-4 w-4" /> {attendanceSavedMsg}
                </div>
              )}
            </div>

            {/* Attendance Board Cards Grid */}
            <div className="overflow-hidden rounded-xl border border-slate-850 bg-slate-900/20 backdrop-blur-sm">
              {attendanceLoading ? (
                <div className="p-8 text-center text-sm text-slate-500 font-medium">Loading attendance board...</div>
              ) : users.filter(u => u.role !== UserRole.OWNER).length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500 font-medium">No team members registered to track.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-xs font-medium uppercase tracking-wider">
                        <th className="p-4">Staff Member</th>
                        <th className="p-4">Corporate Role</th>
                        <th className="p-4 text-center">Attendance Logs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {users.filter(u => u.role !== UserRole.OWNER).map((user) => {
                        const currentStatus = attendanceMap[user.id] || "Absent";

                        return (
                          <tr key={user.id} className="hover:bg-slate-900/30 transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-slate-250">{user.name}</div>
                              <span className="text-[10px] text-slate-500 font-semibold">{user.phone}</span>
                            </td>
                            <td className="p-4">
                              <span className="text-xs font-semibold capitalize text-slate-400">{user.role}</span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2 max-w-sm mx-auto">
                                <button
                                  type="button"
                                  onClick={() => handleMarkAttendance(user.id, 'Present')}
                                  className={`flex-1 h-9 rounded-lg font-bold text-2xs uppercase transition-all ${
                                    currentStatus === 'Present'
                                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                      : "bg-slate-950/40 border border-slate-900 text-slate-500 hover:text-slate-350"
                                  }`}
                                >
                                  Present
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMarkAttendance(user.id, 'Late')}
                                  className={`flex-1 h-9 rounded-lg font-bold text-2xs uppercase transition-all ${
                                    currentStatus === 'Late'
                                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                                      : "bg-slate-950/40 border border-slate-900 text-slate-500 hover:text-slate-350"
                                  }`}
                                >
                                  Late
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMarkAttendance(user.id, 'Leave')}
                                  className={`flex-1 h-9 rounded-lg font-bold text-2xs uppercase transition-all ${
                                    currentStatus === 'Leave'
                                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                                      : "bg-slate-950/40 border border-slate-900 text-slate-500 hover:text-slate-350"
                                  }`}
                                >
                                  Leave
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMarkAttendance(user.id, 'Absent')}
                                  className={`flex-1 h-9 rounded-lg font-bold text-2xs uppercase transition-all ${
                                    currentStatus === 'Absent'
                                      ? "bg-rose-500/20 text-rose-450 border border-rose-500/40"
                                      : "bg-slate-950/40 border border-slate-900 text-slate-500 hover:text-slate-350"
                                  }`}
                                >
                                  Absent
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Add User */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                <h3 className="font-bold text-white text-base">Add New Staff Member</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-200 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 text-sm text-slate-200 outline-none focus:border-violet-500"
                    placeholder="e.g. David Miller"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Phone Number (Credentials Link)</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 text-sm text-slate-200 outline-none focus:border-violet-500"
                    placeholder="e.g. +15550199"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Email Address (Optional)</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 text-sm text-slate-200 outline-none focus:border-violet-500"
                    placeholder="e.g. driver@titan.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Company Role</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-violet-500"
                    >
                      <option value="driver">Driver</option>
                      <option value="helper">Helper</option>
                      <option value="technician">Technician</option>
                      <option value="accountant">Accountant</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Monthly Salary ($)</label>
                    <input
                      type="number"
                      name="baseSalary"
                      value={formData.baseSalary}
                      onChange={handleInputChange}
                      className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 text-sm text-slate-200 outline-none focus:border-violet-500"
                      placeholder="2500"
                    />
                  </div>
                </div>

                {(formData.role === "driver" || formData.role === "helper") && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400">License Number</label>
                      <input
                        type="text"
                        name="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={handleInputChange}
                        className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 text-sm text-slate-200 outline-none focus:border-violet-500"
                        placeholder="CDL-19028"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400">License Expiry</label>
                      <input
                        type="date"
                        name="licenseExpiry"
                        value={formData.licenseExpiry}
                        onChange={handleInputChange}
                        className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-550 outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                )}

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
                    Create and SMS Credentials
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit User */}
        {isEditModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                <h3 className="font-bold text-white text-base">Edit Employee Details</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-200 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 text-sm text-slate-200 outline-none focus:border-violet-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 text-sm text-slate-200 outline-none focus:border-violet-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Email Address (Optional)</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 text-sm text-slate-200 outline-none focus:border-violet-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Company Role</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-violet-500"
                    >
                      <option value="driver">Driver</option>
                      <option value="helper">Helper</option>
                      <option value="technician">Technician</option>
                      <option value="accountant">Accountant</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Monthly Salary ($)</label>
                    <input
                      type="number"
                      name="baseSalary"
                      value={formData.baseSalary}
                      onChange={handleInputChange}
                      className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 text-sm text-slate-200 outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                {(formData.role === "driver" || formData.role === "helper") && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400">License Number</label>
                      <input
                        type="text"
                        name="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={handleInputChange}
                        className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 text-sm text-slate-200 outline-none focus:border-violet-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400">License Expiry</label>
                      <input
                        type="date"
                        name="licenseExpiry"
                        value={formData.licenseExpiry}
                        onChange={handleInputChange}
                        className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-550 outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="h-10 px-4 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-10 px-5 rounded-lg bg-violet-600 text-xs font-semibold hover:bg-violet-500 text-white transition-colors"
                  >
                    Save Changes
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
