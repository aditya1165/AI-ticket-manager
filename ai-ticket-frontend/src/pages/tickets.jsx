import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/navbar";
import EmptyState from "../components/empty-state";
 

export default function Tickets() {
  const API_BASE = (import.meta.env.VITE_SERVER_URL ?? "").toString().trim();
  const [form, setForm] = useState({ title: "", description: "" });
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState(() => localStorage.getItem("ticketSortBy") || "updatedAt");
  const [sortOrder, setSortOrder] = useState(() => localStorage.getItem("ticketSortOrder") || "desc");
  const [showCreate, setShowCreate] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  // Current user
  const userStr = localStorage.getItem("user");
  const currentUser = userStr ? JSON.parse(userStr) : null;

  const token = localStorage.getItem("token");

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
        method: "GET",
      });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const text = await res.text();
        throw new Error(`Unexpected response (${res.status}): ${text.slice(0, 180)}`);
      }
      let data = await res.json();
      data = Array.isArray(data) ? data : [];
      setTickets(data);
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
    }
  }, [token, API_BASE]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Persist sort preferences
  useEffect(() => {
    localStorage.setItem("ticketSortBy", sortBy);
    localStorage.setItem("ticketSortOrder", sortOrder);
  }, [sortBy, sortOrder]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
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
        fetchTickets(); // Refresh list
      } else {
        alert(data.message || "Ticket creation failed");
      }
    } catch (err) {
      alert("Error creating ticket");
      console.error(err);
    } finally {
      setLoading(false);
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
      // Update UI optimistically
      setTickets(prev => prev.map(t => (t._id === id ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t)));
    } catch (e) {
      console.error("Failed to update status", e);
      alert("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  // Dashboard summary
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

  // Sorting and pagination logic
  const sortedTickets = useMemo(() => {
    const priorityRank = { Low: 1, Medium: 2, High: 3 };
    const arr = [...tickets];
    arr.sort((a, b) => {
      let aVal = a[sortBy] ?? a["updatedAt"] ?? a["createdAt"];
      let bVal = b[sortBy] ?? b["updatedAt"] ?? b["createdAt"];

      // Priority special handling
      if (sortBy === "priority") {
        const aRank = priorityRank[aVal] ?? 0;
        const bRank = priorityRank[bVal] ?? 0;
        return sortOrder === "asc" ? aRank - bRank : bRank - aRank;
      }

      // Date-like handling
      const aDate = typeof aVal === "string" && !isNaN(Date.parse(aVal)) ? Date.parse(aVal) : null;
      const bDate = typeof bVal === "string" && !isNaN(Date.parse(bVal)) ? Date.parse(bVal) : null;
      if (aDate !== null && bDate !== null) {
        return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
      }

      // Numeric handling
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }

      // String handling
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      // Fallback
      return 0;
    });
    return arr;
  }, [tickets, sortBy, sortOrder]);
  const ticketsPerPage = 5;
  const safeSorted = Array.isArray(sortedTickets) ? sortedTickets : [];
  const totalPages = Math.ceil(safeSorted.length / ticketsPerPage) || 0;
  const paginatedTickets = safeSorted.slice((page - 1) * ticketsPerPage, page * ticketsPerPage);

  return (
    <>
      <Navbar />
      <div className="p-4 max-w-4xl mx-auto">
        {/* Dashboard summary */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
          <div className="stat bg-base-200 rounded">
            <div className="stat-title">Total</div>
            <div className="stat-value text-primary">{summary.total}</div>
          </div>
          <div className="stat bg-base-200 rounded">
            <div className="stat-title">To-Do</div>
            <div className="stat-value text-warning">{summary.todo}</div>
          </div>
          <div className="stat bg-base-200 rounded">
            <div className="stat-title">In Progress</div>
            <div className="stat-value text-info">{summary.inprog}</div>
          </div>
          <div className="stat bg-base-200 rounded">
            <div className="stat-title">Completed</div>
            <div className="stat-value text-success">{summary.done}</div>
          </div>
        </div>

        {/* Create ticket toggle */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">{currentUser?.role === 'admin' ? 'All Tickets' : currentUser?.role === 'moderator' ? 'Assigned to Me' : 'My Tickets'}</h2>
          <button className="btn btn-primary" onClick={() => setShowCreate(v => !v)}>
            <span className="mr-2">+</span> {showCreate ? 'Close' : 'Create New Ticket'}
          </button>
        </div>
        {showCreate && (
          <form onSubmit={handleSubmit} className="space-y-3 mb-8 bg-base-200 p-4 rounded">
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Ticket Title"
              className="input input-bordered w-full"
              required
            />
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Ticket Description"
              className="textarea textarea-bordered w-full"
              required
            ></textarea>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Ticket"}
            </button>
          </form>
        )}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 gap-2">
          <h2 className="text-xl font-semibold">All Tickets</h2>
          <div className="flex flex-wrap gap-2 items-center md:justify-end">
            <span className="text-sm">Sort by:</span>
            <div className="join">
              <button
                type="button"
                className={`btn btn-sm join-item ${sortBy === 'updatedAt' ? 'btn-active' : ''}`}
                onClick={() => setSortBy('updatedAt')}
              >
                Updated
              </button>
              <button
                type="button"
                className={`btn btn-sm join-item ${sortBy === 'createdAt' ? 'btn-active' : ''}`}
                onClick={() => setSortBy('createdAt')}
              >
                Created
              </button>
              <button
                type="button"
                className={`btn btn-sm join-item ${sortBy === 'priority' ? 'btn-active' : ''}`}
                onClick={() => setSortBy('priority')}
              >
                Priority
              </button>
            </div>
            <div className="join">
              <button
                type="button"
                className={`btn btn-sm join-item ${sortOrder === 'asc' ? 'btn-active' : ''}`}
                title="Ascending"
                onClick={() => setSortOrder('asc')}
              >
                ▲
              </button>
              <button
                type="button"
                className={`btn btn-sm join-item ${sortOrder === 'desc' ? 'btn-active' : ''}`}
                title="Descending"
                onClick={() => setSortOrder('desc')}
              >
                ▼
              </button>
            </div>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => { setSortBy('updatedAt'); setSortOrder('desc'); }}
              title="Reset sorting"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {Array.isArray(paginatedTickets) && paginatedTickets.map((ticket) => (
            <Link
              key={ticket._id}
              className="card shadow-md p-4 bg-gray-800"
              to={`/tickets/${ticket._id}`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  {ticket.status === 'Completed' && (
                    <span className="text-green-400" title="Completed">✓</span>
                  )}
                  {ticket.title}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="badge badge-outline">{ticket.status}</span>
                </div>
              </div>
              {ticket.priority && (
                <span className="badge badge-info mb-2">Priority: {ticket.priority}</span>
              )}
              {/* Show extra meta for admin/moderator */}
              {currentUser && currentUser.role !== 'user' && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {ticket.createdBy?.email && (
                    <span className="badge badge-ghost">Created By: {ticket.createdBy.email}</span>
                  )}
                  {ticket.assignedTo?.email && (
                    <span className="badge badge-ghost">Assigned To: {ticket.assignedTo.email}</span>
                  )}
                  {ticket.deadline && (
                    <span className="badge badge-ghost">Deadline: {new Date(ticket.deadline).toLocaleDateString()}</span>
                  )}
                </div>
              )}
              <p className="text-sm mb-1">{ticket.description}</p>
              <p className="text-sm text-gray-500 mb-0">
                Created At: {new Date(ticket.createdAt).toLocaleString()}
              </p>
              {(currentUser && currentUser.role !== 'user' && ticket.updatedAt) && (
                <p className="text-xs text-gray-400">Last Updated: {new Date(ticket.updatedAt).toLocaleString()}</p>
              )}
              {/* Inline status control (only for admin or assigned moderator) */}
              {(currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator')) && (
                <div className="mt-3">
                  <label className="text-xs text-gray-400 mr-2">Update Status:</label>
                  <select
                    className="select select-bordered select-sm w-40"
                    value={ticket.status}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onChange={(e) => handleStatusChange(ticket._id, e.target.value)}
                    disabled={updatingId === ticket._id}
                    aria-label="Update ticket status"
                  >
                    <option>To-Do</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                  </select>
                </div>
              )}
            </Link>
          ))}
          {(Array.isArray(tickets) ? tickets.length : 0) === 0 && (
            <EmptyState
              title="No tickets yet"
              message="You don't have any tickets. Create one to get started."
              ctaText="Create a ticket"
              onCta={() => setShowCreate(true)}
            />
          )}
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Previous
            </button>
            <span className="text-sm">Page {page} of {totalPages}</span>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
  

}
