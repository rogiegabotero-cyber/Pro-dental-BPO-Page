import { useEffect, useRef, useState } from "react";
import {
  FaBars,
  FaChevronDown,
  FaCog,
  FaHome,
  FaSignOutAlt,
  FaTachometerAlt,
  FaTimes,
} from "react-icons/fa";
import dental_logo from "../assets/Image/1.webp";
import dental_logo2 from "../assets/Image/2.webp";
import LogoutConfirmModal from "./LogoutConfirmModal";
import "../assets/Style/navbar.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef(null);
  const profileRef = useRef(null);
  const [activeSection, setActiveSection] = useState("");
  const { user, logout, isAdmin, isOwner } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);

      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

      scrollTimeout.current = setTimeout(() => {
        setIsScrolling(false);
      }, 200);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname]);

  // Route-aware scroll helper
  const scrollToSection = (id) => {
    const doScroll = () => {
      const section = document.getElementById(id);
      if (section) section.scrollIntoView({ behavior: "smooth" });
      setOpen(false);
    };

    // If not on homepage, go home first then scroll
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(doScroll, 50); // wait for home sections to mount
      return;
    }

    doScroll();
  };

  const handleLogoClick = () => {
    const goTop = () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setOpen(false);
    };

    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(goTop, 50);
      return;
    }

    goTop();
  };

  const handleSignIn = () => {
    navigate("/login", {
      state: {
        from: {
          pathname: location.pathname,
          search: location.search,
        },
      },
    });
    setOpen(false);
    setProfileOpen(false);
  };

  const handleProfileToggle = () => {
    if (!user) {
      handleSignIn();
      return;
    }

    setProfileOpen((current) => !current);
  };

  const handleSettings = () => {
    navigate("/settings");
    setProfileOpen(false);
    setOpen(false);
  };

  const handleAdminPanel = () => {
    navigate("/admin");
    setProfileOpen(false);
    setOpen(false);
  };

  const openLogoutConfirm = () => {
    setProfileOpen(false);
    setOpen(false);
    setLogoutOpen(true);
  };

  const handleLogout = async () => {
    setLogoutOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  // Only observe sections on homepage (prevents weird behavior on /faq)
  useEffect(() => {
    if (location.pathname !== "/") return;

    const sections = ["services", "about", "reviews", "articles", "contact"];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { threshold: 0.6 }
    );

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [location.pathname]);

  return (
    <nav className={`nav ${isScrolling ? "scrolling" : ""}`}>
      <div
        className="nav-logo logo-tooltip-wrapper"
        onClick={handleLogoClick}
        style={{ cursor: "pointer" }}
      >
        <img src={dental_logo} className="logo-icon" alt="Dental Logo" />
        <img src={dental_logo2} className="logo-icon2" alt="Dental Name" />

        <span className="logo-tooltip">
          <FaHome className="logo-tooltip-icon" />
          Home
        </span>
      </div>

      <ul className={`nav-links ${open ? "open" : ""}`}>
        <li
          className={`serv ${
            location.pathname === "/" && activeSection === "services" ? "active" : ""
          }`}
          onClick={() => scrollToSection("services")}
        >
          Services
        </li>

        <li
          className={`abt ${
            location.pathname === "/" && activeSection === "about" ? "active" : ""
          }`}
          onClick={() => scrollToSection("about")}
        >
          About
        </li>

        <li
          className={`rev ${
            location.pathname === "/" && activeSection === "reviews" ? "active" : ""
          }`}
          onClick={() => scrollToSection("reviews")}
        >
          Benefits
        </li>

        <li
          className={`cont ${
            location.pathname === "/" && activeSection === "articles" ? "active" : ""
          }`}
          onClick={() => scrollToSection("articles")}
        >
          Articles
        </li>

        <li
          className={`cont ${
            location.pathname === "/" && activeSection === "contact" ? "active" : ""
          }`}
          onClick={() => scrollToSection("contact")}
        >
          Contact
        </li>

        <li
          className={`cont ${location.pathname === "/faq" ? "active" : ""}`}
          onClick={() => setOpen(false)}
        >
          <Link className="nav-link" to="/faq">
            FAQ
          </Link>
        </li>

        {/* <li className="cont" onClick={() => setOpen(false)}>
          <a href="#" onClick={(e) => e.preventDefault()}>
            Client Portal
          </a>
        </li> */}

        <button
          className="btn-primary mobile-btn"
          onClick={() => scrollToSection("contact")}
        >
          Book Appointment
        </button>
      </ul>

      <button className="menu-toggle" onClick={() => setOpen(!open)}>
        {open ? <FaTimes /> : <FaBars />}
      </button>

      <div className="nav-actions">
        <button className="slice" onClick={() => scrollToSection("contact")}>
          <span className="text">Schedule Consultation</span>
        </button>

        <div
          className={`profile-wrapper ${profileOpen ? "profile-wrapper--open" : ""}`}
          ref={profileRef}
        >
          <button
            className={`client-auth ${user ? "client-auth--signed-in" : ""}`}
            type="button"
            onClick={handleProfileToggle}
            title={user ? user.email : "Sign in"}
            aria-label={user ? `Signed in as ${user.displayName || user.email}` : "Sign in"}
            aria-haspopup={user ? "menu" : undefined}
            aria-expanded={user ? profileOpen : undefined}
          >
            {user?.photoURL ? (
              <img
                className="client-auth__avatar"
                src={user.photoURL}
                alt={user.displayName || "Google profile"}
              />
            ) : user ? (
              <span className="client-auth__avatar client-auth__avatar--initial">
                {(user.displayName || user.email || "G").charAt(0).toUpperCase()}
              </span>
            ) : (
              "Sign in"
            )}
            {user && <FaChevronDown className="client-auth__chevron" aria-hidden="true" />}
          </button>

          {user && profileOpen && (
            <div className="profile-dropdown" role="menu" aria-label="Account options">
              <div className="profile-dropdown__header">
                <div className="profile-dropdown__avatar">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" />
                  ) : (
                    <span>{(user.displayName || user.email || "G").charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="profile-dropdown__user">
                  <strong className="profile-dropdown__name">
                    {user.displayName || "Signed in"}
                  </strong>
                  <span className="profile-dropdown__email">{user.email}</span>
                </div>
              </div>

              <div className="profile-dropdown__divider" />

              <div className="profile-dropdown__items">
                {(isAdmin || isOwner) && (
                  <button
                    type="button"
                    className="profile-dropdown__item"
                    onClick={handleAdminPanel}
                  >
                    <FaTachometerAlt className="profile-dropdown__icon" aria-hidden="true" />
                    <span>Admin Panel</span>
                  </button>
                )}
                <button
                  type="button"
                  className="profile-dropdown__item"
                  onClick={handleSettings}
                >
                  <FaCog className="profile-dropdown__icon" aria-hidden="true" />
                  <span>Settings</span>
                </button>
                <button
                  type="button"
                  className="profile-dropdown__item profile-dropdown__item--logout"
                  onClick={openLogoutConfirm}
                >
                  <FaSignOutAlt className="profile-dropdown__icon" aria-hidden="true" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <LogoutConfirmModal
        isOpen={logoutOpen}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />
    </nav>
  );
}
