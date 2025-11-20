import { useEffect, useState, useCallback } from "react";
import Navbar from "../components/navbar";

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ role: "", skills: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
        setFilteredUsers(data);
      } else {
        console.error(data.error);
      }
    } catch (err) {
      console.error("Error fetching users", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEditClick = (user) => {
    setEditingUser(user.email);
    setFormData({
      role: user.role,
      skills: user.skills?.join(", "),
    });
  };

  const handleUpdate = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/auth/update-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: editingUser,
            role: formData.role,
            skills: formData.skills
              .split(",")
              .map((skill) => skill.trim())
              .filter(Boolean),
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || "Failed to update user");
        return;
      }

      setEditingUser(null);
      setFormData({ role: "", skills: "" });
      fetchUsers();
    } catch (err) {
      console.error("Update failed", err);
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    setFilteredUsers(
      users.filter((user) => user.email.toLowerCase().includes(query))
    );
  };

  const getInitials = (email) => {
    if (!email) return "U";
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
            <p className="text-slate-400 text-sm">Manage roles and skills for all users</p>
          </div>

          <div className="mb-6">
            <input
              type="text"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Search by email..."
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="card-elevated p-6">
                  <div className="skeleton h-6 w-48 mb-3"></div>
                  <div className="skeleton h-4 w-32 mb-2"></div>
                  <div className="skeleton h-4 w-64"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div
                  key={user._id}
                  className="card-elevated p-6"
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                      style={{ background: getAvatarColor(user.email) }}
                    >
                      {getInitials(user.email)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{user.email}</h3>
                        <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                          user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                          user.role === 'moderator' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                          {user.role}
                        </span>
                      </div>
                      <div className="mb-3">
                        <span className="text-sm text-slate-400">Skills: </span>
                        {user.skills && user.skills.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {user.skills.map((skill, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-xs">
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500">No skills assigned</span>
                        )}
                      </div>

                      {editingUser === user.email ? (
                        <div className="space-y-3 mt-4 pt-4 border-t border-slate-700">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
                            <select
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                              value={formData.role}
                              onChange={(e) =>
                                setFormData({ ...formData, role: e.target.value })
                              }
                            >
                              <option value="user">User</option>
                              <option value="moderator">Moderator</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Skills (comma-separated)</label>
                            <input
                              type="text"
                              placeholder="e.g., React, Node.js, MongoDB"
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                              value={formData.skills}
                              onChange={(e) =>
                                setFormData({ ...formData, skills: e.target.value })
                              }
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-all"
                              onClick={handleUpdate}
                            >
                              Save Changes
                            </button>
                            <button
                              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-all"
                              onClick={() => setEditingUser(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-all"
                          onClick={() => handleEditClick(user)}
                        >
                          Edit User
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-400">No users found matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

