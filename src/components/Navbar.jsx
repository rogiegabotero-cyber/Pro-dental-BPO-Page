import { createElement, useEffect, useRef, useState } from "react";
import {
  FaBars,
  FaChevronDown,
  FaCog,
  FaHome,
  FaLink,
  FaPlus,
  FaSignOutAlt,
  FaTachometerAlt,
  FaTimes,
  FaTrash,
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
import { useMobileSettings } from "../hooks/useMobileSettings";
import { resolveNavIcon } from "../utils/navIcons";
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
  const { style: baseNavbarStyle, raw: navRaw } = useSectionStyleOverride("navbar");
  // Header appearance settings become CSS variables + data flags; navbar.css
  // only overrides its defaults when a flag is present.
  const px = (value) => (value !== "" && value != null ? `${parseInt(value, 10) || 0}px` : null);
  const navVars = {};
  const navFlags = {};
  [
    ["navPaddingY", "--nav-pad-y", "data-nav-h", px],
    ["logoIconWidth", "--nav-logo-icon-w", "data-nav-logo-icon", px],
    ["logoTextWidth", "--nav-logo-text-w", "data-nav-logo-text", px],
    ["linkFontSize", "--nav-link-size", "data-nav-link-size", px],
    ["iconSize", "--nav-icon-size", "data-nav-icon-size", px],
    ["linkColor", "--nav-link-color", "data-nav-link-color", (v) => v || null],
    ["linkActiveColor", "--nav-active-color", "data-nav-active-color", (v) => v || null],
    ["iconColor", "--nav-icon-color", "data-nav-icon-color", (v) => v || null],
    ["menuButtonBg", "--nav-menu-bg", "data-nav-menu-bg", (v) => v || null],
    ["buttonBg", "--nav-btn-bg", "data-nav-btn", (v) => v || null],
    ["buttonText", "--nav-btn-text", "data-nav-btn-text", (v) => v || null],
    ["mobileBarBg", "--nav-bar-bg", "data-nav-bar-bg", (v) => v || null],
    ["tabFontFamily", "--tab-font", "data-tab-font", (v) => v || null],
    ["tabFontSize", "--tab-size", "data-tab-size", px],
    ["tabFontWeight", "--tab-weight", "data-tab-weight", (v) => v || null],
    ["tabTextColor", "--tab-text", "data-tab-text", (v) => v || null],
    ["tabActiveColor", "--tab-active", "data-tab-active", (v) => v || null],
    ["tabIconColor", "--tab-icon-color", "data-tab-icon-color", (v) => v || null],
    ["tabIconSize", "--tab-icon-size", "data-tab-icon-size", px],
  ].forEach(([key, cssVar, flag, format]) => {
    const formatted = format(navRaw?.[key]);
    if (formatted) {
      navVars[cssVar] = formatted;
      navFlags[flag] = "true";
    }
  });
  const navbarStyle = { ...baseNavbarStyle, ...navVars };
  const tabIcon = (linkId) =>
    createElement(resolveNavIcon(linkId, navRaw?.tabIcons?.[linkId]), {
      className: "nav-tab-icon",
      "aria-hidden": true,
    });
  const ctx = useLayoutEditorContext();
  const mobile = useMobileSettings();
  // Mobile-only settings are applied by CSS media queries on the public site
  // (and the responsive preview); the desktop editing canvas ignores them so
  // nothing disappears while you edit.
  // The editable device frame (phone/tablet) shows the chosen nav style just
  // like the preview does; links hidden on phones are dimmed there, not
  // removed, so they can still be edited.
  const inDeviceFrame = Boolean(ctx?.deviceFrame);
  const applyMobile = !ctx || inDeviceFrame;
  const bottomNav = applyMobile && mobile.navStyle === "bottom";
  const mobileHide = (linkId) => {
    if (!mobile.hiddenNavLinks[linkId]) return "";
    if (!ctx) return "nav-hide-mobile";
    return inDeviceFrame ? "nav-dim-mobile" : "";
  };
  // Placeholder; redefined below once the navbar style settings are known.

  useEffect(() => {
    document.body.classList.toggle("has-bottom-nav", bottomNav);
    return () => document.body.classList.remove("has-bottom-nav");
  }, [bottomNav]);

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

  const extraLinks = Array.isArray(navbar.extraLinks) ? navbar.extraLinks : [];
  const saveExtraLinks = (links) => updateNavbarField("extraLinks", links);

  const promptForUrl = (current) => {
    const url = window.prompt("Where should this header link go? (e.g. /faq or https://example.com)", current);
    return url === null ? null : url.trim();
  };

  const addExtraLink = () => {
    const url = promptForUrl("/");
    if (url === null) return;
    saveExtraLinks([
      ...extraLinks,
      { id: Date.now().toString(36), label: "New link", url: url || "/" },
    ]);
  };

  const updateExtraLink = (id, patch) =>
    saveExtraLinks(extraLinks.map((link) => (link.id === id ? { ...link, ...patch } : link)));

  const editExtraLinkUrl = (link) => {
    const url = promptForUrl(link.url);
    if (url) updateExtraLink(link.id, { url });
  };

  const removeExtraLink = (id) => saveExtraLinks(extraLinks.filter((link) => link.id !== id));

  const followExtraLink = (url) => {
    setOpen(false);
    if (!url) return;
    if (url.startsWith("#")) {
      scrollToSection(url.slice(1));
    } else if (url.startsWith("/")) {
      navigate(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
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
    // While editing the page, the button only opens/closes the menu; it never
    // navigates away to the login page.
    if (!user && ctx?.editMode) return;
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
    <nav
      ref={navRef}
      className={`nav ${isScrolling ? "scrolling" : ""}${bottomNav ? " nav--bottom-mobile" : ""}`} style={navbarStyle}
      {...navFlags}
    >
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
          className={`serv ${mobileHide("services")} ${
            location.pathname === "/" && activeSection === "services" ? "active" : ""
          }`}
          onClick={() => scrollToSection("services")}
        >
          {tabIcon("services")}
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
          className={`abt ${mobileHide("about")} ${
            location.pathname === "/" && activeSection === "about" ? "active" : ""
          }`}
          onClick={() => scrollToSection("about")}
        >
          {tabIcon("about")}
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
          className={`rev ${mobileHide("benefits")} ${
            location.pathname === "/" && activeSection === "reviews" ? "active" : ""
          }`}
          onClick={() => scrollToSection("reviews")}
        >
          {tabIcon("benefits")}
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
          className={`cont ${mobileHide("articles")} ${
            location.pathname === "/" && activeSection === "articles" ? "active" : ""
          }`}
          onClick={() => scrollToSection("articles")}
        >
          {tabIcon("articles")}
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
          className={`cont ${mobileHide("contact")} ${
            location.pathname === "/" && activeSection === "contact" ? "active" : ""
          }`}
          onClick={() => scrollToSection("contact")}
        >
          {tabIcon("contact")}
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
          className={`cont ${mobileHide("faq")} ${location.pathname === "/faq" ? "active" : ""}`}
          onClick={() => {
            setOpen(false);
            navigate("/faq");
          }}
        >
          {tabIcon("faq")}
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

        {extraLinks.map((link) => (
          <li
            key={link.id}
            className={`cont nav-extra-link ${mobileHide(`extra-${link.id}`)} ${
              link.url.startsWith("/") && location.pathname === link.url ? "active" : ""
            }`}
            onClick={() => followExtraLink(link.url)}
          >
            {tabIcon(`extra-${link.id}`)}
            <EditableCmsField
              as="span"
              type="text"
              value={link.label}
              onCommit={(value) => updateExtraLink(link.id, { label: value })}
              sectionKey="navbar"
              ariaLabel="Edit header link label"
            />
            {ctx?.editMode && (
              <span className="nav-extra-link__tools" data-cms-interactive="true">
                <button
                  type="button"
                  title={`Goes to ${link.url} — click to change`}
                  aria-label="Change link URL"
                  onClick={(event) => {
                    event.stopPropagation();
                    editExtraLinkUrl(link);
                  }}
                >
                  <FaLink />
                </button>
                <button
                  type="button"
                  title="Remove this link"
                  aria-label="Remove header link"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeExtraLink(link.id);
                  }}
                >
                  <FaTrash />
                </button>
              </span>
            )}
          </li>
        ))}

        {ctx?.editMode && (
          <li className="nav-extra-link nav-extra-link--add" data-cms-interactive="true">
            <button
              type="button"
              title="Add a header link"
              aria-label="Add a header link"
              onClick={(event) => {
                event.stopPropagation();
                addExtraLink();
              }}
            >
              <FaPlus />
            </button>
          </li>
        )}

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

      <button
        className="menu-toggle"
        data-cms-interactive="true"
        aria-expanded={open}
        aria-label="Toggle menu"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(!open);
        }}
      >
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
            data-cms-interactive="true"
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
