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
  CheckCircle2,
  Printer,
  ChevronLeft,
  ChevronRight
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

// ── PRINT UTILITY FUNCTION ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handlePrintLedger = (user: UserRecord, year: number, monthName: string, records: any[]) => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const totalDays = new Date(year, new Date(`${monthName} 1, ${year}`).getMonth() + 1, 0).getDate();
  const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const presentCount = sortedRecords.filter(r => r.status === 'Present').length;
  const lateCount = sortedRecords.filter(r => r.status === 'Late').length;
  const leaveCount = sortedRecords.filter(r => r.status === 'Leave').length;
  const absentCount = sortedRecords.filter(r => r.status === 'Absent').length;

  let rowsHtml = "";
  for (let day = 1; day <= totalDays; day++) {
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${year}-${String(new Date(`${monthName} 1, ${year}`).getMonth() + 1).padStart(2, '0')}-${formattedDay}`;
    const rec = sortedRecords.find(r => r.date === dateStr);
    const status = rec ? rec.status : "N/A";
    const notes = rec?.notes || "-";
    
    let statusColor = "#475569";
    if (status === "Present") statusColor = "#16a34a";
    if (status === "Late") statusColor = "#d97706";
    if (status === "Leave") statusColor = "#2563eb";
    if (status === "Absent") statusColor = "#dc2626";

    rowsHtml += `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 12px; font-weight: 500; font-family: monospace;">${dateStr}</td>
        <td style="padding: 8px 12px; font-weight: bold; color: ${statusColor};">${status}</td>
        <td style="padding: 8px 12px; color: #475569;">${notes}</td>
      </tr>
    `;
  }

  const htmlContent = `
    <html>
      <head>
        <title>Attendance Report - ${user.name}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; margin: 40px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #1e1b4b; }
          .meta-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-top: 25px; margin-bottom: 25px; font-size: 14px; }
          .meta-item { display: flex; flex-direction: column; }
          .meta-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; letter-spacing: 0.05em; }
          .meta-value { font-weight: 600; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
          th { background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 10px 12px; text-align: left; font-weight: bold; color: #475569; }
          .stats-grid { display: grid; grid-template-cols: repeat(4, 1fr); gap: 15px; margin-top: 20px; margin-bottom: 20px; }
          .stat-card { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; text-align: center; }
          .stat-num { font-size: 18px; font-weight: bold; color: #1e1b4b; }
          .signature { margin-top: 60px; display: flex; justify-content: space-between; }
          .sig-line { border-top: 1px solid #94a3b8; width: 200px; text-align: center; padding-top: 8px; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">FleetMaster Pro</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Official Staff Attendance Ledger</div>
          </div>
          <div style="text-align: right; font-size: 12px; color: #64748b;">
            Report Date: ${new Date().toLocaleDateString()}
          </div>
        </div>
        
        <div class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">Staff Member</span>
            <span class="meta-value">${user.name}</span>
            <span style="font-size: 12px; color: #64748b; margin-top: 2px;">Role: ${user.role} | Phone: ${user.phone}</span>
          </div>
          <div class="meta-item" style="text-align: right;">
            <span class="meta-label">Ledger Period</span>
            <span class="meta-value">${monthName} ${year}</span>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="meta-label">Present</div>
            <div class="stat-num" style="color: #16a34a;">${presentCount} Days</div>
          </div>
          <div class="stat-card">
            <div class="meta-label">Late</div>
            <div class="stat-num" style="color: #d97706;">${lateCount} Days</div>
          </div>
          <div class="stat-card">
            <div class="meta-label">Leave</div>
            <div class="stat-num" style="color: #2563eb;">${leaveCount} Days</div>
          </div>
          <div class="stat-card">
            <div class="meta-label">Absent</div>
            <div class="stat-num" style="color: #dc2626;">${absentCount} Days</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Attendance Status</th>
              <th>Notes / Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="signature">
          <div class="sig-line">Prepared By (Dispatcher/HR)</div>
          <div class="sig-line">Employee Signature</div>
          <div class="sig-line">Authorized Signee (Owner)</div>
        </div>
        
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

// ── ATTENDANCE CALENDAR MODAL COMPONENT ──
function AttendanceCalendarModal({ user, initialDate, onClose }: { user: UserRecord; initialDate: string; onClose: () => void }) {
  const [currentYear, setCurrentYear] = useState(new Date(initialDate).getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date(initialDate).getMonth()); // 0-11
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recs, setRecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDay, setEditingDay] = useState<number | null>(null);

  const fetchMonthData = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
      const data = await apiRequest(`/attendance?userId=${user.id}&month=${monthStr}`);
      setRecs(data.records || []);
    } catch (err) {
      console.error("Failed to load month calendar:", err);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchMonthData(currentYear, currentMonth);
  }, [currentYear, currentMonth, fetchMonthData]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleStatusChange = async (day: number, status: 'Present' | 'Absent' | 'Late' | 'Leave') => {
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const dateStr = `${currentYear}-${formattedMonth}-${String(day).padStart(2, '0')}`;
    setEditingDay(null);
    try {
      await apiRequest("/attendance", {
        method: "POST",
        body: JSON.stringify({
          userId: user.id,
          date: dateStr,
          status
        })
      });
      fetchMonthData(currentYear, currentMonth);
    } catch {
      alert("Failed to update attendance day status.");
    }
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const daysGrid: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    daysGrid.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysGrid.push(d);
  }

  const handlePrint = () => {
    handlePrintLedger(user, currentYear, monthNames[currentMonth], recs);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h3 className="font-bold text-white text-base">Attendance Calendar</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{user.name} • {user.role}</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950/50 text-slate-350 hover:text-white text-xs font-semibold transition-colors"
            >
              <Printer className="h-3.5 w-3.5" /> Print Ledger
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Calendar Selectors */}
          <div className="flex items-center justify-between bg-slate-950/40 border border-slate-850 p-2.5 rounded-xl">
            <div className="flex items-center gap-1">
              <button onClick={handlePrevMonth} className="p-1 rounded-lg text-slate-400 hover:bg-slate-850 hover:text-white transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold text-slate-200 min-w-24 text-center">{monthNames[currentMonth]}</span>
              <button onClick={handleNextMonth} className="p-1 rounded-lg text-slate-400 hover:bg-slate-850 hover:text-white transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentYear(prev => prev - 1)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-850 hover:text-white transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold text-slate-200 min-w-16 text-center">{currentYear}</span>
              <button onClick={() => setCurrentYear(prev => prev + 1)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-850 hover:text-white transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          {loading ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">Loading ledger data...</div>
          ) : (
            <div className="space-y-1">
              {/* Day headers */}
              <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider py-1">
                <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
              </div>
              
              {/* Days */}
              <div className="grid grid-cols-7 gap-1">
                {daysGrid.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="h-12 bg-slate-950/10 rounded-lg"></div>;
                  }

                  const formattedMonth = String(currentMonth + 1).padStart(2, '0');
                  const dateStr = `${currentYear}-${formattedMonth}-${String(day).padStart(2, '0')}`;
                  const dayRec = recs.find(r => r.date === dateStr);
                  const status = dayRec ? dayRec.status : null;

                  let borderClass = "border border-slate-800/40 hover:border-slate-700 hover:bg-slate-850/20";
                  let bgTextClass = "text-slate-350";
                  
                  if (status === "Present") {
                    borderClass = "border border-emerald-500/30";
                    bgTextClass = "bg-emerald-500/10 text-emerald-400";
                  } else if (status === "Late") {
                    borderClass = "border border-amber-500/30";
                    bgTextClass = "bg-amber-500/10 text-amber-400";
                  } else if (status === "Leave") {
                    borderClass = "border border-blue-500/30";
                    bgTextClass = "bg-blue-500/10 text-blue-400";
                  } else if (status === "Absent") {
                    borderClass = "border border-rose-500/30";
                    bgTextClass = "bg-rose-500/10 text-rose-450";
                  }

                  return (
                    <div 
                      key={`day-${day}`} 
                      onClick={() => setEditingDay(editingDay === day ? null : day)}
                      className={`h-12 rounded-lg p-1.5 flex flex-col justify-between cursor-pointer relative transition-all ${borderClass} ${bgTextClass}`}
                    >
                      <span className="text-[10px] font-bold">{day}</span>
                      
                      {status && (
                        <span className="text-[9px] font-black uppercase tracking-wider block text-right mt-1">
                          {status === 'Present' ? 'PRE' : status === 'Late' ? 'LAT' : status === 'Leave' ? 'LV' : 'ABS'}
                        </span>
                      )}

                      {/* Dropdown status selector */}
                      {editingDay === day && (
                        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 flex gap-1 animate-in zoom-in-95 duration-100">
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(day, 'Present'); }} 
                            className="h-7 w-7 flex items-center justify-center text-[10px] font-bold rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-400 border border-emerald-500/10"
                          >
                            P
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(day, 'Late'); }} 
                            className="h-7 w-7 flex items-center justify-center text-[10px] font-bold rounded-lg bg-amber-500/20 hover:bg-amber-500/35 text-amber-400 border border-amber-500/10"
                          >
                            L
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(day, 'Leave'); }} 
                            className="h-7 w-7 flex items-center justify-center text-[10px] font-bold rounded-lg bg-blue-500/20 hover:bg-blue-500/35 text-blue-400 border border-blue-500/10"
                          >
                            LV
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(day, 'Absent'); }} 
                            className="h-7 w-7 flex items-center justify-center text-[10px] font-bold rounded-lg bg-rose-500/20 hover:bg-rose-500/35 text-rose-455 border border-rose-500/10"
                          >
                            A
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setEditingDay(null); }} 
                            className="h-7 w-7 flex items-center justify-center text-[10px] font-bold rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-350"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [monthlyRecords, setMonthlyRecords] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSavedMsg, setAttendanceSavedMsg] = useState("");
  
  // Interactive calendar selection
  const [selectedUserForCalendar, setSelectedUserForCalendar] = useState<UserRecord | null>(null);

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
      const monthStr = date.substring(0, 7); // YYYY-MM
      const data = await apiRequest(`/attendance?month=${monthStr}`);
      const list = data.records || [];
      setMonthlyRecords(list);

      const map: { [userId: string]: 'Present' | 'Absent' | 'Late' | 'Leave' } = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      list.forEach((rec: any) => {
        if (rec.date === date) {
          const uid = typeof rec.userId === 'object' && rec.userId ? (rec.userId.id || rec.userId._id) : rec.userId;
          map[uid] = rec.status;
        }
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

  const handleMarkAttendance = async (userId: string, status: 'Present' | 'Absent' | 'Late' | 'Leave') => {
    try {
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
      fetchAttendance(attendanceDate);
    } catch {
      alert("Failed to save attendance change.");
    }
  };

  const getMonthlyStats = (userId: string) => {
    const userMonthRecs = monthlyRecords.filter(rec => {
      const uid = typeof rec.userId === 'object' && rec.userId ? (rec.userId.id || rec.userId._id) : rec.userId;
      return uid === userId;
    });
    const presentCount = userMonthRecs.filter(rec => rec.status === 'Present').length;
    
    const year = parseInt(attendanceDate.split('-')[0], 10);
    const month = parseInt(attendanceDate.split('-')[1], 10);
    const totalDays = new Date(year, month, 0).getDate();

    return { presentCount, totalDays };
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
                        <th className="p-4 text-center">Logs Total</th>
                        <th className="p-4 text-center">Attendance Logs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {users.filter(u => u.role !== UserRole.OWNER).map((user) => {
                        const currentStatus = attendanceMap[user.id] || "Absent";
                        const stats = getMonthlyStats(user.id);

                        return (
                          <tr key={user.id} className="hover:bg-slate-900/30 transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-slate-250">{user.name}</div>
                              <span className="text-[10px] text-slate-500 font-semibold">{user.phone}</span>
                            </td>
                            <td className="p-4">
                              <span className="text-xs font-semibold capitalize text-slate-400">{user.role}</span>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => setSelectedUserForCalendar(user)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-violet-500/40 bg-slate-950/40 hover:bg-violet-500/10 text-2xs font-bold text-violet-400 hover:text-violet-300 transition-all"
                              >
                                <Calendar className="h-3.5 w-3.5" />
                                <span>{stats.presentCount} / {stats.totalDays} Days</span>
                              </button>
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
                                      ? "bg-rose-500/20 text-rose-455 border border-rose-500/40"
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

        {/* ── CALENDAR MODAL VIEW ── */}
        {selectedUserForCalendar && (
          <AttendanceCalendarModal
            user={selectedUserForCalendar}
            initialDate={attendanceDate}
            onClose={() => {
              setSelectedUserForCalendar(null);
              fetchAttendance(attendanceDate);
            }}
          />
        )}

      </div>
    </div>
  );
}
