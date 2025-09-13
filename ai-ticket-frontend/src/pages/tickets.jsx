import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/navbar";

export default function Tickets() {
  const [form, setForm] = useState({ title: "", description: "" });
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const token = localStorage.getItem("token");

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
        method: "GET",
      });
      let data = await res.json();
      data = Array.isArray(data) ? data : [];
      setTickets(data);
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [sortBy, sortOrder]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

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

  // Sorting and pagination logic
  const sortedTickets = [...tickets].sort((a, b) => {
    const aVal = a[sortBy] || a["updatedAt"] || a["createdAt"];
    const bVal = b[sortBy] || b["updatedAt"] || b["createdAt"];
    if (!aVal || !bVal) return 0;
    if (sortOrder === "desc") {
      return new Date(bVal) - new Date(aVal);
    } else {
      return new Date(aVal) - new Date(bVal);
    }
  });
  const ticketsPerPage = 5;
  const totalPages = Math.ceil(sortedTickets.length / ticketsPerPage);
  const paginatedTickets = sortedTickets.slice((page - 1) * ticketsPerPage, page * ticketsPerPage);

  return (
    <>
      <Navbar />
      <div className="p-4 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Create Ticket</h2>
        <form onSubmit={handleSubmit} className="space-y-3 mb-8">
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

        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 gap-2">
          <h2 className="text-xl font-semibold">All Tickets</h2>
          <div className="flex flex-wrap gap-2 items-center md:justify-end">
            <label className="text-sm whitespace-nowrap">Sort by:</label>
            <select
              className="select select-bordered select-sm"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="updatedAt">Last Updated</option>
              <option value="createdAt">Created At</option>
              <option value="priority">Priority</option>
            </select>
            <select
              className="select select-bordered select-sm"
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {paginatedTickets.map((ticket) => (
            <Link
              key={ticket._id}
              className="card shadow-md p-4 bg-gray-800"
              to={`/tickets/${ticket._id}`}
            >
              <h3 className="font-bold text-lg mb-1">{ticket.title}</h3>
              {ticket.priority && (
                <span className="badge badge-info mb-2">Priority: {ticket.priority}</span>
              )}
              <p className="text-sm mb-1">{ticket.description}</p>
              <p className="text-sm text-gray-500 mb-0">
                Created At: {new Date(ticket.createdAt).toLocaleString()}
              </p>
              {ticket.updatedAt && (
                <p className="text-xs text-gray-400">Last Updated: {new Date(ticket.updatedAt).toLocaleString()}</p>
              )}
            </Link>
          ))}
          {tickets.length === 0 && <p>No tickets submitted yet.</p>}
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
