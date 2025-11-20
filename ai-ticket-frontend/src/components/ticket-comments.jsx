import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function TicketComments({ ticket, user }) {
  const { id } = useParams();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const API_BASE = (import.meta.env.VITE_SERVER_URL ?? "").toString().trim();

  useEffect(() => {
    const fetchComments = async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tickets/${id}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await res.json() : { comments: [] };
      setComments(data.comments || []);
    };
    fetchComments();
  }, [id, API_BASE]);

  const safeUser = user || {};
  const safeTicket = ticket || {};
  const canInitiate =
    (Array.isArray(comments) ? comments.length === 0 : true) &&
    (safeUser.role === "admin" ||
      (safeUser.role === "moderator" && safeTicket.assignedTo?._id === safeUser._id));
  const canReply =
    (Array.isArray(comments) ? comments.length > 0 : false) &&
    (safeUser.role === "admin" ||
        (safeUser.role === "moderator" && safeTicket.assignedTo?._id === safeUser._id) ||
        (safeUser.role === "user"));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE}/tickets/${id}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ text })
    });
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await res.json() : { comments: [] };
    setComments(data.comments || []);
    setText("");
    setLoading(false);
  };

  const getInitials = (role) => {
    return role ? role[0].toUpperCase() : "U";
  };

  const getRoleColor = (role) => {
    if (role === "admin") return "#8b5cf6";
    if (role === "moderator") return "#3b82f6";
    return "#64748b";
  };

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Comments
      </h3>
      
      <div className="space-y-4 mb-6">
        {comments.map((c, idx) => {
          const isCurrentUser = c.role === user?.role;
          return (
            <div
              key={idx}
              className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex gap-3 max-w-lg ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}>
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                  style={{ background: getRoleColor(c.role) }}
                >
                  {getInitials(c.role)}
                </div>
                <div className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"}`}>
                  <div className={`px-4 py-3 rounded-2xl ${
                    c.role === "admin"
                      ? "bg-purple-500/20 text-purple-100"
                      : c.role === "moderator"
                      ? "bg-blue-500/20 text-blue-100"
                      : "bg-slate-800 text-slate-100"
                  } ${isCurrentUser ? "rounded-tr-sm" : "rounded-tl-sm"}`}>
                    <div className="text-xs font-semibold mb-1 capitalize opacity-75">{c.role}</div>
                    <p className="text-sm leading-relaxed">{c.text}</p>
                  </div>
                  <span className="text-xs text-slate-500 mt-1 px-2">
                    {c.createdAt ? new Date(c.createdAt).toLocaleString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    }) : ""}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {comments.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mx-auto mb-2 opacity-50">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-sm">No comments yet. Start the conversation!</p>
          </div>
        )}
      </div>
      
      {(canInitiate || canReply) && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            placeholder="Type your message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            disabled={loading}
          />
          <button 
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center gap-2" 
            type="submit" 
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="hidden sm:inline">{loading ? "Sending..." : "Send"}</span>
          </button>
        </form>
      )}
    </div>
  );
}
