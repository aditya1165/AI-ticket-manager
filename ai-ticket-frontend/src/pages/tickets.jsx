import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/navbar";
import EmptyState from "../components/empty-state";
import StatusIndicator from "../components/status-indicator";
import { useSocket } from "../contexts/SocketContext";

// Skeleton loader component
function TicketSkeleton() {
  return (
    <div className="card-elevated p-6 space-y-3">
      <div className="flex items-center justify-between">
        <div className="skeleton h-6 w-2/3"></div>
        <div className="skeleton h-5 w-20"></div>
      </div>
      <div className="skeleton h-4 w-full"></div>
      <div className="skeleton h-4 w-5/6"></div>
      <div className="flex gap-2">
        <div className="skeleton h-5 w-16"></div>
        <div className="skeleton h-5 w-24"></div>
      </div>
    </div>
  );
}

export default function Tickets() {
  const API_BASE = (import.meta.env.VITE_SERVER_URL ?? "").toString().trim();
  const [form, setForm] = useState({ title: "", description: "" });
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [sortBy, setSortBy] = useState(() => localStorage.getItem("ticketSortBy") || "updatedAt");
  const [sortOrder, setSortOrder] = useState(() => localStorage.getItem("ticketSortOrder") || "desc");
  const [showCreate, setShowCreate] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const userStr = localStorage.getItem("user");
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const token = localStorage.getItem("token");
  const { socket } = useSocket();

  // Listen for user status changes to update assignedTo status indicators in real-time
  useEffect(() => {
    if (!socket) return;

    const handleUserStatusChanged = (data) => {
      setTickets((prevTickets) => 
        prevTickets.map((ticket) => {
          if (ticket.assignedTo?._id === data.userId) {
            return {
              ...ticket,
              assignedTo: { ...ticket.assignedTo, status: data.status }
            };
          }
          return ticket;
        })
      );
    };

    socket.on("user_status_changed", handleUserStatusChanged);
    return () => socket.off("user_status_changed", handleUserStatusChanged);
  }, [socket]);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/tickets?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
        method: "GET",
      });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const text = await res.text();
        throw new Error(`Unexpected response (${res.status}): ${text.slice(0, 180)}`);
      }
      let data = await res.json();
      
      if (data.tickets) {
        setTickets(data.tickets);
        setTotalPages(data.pagination.pages);
        setTotalTickets(data.pagination.total);
      } else {
        setTickets([]);
        setTotalTickets(0);
      }
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
    } finally {
      setLoading(false);
    }
  }, [token, API_BASE, page]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    localStorage.setItem("ticketSortBy", sortBy);
    localStorage.setItem("ticketSortOrder", sortOrder);
  }, [sortBy, sortOrder]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await res.json() : { message: await res.text() };

      if (res.ok) {
        setForm({ title: "", description: "" });
        setShowCreate(false);
        fetchTickets();
      } else {
        alert(data.message || "Ticket creation failed");
      }
    } catch (err) {
      alert("Error creating ticket");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      setUpdatingId(id);
      const res = await fetch(`${API_BASE}/tickets/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await res.json() : { message: await res.text() };
      if (!res.ok) {
        alert(data.message || "Failed to update status");
        return;
      }
      setTickets(prev => prev.map(t => (t._id === id ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t)));
    } catch (e) {
      console.error("Failed to update status", e);
      alert("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const summary = useMemo(() => {
    const list = Array.isArray(tickets) ? tickets : [];
    const s = { total: list.length, todo: 0, inprog: 0, done: 0 };
    list.forEach((t) => {
      if (t?.status === "To-Do") s.todo++;
      else if (t?.status === "In Progress") s.inprog++;
      else if (t?.status === "Completed") s.done++;
    });
    return s;
  }, [tickets]);

  const sortedTickets = useMemo(() => {
    // Only sort if we have tickets
    if (!tickets || tickets.length === 0) return [];
    
    // Priority mapping
    const priorityRank = { Low: 1, Medium: 2, High: 3 };

    const arr = [...tickets];
    
    // If no sort specified, return as-is (backend sorted)
    if (!sortBy) return arr;

    arr.sort((a, b) => {
      let aVal = a[sortBy] ?? a["updatedAt"] ?? a["createdAt"];
      let bVal = b[sortBy] ?? b["updatedAt"] ?? b["createdAt"];

      if (sortBy === "priority") {
        const aRank = priorityRank[aVal] ?? 0;
        const bRank = priorityRank[bVal] ?? 0;
        return sortOrder === "asc" ? aRank - bRank : bRank - aRank;
      }

      const aDate = typeof aVal === "string" && !isNaN(Date.parse(aVal)) ? Date.parse(aVal) : null;
      const bDate = typeof bVal === "string" && !isNaN(Date.parse(bVal)) ? Date.parse(bVal) : null;
      if (aDate !== null && bDate !== null) {
        return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
      }
      
      return 0;
    });
    return arr;
  }, [tickets, sortBy, sortOrder]);

  const safeSorted = Array.isArray(sortedTickets) ? sortedTickets : [];
  // Removed paginatedTickets slice since safeSorted contains only current page tickets
  
  // Avatar helper
  const getInitials = (email) => {
    if (!email) return "?";
    const parts = email.split("@")[0].split(/[._-]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return email.slice(0, 2).toUpperCase();
  };

  const getAvatarColor = (email) => {
    if (!email) return "#6366f1";
    const hash = email.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];
    return colors[hash % colors.length];
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* KPI Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card-elevated p-5">
              <div className="text-sm font-medium text-slate-400 mb-1">Total Tickets</div>
              <div className="text-3xl font-bold text-indigo-400">{summary.total}</div>
            </div>
            <div className="card-elevated p-5">
              <div className="text-sm font-medium text-slate-400 mb-1">To-Do</div>
              <div className="text-3xl font-bold text-yellow-400">{summary.todo}</div>
            </div>
            <div className="card-elevated p-5">
              <div className="text-sm font-medium text-slate-400 mb-1">In Progress</div>
              <div className="text-3xl font-bold text-blue-400">{summary.inprog}</div>
            </div>
            <div className="card-elevated p-5">
              <div className="text-sm font-medium text-slate-400 mb-1">Completed</div>
              <div className="text-3xl font-bold text-green-400">{summary.done}</div>
            </div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                {currentUser?.role === 'admin' ? 'All Tickets' : currentUser?.role === 'moderator' ? 'Assigned to Me' : 'My Tickets'}
              </h1>
              <p className="text-slate-400 text-sm">Manage and track your support requests</p>
            </div>
            <button 
              onClick={() => setShowCreate(v => !v)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-all flex items-center gap-2"
            >
              <span className="text-xl leading-none">+</span>
              <span>{showCreate ? 'Cancel' : 'New Ticket'}</span>
            </button>
          </div>

          {/* Create form */}
          {showCreate && (
            <div className="card-elevated p-6 mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Create New Ticket</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
                  <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="Brief description of the issue"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Provide detailed information about the issue"
                    rows="4"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
                    required
                  ></textarea>
                </div>
                <div className="flex gap-3">
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
                  >
                    {submitting ? "Creating..." : "Create Ticket"}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Sort controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="text-sm text-slate-400">
              Showing {safeSorted.length} of {totalTickets} tickets
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-400">Sort:</span>
              <div className="inline-flex rounded-lg bg-slate-800 p-1">
                <button
                  onClick={() => setSortBy('updatedAt')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${sortBy === 'updatedAt' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Updated
                </button>
                <button
                  onClick={() => setSortBy('createdAt')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${sortBy === 'createdAt' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Created
                </button>
                <button
                  onClick={() => setSortBy('priority')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${sortBy === 'priority' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Priority
                </button>
              </div>
              <div className="inline-flex rounded-lg bg-slate-800 p-1">
                <button
                  onClick={() => setSortOrder('asc')}
                  title="Ascending"
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${sortOrder === 'asc' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  ↑
                </button>
                <button
                  onClick={() => setSortOrder('desc')}
                  title="Descending"
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${sortOrder === 'desc' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  ↓
                </button>
              </div>
            </div>
          </div>

          {/* Tickets list */}
          <div className="space-y-4">
            {loading ? (
              <>
                <TicketSkeleton />
                <TicketSkeleton />
                <TicketSkeleton />
              </>
            ) : safeSorted.length > 0 ? (
              safeSorted.map((ticket) => (
                <Link
                  key={ticket._id}
                  to={`/tickets/${ticket._id}`}
                  className="block card-elevated p-6 hover:shadow-xl"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      {ticket.status === 'Completed' && (
                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M5 13l4 4L19 7" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1">{ticket.title}</h3>
                        <p className="text-sm text-slate-400 line-clamp-2 mb-3">{ticket.description}</p>
                        
                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`status-badge ${ticket.status === 'To-Do' ? 'status-todo' : ticket.status === 'In Progress' ? 'status-inprogress' : 'status-completed'}`}>
                            {ticket.status}
                          </span>
                          {ticket.priority && (
                            <span className={`status-badge ${ticket.priority === 'High' ? 'priority-high' : ticket.priority === 'Medium' ? 'priority-medium' : 'priority-low'}`}>
                              {ticket.priority}
                            </span>
                          )}
                          {ticket.assignedTo?.email && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 rounded-md">
                              <div className="relative">
                                <div 
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
                                  style={{ background: getAvatarColor(ticket.assignedTo.email) }}
                                >
                                  {getInitials(ticket.assignedTo.email)}
                                </div>
                                {ticket.assignedTo.status && (
                                  <div className="absolute -bottom-0.5 -right-0.5">
                                    <StatusIndicator status={ticket.assignedTo.status} size="xs" />
                                  </div>
                                )}
                              </div>
                              <span className="text-xs text-slate-400">{ticket.assignedTo.email.split("@")[0]}</span>
                            </div>
                          )}
                          <span className="text-xs text-slate-500">
                            {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status update for admins/moderators */}
                  {(currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator')) && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <label className="text-xs text-slate-400">Update Status:</label>
                        <select
                          value={ticket.status}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onChange={(e) => { e.preventDefault(); handleStatusChange(ticket._id, e.target.value); }}
                          disabled={updatingId === ticket._id}
                          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                        >
                          <option>To-Do</option>
                          <option>In Progress</option>
                          <option>Completed</option>
                        </select>
                      </div>
                    </div>
                  )}
                </Link>
              ))
            ) : (
              <EmptyState
                title="No tickets yet"
                message="Create your first ticket to get started with our support system."
                ctaText="Create a ticket"
                onCta={() => setShowCreate(true)}
              />
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-slate-300 text-sm">
                Page {page} of {totalPages || 1}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages || 1, p + 1))}
                disabled={page >= totalPages}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

