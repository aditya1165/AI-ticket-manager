import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function CheckAuth({ children, protectedRoute }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    
    // setLoading(false)
    if (protectedRoute) {
      if (!token) {
        navigate("/login");
      } else {
        setLoading(false);
      }
    } else {
        // Only redirect if on login/signup and token exists
        if (token) {
          navigate("/");
        } else {
          setLoading(false);
        }
    } 
    }, [navigate, protectedRoute]);

    if (loading) {
      return <div>loading...</div>;
    }
    return children;
      
}

export default CheckAuth;
