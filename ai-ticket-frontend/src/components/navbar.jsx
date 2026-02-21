import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import StatusIndicator from "./status-indicator.jsx";
import { useSocket } from "../contexts/SocketContext.jsx";

export default function Navbar() {
  const token = localStorage.getItem("token");
  let user = localStorage.getItem("user");
  if (user) user = JSON.parse(user);
  const navigate = useNavigate();
  const [userStatus, setUserStatus] = useState(user?.status || "online");
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const menuRef = useRef(null);
  const { socket } = useSocket();
  const API_BASE = (import.meta.env.VITE_SERVER_URL ?? "").toString().trim();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowStatusMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Listen for real-time status updates from other sessions
  useEffect(() => {
    if (!socket) return;
    
    const handleStatusChange = (data) => {
      if (data.userId === user?._id) {
        setUserStatus(data.status);
        // Update localStorage
        const updatedUser = { ...user, status: data.status };
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }
    };

    socket.on("user_status_changed", handleStatusChange);
    return () => socket.off("user_status_changed", handleStatusChange);
  }, [socket, user]);

  const updateStatus = async (newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/auth/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok) {
        await res.json();
        setUserStatus(newStatus);
        setShowStatusMenu(false);
        
        // Update user in localStorage
        const updatedUser = { ...user, status: newStatus };
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const logout = () => {
    // Set status to offline before logout
    updateStatus("offline").finally(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login");
    });
  };

  // Generate avatar initials from email
  const getInitials = (email) => {
    if (!email) return "U";
    const parts = email.split("@")[0].split(/[._-]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return email.slice(0, 2).toUpperCase();
  };

  // Color hash for avatar
  const getAvatarColor = (email) => {
    if (!email) return "linear-gradient(135deg, #6366f1, #8b5cf6)";
    const hash = email.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      "linear-gradient(135deg, #6366f1, #8b5cf6)",
      "linear-gradient(135deg, #06b6d4, #3b82f6)",
      "linear-gradient(135deg, #10b981, #059669)",
      "linear-gradient(135deg, #f59e0b, #d97706)",
      "linear-gradient(135deg, #ef4444, #dc2626)",
    ];
    return colors[hash % colors.length];
  };

  return (
    <nav 
      className="sticky top-0 z-50 backdrop-blur-lg bg-slate-900/80 border-b border-slate-700/50"
      style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <Link to="/" className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent hover:from-indigo-300 hover:to-purple-300 transition-all">
              Ticket.io
            </Link>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {!token ? (
              <>
                <Link 
                  to="/signup" 
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Sign up
                </Link>
                <Link 
                  to="/login" 
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all"
                >
                  Login
                </Link>
              </>
            ) : (
              <>
                {user?.role === "admin" && (
                  <Link 
                    to="/admin" 
                    className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-all"
                  >
                    Users
                  </Link>
                )}
                {user && user.role !== "admin" && user.role !== "moderator" && (
                  <Link 
                    to="/apply-moderator" 
                    className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-all"
                  >
                    Apply Moderator
                  </Link>
                )}
                {(user?.role === "admin" || user?.role === "moderator") && (
                  <Link 
                    to="/admin/mod-requests" 
                    className="px-3 py-1.5 text-xs font-medium text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-md transition-all"
                  >
                    Moderator Requests
                  </Link>
                )}
                
                {/* User menu */}
                <div className="flex items-center gap-2 pl-3 border-l border-slate-700">
                  {/* Profile with status dropdown */}
                  <div className="relative" ref={menuRef}>
                    <button 
                      onClick={() => setShowStatusMenu(!showStatusMenu)}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg transition-all"
                    >
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold relative"
                        style={{ background: getAvatarColor(user?.email) }}
                        title={user?.email}
                      >
                        {getInitials(user?.email)}
                        <div className="absolute -bottom-0.5 -right-0.5">
                          <StatusIndicator status={userStatus} size="sm" />
                        </div>
                      </div>
                      <div className="hidden md:block text-left">
                        <div className="text-sm font-medium text-slate-200">{user?.email?.split("@")[0]}</div>
                        <div className="text-xs text-slate-400 capitalize">{user?.role}</div>
                      </div>
                    </button>
                    
                    {showStatusMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                        <div className="px-3 py-2 border-b border-slate-700">
                          <p className="text-xs font-semibold text-slate-400 uppercase">Set Status</p>
                        </div>
                        <div className="py-1">
                          <button
                            onClick={() => updateStatus("online")}
                            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-3 hover:bg-slate-700 transition-all ${
                              userStatus === "online" ? "bg-slate-700/50" : ""
                            }`}
                          >
                            <StatusIndicator status="online" size="md" />
                            <span className="text-slate-200">Online</span>
                          </button>
                          <button
                            onClick={() => updateStatus("dnd")}
                            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-3 hover:bg-slate-700 transition-all ${
                              userStatus === "dnd" ? "bg-slate-700/50" : ""
                            }`}
                          >
                            <StatusIndicator status="dnd" size="md" />
                            <span className="text-slate-200">Do Not Disturb</span>
                          </button>
                          <button
                            onClick={() => updateStatus("offline")}
                            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-3 hover:bg-slate-700 transition-all ${
                              userStatus === "offline" ? "bg-slate-700/50" : ""
                            }`}
                          >
                            <StatusIndicator status="offline" size="md" />
                            <span className="text-slate-200">Appear Offline</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={logout} 
                    className="ml-2 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-all"
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}