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
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { defaultNavbarContent } from "../data/defaultContent";
import { useCmsDocumentOverride, useSectionStyleOverride } from "../hooks/useCmsData";
import { useLayoutEditorContext } from "../context/LayoutEditorContext";
import { EditableCmsField, EditableCmsImage } from "./EditableCmsField";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef(null);
  const profileRef = useRef(null);
  const navRef = useRef(null);
  const [navHeight, setNavHeight] = useState(0);
  const [activeSection, setActiveSection] = useState("");
  const { user, logout, isAdmin, isOwner } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();
  const { data: navbar } = useCmsDocumentOverride("navbar", defaultNavbarContent);
  const { style: navbarStyle } = useSectionStyleOverride("navbar");
  const ctx = useLayoutEditorContext();
  const updateNavbarField = (fieldName, value) => ctx?.updateFieldContent("navbar", fieldName, value);
  const navbarFieldRef = (fieldName) => ({ kind: "content", docId: "navbar", fieldName });

  // .nav is position: fixed, so it no longer reserves its own space in the
  // page flow — this spacer (sized to the nav's real, current height) takes
  // its place instead, so content isn't hidden underneath. Measured live
  // since the nav's height changes across breakpoints (mobile logo/padding
  // sizes) and whenever its content changes.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;

    const updateHeight = () => setNavHeight(nav.offsetHeight);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

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
    <>
    <nav ref={navRef} className={`nav ${isScrolling ? "scrolling" : ""}`} style={navbarStyle}>
      <div
        className="nav-logo logo-tooltip-wrapper"
        onClick={handleLogoClick}
        style={{ cursor: "pointer" }}
      >
        <EditableCmsImage
          src={navbar.logoIconUrl || dental_logo}
          alt={navbar.logoIconAlt || "Dental Logo"}
          className="logo-icon"
          sectionKey="navbar"
          storagePathPrefix="content-images/navbar-logoIconUrl"
          onCommit={(url) => updateNavbarField("logoIconUrl", url)}
          fieldRef={{ ...navbarFieldRef("logoIconUrl"), isImage: true }}
        />
        <EditableCmsImage
          src={navbar.logoTextUrl || dental_logo2}
          alt={navbar.logoTextAlt || "Dental Name"}
          className="logo-icon2"
          sectionKey="navbar"
          storagePathPrefix="content-images/navbar-logoTextUrl"
          onCommit={(url) => updateNavbarField("logoTextUrl", url)}
          fieldRef={{ ...navbarFieldRef("logoTextUrl"), isImage: true }}
        />

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
          <EditableCmsField
            as="span"
            type="text"
            value={navbar.servicesLabel}
            onCommit={(value) => updateNavbarField("servicesLabel", value)}
            sectionKey="navbar"
            ariaLabel="Edit Services nav label"
            styleValue={navbar.servicesLabelStyle}
            fieldRef={navbarFieldRef("servicesLabel")}
          />
        </li>

        <li
          className={`abt ${
            location.pathname === "/" && activeSection === "about" ? "active" : ""
          }`}
          onClick={() => scrollToSection("about")}
        >
          <EditableCmsField
            as="span"
            type="text"
            value={navbar.aboutLabel}
            onCommit={(value) => updateNavbarField("aboutLabel", value)}
            sectionKey="navbar"
            ariaLabel="Edit About nav label"
            styleValue={navbar.aboutLabelStyle}
            fieldRef={navbarFieldRef("aboutLabel")}
          />
        </li>

        <li
          className={`rev ${
            location.pathname === "/" && activeSection === "reviews" ? "active" : ""
          }`}
          onClick={() => scrollToSection("reviews")}
        >
          <EditableCmsField
            as="span"
            type="text"
            value={navbar.benefitsLabel}
            onCommit={(value) => updateNavbarField("benefitsLabel", value)}
            sectionKey="navbar"
            ariaLabel="Edit Benefits nav label"
            styleValue={navbar.benefitsLabelStyle}
            fieldRef={navbarFieldRef("benefitsLabel")}
          />
        </li>

        <li
          className={`cont ${
            location.pathname === "/" && activeSection === "articles" ? "active" : ""
          }`}
          onClick={() => scrollToSection("articles")}
        >
          <EditableCmsField
            as="span"
            type="text"
            value={navbar.articlesLabel}
            onCommit={(value) => updateNavbarField("articlesLabel", value)}
            sectionKey="navbar"
            ariaLabel="Edit Articles nav label"
            styleValue={navbar.articlesLabelStyle}
            fieldRef={navbarFieldRef("articlesLabel")}
          />
        </li>

        <li
          className={`cont ${
            location.pathname === "/" && activeSection === "contact" ? "active" : ""
          }`}
          onClick={() => scrollToSection("contact")}
        >
          <EditableCmsField
            as="span"
            type="text"
            value={navbar.contactLabel}
            onCommit={(value) => updateNavbarField("contactLabel", value)}
            sectionKey="navbar"
            ariaLabel="Edit Contact nav label"
            styleValue={navbar.contactLabelStyle}
            fieldRef={navbarFieldRef("contactLabel")}
          />
        </li>

        <li
          className={`cont ${location.pathname === "/faq" ? "active" : ""}`}
          onClick={() => {
            setOpen(false);
            navigate("/faq");
          }}
        >
          <EditableCmsField
            as="span"
            type="text"
            value={navbar.faqLabel}
            onCommit={(value) => updateNavbarField("faqLabel", value)}
            sectionKey="navbar"
            ariaLabel="Edit FAQ nav label"
            styleValue={navbar.faqLabelStyle}
            fieldRef={navbarFieldRef("faqLabel")}
          />
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
          <EditableCmsField
            as="span"
            type="text"
            value={navbar.bookLabel}
            onCommit={(value) => updateNavbarField("bookLabel", value)}
            sectionKey="navbar"
            ariaLabel="Edit Book Appointment label"
            styleValue={navbar.bookLabelStyle}
            fieldRef={navbarFieldRef("bookLabel")}
          />
        </button>
      </ul>

      <button className="menu-toggle" onClick={() => setOpen(!open)}>
        {open ? <FaTimes /> : <FaBars />}
      </button>

      <div className="nav-actions">
        <button className="slice" onClick={() => scrollToSection("contact")}>
          <span className="text">
            <EditableCmsField
              as="span"
              type="text"
              value={navbar.scheduleLabel}
              onCommit={(value) => updateNavbarField("scheduleLabel", value)}
              sectionKey="navbar"
              ariaLabel="Edit Schedule Consultation label"
              styleValue={navbar.scheduleLabelStyle}
              fieldRef={navbarFieldRef("scheduleLabel")}
            />
          </span>
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
    <div className="nav-spacer" style={{ height: navHeight }} aria-hidden="true" />
    </>
  );
}
