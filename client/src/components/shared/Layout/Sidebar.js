import React from "react";
// import { userMenu } from './Menus/userMenu'
import { Link, useLocation } from "react-router-dom";
import "../../../styles/Layout.css";
import { useSelector } from "react-redux";

const Sidebar = () => {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const canAccessReports = ["admin", "hospital"].includes(user?.role);
  return (
    <div>
      <div className="sidebar">
        <div className="menu">
          {user?.role === "organisation" && (
            <>
              <div
                className={`menu-item ${location.pathname === "/" && "active"}`}
              >
                <i className="fa-solid fa-cubes"></i>
                <Link to="/">Inventory</Link>
              </div>
              <div
                className={`menu-item ${
                  location.pathname === "/donar" && "active"
                }`}
              >
                <i className="fa-solid fa-hand-holding-medical"></i>
                <Link to="/donar">Donars</Link>
              </div>
              <div
                className={`menu-item ${
                  location.pathname === "/hospital" && "active"
                }`}
              >
                <i className="fa-solid fa-truck-medical"></i>
                <Link to="/hospital">Hospitals</Link>
              </div>
            </>
          )}
          
          {user?.role === "admin" && (
            <>
              <div
                className={`menu-item ${
                  location.pathname === "/donar-list" && "active"
                }`}
              >
                <i className="fa-solid fa-hand-holding-medical"></i>
                <Link to="/donar-list">Donar List</Link>
              </div>
              <div
                className={`menu-item ${
                  location.pathname === "/hospital-list" && "active"
                }`}
              >
                <i className="fa-solid fa-truck-medical"></i>
                <Link to="/hospital-list">Hospital List</Link>
              </div>
              <div
                className={`menu-item ${
                  location.pathname === "/org-list" && "active"
                }`}
              >
                <i className="fa-solid fa-hospital"></i>
                <Link to="/org-list">Organisation List</Link>
              </div>
            </>
          )}

          {user?.role === "donar" && (
            <>
              <div
                className={`menu-item ${
                  location.pathname === "/profile" && "active"
                }`}
              >
                <i className="fa-solid fa-user"></i>
                <Link to="/profile">My Profile</Link>
              </div>
              <div
                className={`menu-item ${
                  location.pathname === "/donar" && "active"
                }`}
              >
                <i className="fa-solid fa-house-medical"></i>
                <Link to="/donar">Dashboard</Link>
              </div>
              <div
                className={`menu-item ${
                  location.pathname === "/organisation" && "active"
                }`}
              >
                <i className="fa-solid fa-building-ngo"></i>
                <Link to="/organisation">Organisations</Link>
              </div>
            </>
          )}

          {user?.role === "hospital" && (
            <>
              <div
                className={`menu-item ${
                  location.pathname === "/organisation" && "active"
                }`}
              >
                <i className="fa-solid fa-building-ngo"></i>
                <Link to="/organisation">Organisations</Link>
              </div>
            </>
          )}

          {/* Blood Map - visible to all roles */}
          <div className={`menu-item ${location.pathname === "/blood-map" && "active"}`}>
            <i className="fa-solid fa-map-location-dot"></i>
            <Link to="/blood-map">Blood Map</Link>
          </div>

          {/* Request Blood - visible to organisation and hospital only */}
          {(user?.role === "organisation" || user?.role === "hospital") && (
            <div className={`menu-item ${location.pathname === "/request-blood" && "active"}`}>
              <i className="fa-solid fa-droplet-slash"></i>
              <Link to="/request-blood">Request Blood</Link>
            </div>
          )}

          {/* Analytics */}
          {canAccessReports && (
            <div className={`menu-item ${location.pathname === "/analytics" && "active"}`}>
              <i className="fa-solid fa-chart-bar"></i>
              <Link to="/analytics">Analytics</Link>
            </div>
          )}

          {canAccessReports && (
            <div
              className={`menu-item ${
                location.pathname === "/statistical-dashboard" && "active"
              }`}
            >
              <i className="fa-solid fa-brain"></i>
              <Link to="/statistical-dashboard">Statistical Dashboard</Link>
            </div>
          )}

          {canAccessReports && (
            <div
              className={`menu-item ${
                location.pathname === "/consumer" && "active"
              }`}
            >
              <i className="fa-solid fa-users-between-lines"></i>
              <Link to="/consumer">Consumer</Link>
            </div>
          )}
          {user?.role === "donar" && (
            <div
              className={`menu-item ${
                location.pathname === "/donation" && "active"
              }`}
            >
              <i className="fa-solid fa-book-medical"></i>
              <Link to="/donation">Donations Log</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
