import { Link, useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";

export default function Navbar() {
  const token = localStorage.getItem("token");
  let user = localStorage.getItem("user");
  if (user) user = JSON.parse(user);
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <nav className="navbar bg-base-200 shadow-lg sticky top-0 z-50">
      <div className="flex-1 flex items-center gap-2">
        <FaUserCircle className="text-2xl text-primary" />
        <Link to="/" className="btn btn-ghost text-xl font-bold">
          Ticket AI
        </Link>
      </div>
      <div className="flex gap-2 items-center">
        {!token ? (
          <>
            <Link to="/signup" className="btn btn-outline btn-sm">
              Signup
            </Link>
            <Link to="/login" className="btn btn-primary btn-sm">
              Login
            </Link>
          </>
        ) : (
          <>
            <span className="font-semibold">{user?.email}</span>
            {user?.role === "admin" && (
              <Link to="/admin" className="btn btn-accent btn-sm">
                Users
              </Link>
            )}
            {user && user.role !== "admin" && user.role !== "moderator" && (
              <Link to="/apply-moderator" className="btn btn-ghost btn-sm">
                Apply Moderator
              </Link>
            )}
            {(user?.role === "admin" || user?.role === "moderator") && (
              <Link to="/admin/mod-requests" className="btn btn-secondary btn-sm">
                View Moderator requests
              </Link>
            )}
            <button onClick={logout} className="btn btn-error btn-sm">
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}