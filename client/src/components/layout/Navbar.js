import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, logout, isSystemAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">
          <i className="bi bi-building me-2"></i>
          Blueprint Marketing
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/')}`} to="/">
                <i className="bi bi-house-door me-1"></i>
                Dashboard
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/projects')}`} to="/projects">
                <i className="bi bi-folder me-1"></i>
                Projects
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/shelf')}`} to="/shelf">
                <i className="bi bi-archive me-1"></i>
                Shelf
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/calendar')}`} to="/calendar">
                <i className="bi bi-calendar3 me-1"></i>
                Calendar
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/stats')}`} to="/stats">
                <i className="bi bi-graph-up me-1"></i>
                Stats
              </Link>
            </li>
            {user?.role === 'client' && (
              <li className="nav-item">
                <Link className={`nav-link ${isActive('/feedback')}`} to="/feedback">
                  <i className="bi bi-chat-square-text me-1"></i>
                  Feedback
                </Link>
              </li>
            )}
            {isSystemAdmin && (
              <li className="nav-item">
                <Link className={`nav-link ${isActive('/users')}`} to="/users">
                  <i className="bi bi-people me-1"></i>
                  Users
                </Link>
              </li>
            )}
          </ul>

          <ul className="navbar-nav">
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle"
                href="#"
                id="userDropdown"
                role="button"
                data-bs-toggle="dropdown"
              >
                <i className="bi bi-person-circle me-1"></i>
                {user?.firstName} {user?.lastName}
                <span className="badge bg-light text-primary ms-2">
                  {user?.role}
                </span>
              </a>
              <ul className="dropdown-menu dropdown-menu-end">
                <li>
                  <span className="dropdown-item-text text-muted">
                    {user?.email}
                  </span>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button className="dropdown-item" onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right me-2"></i>
                    Logout
                  </button>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
