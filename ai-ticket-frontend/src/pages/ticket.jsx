import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import TicketComments from "../components/ticket-comments.jsx"; // Create this file/component

export default function TicketDetailsPage() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const API_BASE = (import.meta.env.VITE_SERVER_URL ?? "").toString().trim();
  const [updating, setUpdating] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");
  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/tickets/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const ct = res.headers.get("content-type") || "";
        const data = ct.includes("application/json") ? await res.json() : { message: await res.text() };
        if (res.ok) {
          setTicket(data.ticket || data);
        } else {
          alert(data.message || "Failed to fetch ticket");
        }
      } catch (err) {
        console.error(err);
        alert("Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id, token, API_BASE]);

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdating(true);
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
      setTicket(prev => ({ ...prev, status: newStatus, updatedAt: new Date().toISOString() }));
    } catch (e) {
      console.error("Failed to update status", e);
      alert("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  if (loading)
    return <div className="text-center mt-10">Loading ticket details...</div>;
  if (!ticket) return <div className="text-center mt-10">Ticket not found</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Ticket Details</h2>

      <div className="card bg-gray-800 shadow p-4 space-y-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          {ticket.status === 'Completed' && (
            <span className="text-green-400" title="Completed">✓</span>
          )}
          {ticket.title}
        </h3>
        <p>{ticket.description}</p>

        {/* Conditionally render extended details */}
        {ticket.status && (
          <>
            <div className="divider">Metadata</div>
            <div className="flex items-center gap-2">
              <p className="whitespace-nowrap">
                <strong>Status:</strong> {ticket.status}
              </p>
              {(user && (user.role === 'admin' || (user.role === 'moderator' && ticket.assignedTo?._id === user._id))) && (
                <select
                  className="select select-bordered select-sm w-40 ml-2"
                  value={ticket.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={updating}
                  aria-label="Update ticket status"
                >
                  <option>To-Do</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                </select>
              )}
            </div>
            {ticket.priority && (
              <p>
                <strong>Priority:</strong> {ticket.priority}
              </p>
            )}

            {ticket?.createdBy?.email && (
              <p>
                <strong>Created By:</strong> {ticket.createdBy.email}
              </p>
            )}

            {ticket?.assignedTo?.email && (
              <p>
                <strong>Assigned To:</strong> {ticket.assignedTo.email}
              </p>
            )}

            {(user && user.role !== 'user' && Array.isArray(ticket?.relatedSkills) && ticket.relatedSkills.length > 0) && (
              <p>
                <strong>Related Skills:</strong>{" "}
                {ticket.relatedSkills.join(", ")}
              </p>
            )}

            {(user && user.role !== 'user' && ticket?.helpfulNotes) && (
              <div>
                <strong>Helpful Notes:</strong>
                <div className="prose max-w-none rounded mt-2">
                  <ReactMarkdown>{ticket.helpfulNotes}</ReactMarkdown>
                </div>
              </div>
            )}

            {ticket.createdAt && (
              <p className="text-sm text-gray-500 mt-2">
                Created At: {new Date(ticket.createdAt).toLocaleString()}
              </p>
            )}
            {(user && user.role !== 'user' && ticket.updatedAt) && (
              <p className="text-sm text-gray-500">
                Updated At: {new Date(ticket.updatedAt).toLocaleString()}
              </p>
            )}
            {ticket.deadline && (
              <p className="text-sm text-gray-500">
                Deadline: {new Date(ticket.deadline).toLocaleDateString()}
              </p>
            )}
          </>
        )}
      </div>
      <TicketComments ticket={ticket} user={user} />
    </div>
  );
}
