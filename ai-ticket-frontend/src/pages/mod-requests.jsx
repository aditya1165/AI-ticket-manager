import { useEffect, useState } from "react";
import Navbar from "../components/navbar";

// Helper for avatar initials
const getInitials = (username) => {
  if (!username) return "?";
  const parts = username.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return username.slice(0, 2).toUpperCase();
};

// Helper for deterministic avatar color
const getAvatarColor = (str) => {
  if (!str) return "bg-slate-600";
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ["bg-indigo-600", "bg-purple-600", "bg-pink-600", "bg-blue-600", "bg-cyan-600"];
  return colors[Math.abs(hash) % colors.length];
};

// Skeleton loader
const RequestSkeleton = () => (
  <div className="card-elevated p-6 animate-pulse">
    <div className="flex gap-4">
      <div className="w-12 h-12 rounded-full bg-slate-700"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-700 rounded w-1/3"></div>
        <div className="h-3 bg-slate-700 rounded w-1/2"></div>
        <div className="h-3 bg-slate-700 rounded w-2/3"></div>
      </div>
      <div className="flex gap-2">
        <div className="w-20 h-8 bg-slate-700 rounded"></div>
        <div className="w-20 h-8 bg-slate-700 rounded"></div>
      </div>
    </div>
  </div>
);

export default function ModRequestsPage() {
  const API_BASE = (import.meta.env.VITE_SERVER_URL ?? "").toString().trim();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/mod-requests`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setRequests(data.requests || []);
      else alert(data.message || "Failed to fetch");
    } catch (err) {
      console.error(err);
      alert("Error fetching requests");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchRequests();
  }, [API_BASE]);

  const takeAction = async (id, action) => {
    setProcessingId(id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/mod-requests/${id}/decide`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, 
        body: JSON.stringify({ action }) 
      });
      const data = await res.json();
      if (!res.ok) alert(data.message || "Failed");
      else await fetchRequests();
    } catch (err) { 
      console.error(err); 
      alert("Error") 
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Moderator Requests</h1>
          <p className="text-slate-400">Review and manage moderator applications</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <RequestSkeleton key={i} />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="card-elevated p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-slate-400 text-lg">No pending requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((r) => (
              <div key={r._id} className="card-elevated p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-full ${getAvatarColor(r.username)} flex items-center justify-center text-white font-semibold flex-shrink-0`}>
                    {getInitials(r.username)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-white">{r.username}</h3>
                      <span className="text-sm text-slate-400">{r.email}</span>
                    </div>
                    {r.skills && r.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {r.skills.map((skill, idx) => (
                          <span key={idx} className="px-2 py-1 text-xs font-medium bg-indigo-500/20 text-indigo-300 rounded-md">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-slate-500">
                      Applied {new Date(r.createdAt).toLocaleDateString()} at {new Date(r.createdAt).toLocaleTimeString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button 
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => takeAction(r._id, 'accept')}
                      disabled={processingId === r._id}
                    >
                      {processingId === r._id ? "..." : "Accept"}
                    </button>
                    <button 
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => takeAction(r._id, 'reject')}
                      disabled={processingId === r._id}
                    >
                      {processingId === r._id ? "..." : "Reject"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

