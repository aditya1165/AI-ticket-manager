import { useEffect, useState } from "react";

export default function ModRequestsPage() {
  const API_BASE = (import.meta.env.VITE_SERVER_URL ?? "").toString().trim();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

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
    (async () => {
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
    })();
  }, [API_BASE]);

  const takeAction = async (id, action) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/mod-requests/${id}/decide`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action }) });
      const data = await res.json();
      if (!res.ok) alert(data.message || "Failed");
      else fetchRequests();
    } catch (err) { console.error(err); alert("Error") }
  };

  if (loading) return <div className="text-center mt-8">Loading requests...</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Moderator Requests</h2>
      <div className="space-y-3">
        {requests.length === 0 && <div className="text-gray-500">No pending requests</div>}
        {requests.map((r) => (
          <div key={r._id} className="flex items-center justify-between bg-base-200 p-3 rounded">
            <div>
              <div className="font-semibold">{r.username} <span className="text-sm text-gray-500">({r.email})</span></div>
              <div className="text-sm text-gray-600">Skills: {(r.skills || []).join(", ")}</div>
              <div className="text-xs text-gray-500">Applied: {new Date(r.createdAt).toLocaleString()}</div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-sm btn-success" onClick={() => takeAction(r._id, 'accept')}>Accept</button>
              <button className="btn btn-sm btn-outline" onClick={() => takeAction(r._id, 'reject')}>Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
