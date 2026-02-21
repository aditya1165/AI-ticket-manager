import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import TicketComments from "../components/ticket-comments.jsx";
import Navbar from "../components/navbar.jsx";
import { useSocket } from "../contexts/SocketContext.jsx";
import StatusIndicator from "../components/status-indicator.jsx";

export default function TicketDetailsPage() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const API_BASE = (import.meta.env.VITE_SERVER_URL ?? "").toString().trim();
  const [updating, setUpdating] = useState(false);
  const { socket, isConnected } = useSocket();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");

  // Real-time socket listeners
  useEffect(() => {
    if (!socket || !id) return;

    // Join the ticket room
    socket.emit("join_ticket", id);

    // Listen for new comments
    const handleCommentAdded = (data) => {
      if (data.ticketId === id) {
        setTicket((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            comments: [...(prev.comments || []), data.comment]
          };
        });
      }
    };

    // Listen for status updates
    const handleStatusUpdated = (data) => {
      if (data.ticketId === id) {
        setTicket((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: data.status
          };
        });
      }
    };

    // Listen for user status changes (for createdBy/assignedTo status indicators)
    const handleUserStatusChanged = (data) => {
      setTicket((prev) => {
        if (!prev) return prev;
        const updated = { ...prev };
        
        // Update createdBy status if it matches
        if (updated.createdBy?._id === data.userId) {
          updated.createdBy = { ...updated.createdBy, status: data.status };
        }
        
        // Update assignedTo status if it matches
        if (updated.assignedTo?._id === data.userId) {
          updated.assignedTo = { ...updated.assignedTo, status: data.status };
        }
        
        return updated;
      });
    };

    socket.on("comment_added", handleCommentAdded);
    socket.on("status_updated", handleStatusUpdated);
    socket.on("user_status_changed", handleUserStatusChanged);

    // Cleanup
    return () => {
      socket.emit("leave_ticket", id);
      socket.off("comment_added", handleCommentAdded);
      socket.off("status_updated", handleStatusUpdated);
      socket.off("user_status_changed", handleUserStatusChanged);
    };
  }, [socket, id]);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setLoading(true);
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

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-slate-900">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Real-time connection indicator */}
            {isConnected && (
              <div className="mb-4 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-400 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                Live updates active
              </div>
            )}
            <div className="card-elevated p-8 space-y-4">
              <div className="skeleton h-8 w-2/3"></div>
              <div className="skeleton h-4 w-full"></div>
              <div className="skeleton h-4 w-5/6"></div>
              <div className="skeleton h-20 w-full"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!ticket) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Ticket not found</h2>
            <p className="text-slate-400">The ticket you're looking for doesn't exist.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">          {/* Real-time connection indicator */}
          {isConnected && (
            <div className="mb-4 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-400 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              Live updates active
            </div>
          )}          <div className="card-elevated p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  {ticket.status === 'Completed' && (
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13l4 4L19 7" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                  <h2 className="text-3xl font-bold text-white">{ticket.title}</h2>
                </div>
                <p className="text-slate-300 leading-relaxed mb-6">{ticket.description}</p>

                {/* Meta badges */}
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  <span className={`status-badge ${ticket.status === 'To-Do' ? 'status-todo' : ticket.status === 'In Progress' ? 'status-inprogress' : 'status-completed'}`}>
                    {ticket.status}
                  </span>
                  {ticket.priority && (
                    <span className={`status-badge ${ticket.priority === 'High' ? 'priority-high' : ticket.priority === 'Medium' ? 'priority-medium' : 'priority-low'}`}>
                      Priority: {ticket.priority}
                    </span>
                  )}
                </div>

                {/* Metadata grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 border-b border-slate-700">
                  {ticket?.createdBy?.email && (
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                          style={{ background: getAvatarColor(ticket.createdBy.email) }}
                        >
                          {getInitials(ticket.createdBy.email)}
                        </div>
                        {ticket.createdBy.status && (
                          <div className="absolute -bottom-0.5 -right-0.5">
                            <StatusIndicator status={ticket.createdBy.status} size="sm" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Created By</div>
                        <div className="text-sm font-medium text-white">{ticket.createdBy.email}</div>
                      </div>
                    </div>
                  )}

                  {ticket?.assignedTo?.email && (
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                          style={{ background: getAvatarColor(ticket.assignedTo.email) }}
                        >
                          {getInitials(ticket.assignedTo.email)}
                        </div>
                        {ticket.assignedTo.status && (
                          <div className="absolute -bottom-0.5 -right-0.5">
                            <StatusIndicator status={ticket.assignedTo.status} size="sm" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Assigned To</div>
                        <div className="text-sm font-medium text-white">{ticket.assignedTo.email}</div>
                      </div>
                    </div>
                  )}

                  {ticket.createdAt && (
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Created</div>
                      <div className="text-sm text-white">{new Date(ticket.createdAt).toLocaleString()}</div>
                    </div>
                  )}

                  {(user && user.role !== 'user' && ticket.updatedAt) && (
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Last Updated</div>
                      <div className="text-sm text-white">{new Date(ticket.updatedAt).toLocaleString()}</div>
                    </div>
                  )}

                  {ticket.deadline && (
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Deadline</div>
                      <div className="text-sm text-white">{new Date(ticket.deadline).toLocaleDateString()}</div>
                    </div>
                  )}
                </div>

                {/* Skills & Notes for admin/moderator */}
                {(user && user.role !== 'user') && (
                  <div className="mt-6 space-y-4">
                    {Array.isArray(ticket?.relatedSkills) && ticket.relatedSkills.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-slate-300 mb-2">Related Skills</div>
                        <div className="flex flex-wrap gap-2">
                          {ticket.relatedSkills.map((skill, idx) => (
                            <span key={idx} className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-md text-sm">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {ticket?.helpfulNotes && (
                      <div>
                        <div className="text-sm font-medium text-slate-300 mb-2">AI-Generated Notes</div>
                        <div className="prose prose-invert prose-sm max-w-none p-4 bg-slate-800 rounded-lg">
                          <ReactMarkdown>{ticket.helpfulNotes}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Status update for admin/moderator */}
                {(user && (user.role === 'admin' || (user.role === 'moderator' && ticket.assignedTo?._id === user._id))) && (
                  <div className="mt-6 pt-6 border-t border-slate-700">
                    <label className="block text-sm font-medium text-slate-300 mb-3">Update Status</label>
                    <select
                      className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      disabled={updating}
                    >
                      <option>To-Do</option>
                      <option>In Progress</option>
                      <option>Completed</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <TicketComments ticket={ticket} user={user} />
          </div>
        </div>
      </div>
    </>
  );
}
