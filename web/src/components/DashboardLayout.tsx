"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Truck,
  LayoutDashboard,
  Wrench,
  Fuel,
  DollarSign,
  BarChart3,
  Users,
  TrendingUp,
  Bell,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Globe,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n-context";
import io from "socket.io-client";

interface NavItem {
  href: string;
  icon: React.ReactNode;
  labelKey: string;
  badge?: number;
}

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  timestamp: Date;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { lang, setLang, tr } = useI18n();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    name: string;
    role: string;
    companyId?: string;
  } | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  // Load user profile
  useEffect(() => {
    const cached = localStorage.getItem("owner_profile");
    if (!cached) {
      router.push("/login");
      return;
    }
    try {
      setUserProfile(JSON.parse(cached));
    } catch {
      router.push("/login");
    }
  }, [router]);

  // Socket.io for real-time notifications
  useEffect(() => {
    const getSocketUrl = () => {
      if (typeof window !== 'undefined') {
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          return window.location.origin;
        }
      }
      return process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5001";
    };

    const socket = io(getSocketUrl(), {
      withCredentials: true,
    });

    socket.on("notification", (data: { type: string; message: string; ticketId?: string }) => {
      const newNotif: Notification = {
        id: Date.now().toString(),
        type: data.type,
        message: data.message,
        read: false,
        timestamp: new Date(),
      };
      setNotifications((prev) => [newNotif, ...prev.slice(0, 19)]);
      setUnreadCount((c) => c + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Close notifications on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch {}
    localStorage.removeItem("owner_profile");
    router.push("/login");
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const navItems: NavItem[] = [
    {
      href: "/",
      icon: <LayoutDashboard className="h-5 w-5" />,
      labelKey: tr.nav.dashboard,
    },
    {
      href: "/dashboard/vehicles",
      icon: <Truck className="h-5 w-5" />,
      labelKey: tr.nav.vehicles,
    },
    {
      href: "/dashboard/tickets",
      icon: <Wrench className="h-5 w-5" />,
      labelKey: tr.nav.tickets,
    },
    {
      href: "/dashboard/fuel",
      icon: <Fuel className="h-5 w-5" />,
      labelKey: tr.nav.fuel,
    },
    {
      href: "/dashboard/payments",
      icon: <DollarSign className="h-5 w-5" />,
      labelKey: tr.nav.payments,
    },
    {
      href: "/dashboard/expenses",
      icon: <TrendingUp className="h-5 w-5" />,
      labelKey: tr.nav.expenses,
    },
    {
      href: "/dashboard/analytics",
      icon: <BarChart3 className="h-5 w-5" />,
      labelKey: tr.nav.analytics,
    },
    {
      href: "/dashboard/users",
      icon: <Users className="h-5 w-5" />,
      labelKey: tr.nav.users,
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      owner: "text-violet-400 bg-violet-500/10",
      accountant: "text-emerald-400 bg-emerald-500/10",
      technician: "text-amber-400 bg-amber-500/10",
      driver: "text-blue-400 bg-blue-500/10",
      helper: "text-pink-400 bg-pink-500/10",
    };
    return colors[role] || "text-slate-400 bg-slate-500/10";
  };

  const getNotifIcon = (type: string) => {
    if (type.includes("CLOSED") || type.includes("SOLVED"))
      return <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />;
    return <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* ── Sidebar Overlay (Mobile) ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col w-64 bg-slate-900 border-r border-slate-800 transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:flex`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-600/20 shrink-0">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white">
              {tr.appName}
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">{tr.appTagline}</p>
          </div>
          <button
            className="ml-auto lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.href}
              onClick={() => {
                router.push(item.href);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                isActive(item.href)
                  ? "bg-violet-600/15 text-violet-400 border border-violet-500/20"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              }`}
            >
              <span
                className={`transition-colors ${
                  isActive(item.href) ? "text-violet-400" : "text-slate-500 group-hover:text-slate-300"
                }`}
              >
                {item.icon}
              </span>
              <span className="flex-1 text-left">{item.labelKey}</span>
              {isActive(item.href) && (
                <ChevronRight className="h-3.5 w-3.5 text-violet-500" />
              )}
            </button>
          ))}
        </nav>

        {/* Language Switcher */}
        <div className="px-4 py-3 border-t border-slate-800">
          <div className="flex items-center gap-2 p-1 rounded-lg bg-slate-800 border border-slate-700">
            <Globe className="h-3.5 w-3.5 text-slate-500 ml-1" />
            <button
              onClick={() => setLang("en")}
              className={`flex-1 text-xs font-semibold py-1 rounded-md transition-all ${
                lang === "en"
                  ? "bg-violet-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("bn")}
              className={`flex-1 text-xs font-semibold py-1 rounded-md transition-all ${
                lang === "bn"
                  ? "bg-violet-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              বাং
            </button>
          </div>
        </div>

        {/* User Profile & Logout */}
        {userProfile && (
          <div className="px-4 pb-4 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center font-bold text-violet-400 text-sm shrink-0">
                {userProfile.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200 truncate">
                  {userProfile.name}
                </p>
                <span
                  className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${getRoleColor(
                    userProfile.role
                  )}`}
                >
                  {userProfile.role}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
            >
              <LogOut className="h-3.5 w-3.5" />
              {tr.nav.logout}
            </button>
          </div>
        )}
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 h-14 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 shrink-0">
          {/* Mobile menu toggle */}
          <button
            className="lg:hidden h-8 w-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Breadcrumb / Page Title */}
          <div className="hidden lg:block">
            <p className="text-xs text-slate-500 font-medium">
              FleetMaster Pro &rsaquo;{" "}
              <span className="text-slate-300">
                {navItems.find((n) => isActive(n.href))?.labelKey || tr.nav.dashboard}
              </span>
            </p>
          </div>

          {/* Right side: Notifications */}
          <div className="flex items-center gap-3 ml-auto">
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setShowNotifications((v) => !v);
                  if (!showNotifications && unreadCount > 0) markAllRead();
                }}
                className="relative h-8 w-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-[9px] font-black text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-10 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-black/40 overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                    <span className="text-sm font-bold text-slate-200">Notifications</span>
                    <button
                      onClick={markAllRead}
                      className="text-xs text-violet-400 hover:text-violet-300"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`flex items-start gap-2.5 px-4 py-3 border-b border-slate-800 hover:bg-slate-800/50 transition-colors ${
                            !n.read ? "bg-violet-500/5" : ""
                          }`}
                        >
                          {getNotifIcon(n.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-300 leading-snug">{n.message}</p>
                            <p className="text-[10px] text-slate-600 mt-0.5">
                              {new Date(n.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                          {!n.read && (
                            <div className="h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0 mt-1" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-8 w-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center font-bold text-violet-400 text-xs">
              {userProfile?.name?.charAt(0).toUpperCase() || "?"}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
