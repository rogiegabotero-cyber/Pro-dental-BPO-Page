import { useState, useEffect, useRef } from "react";
import { FaHome } from "react-icons/fa";
import { FaBars, FaTimes } from "react-icons/fa";
import dental_logo from "../assets/Image/1.webp";
import dental_logo2 from "../assets/Image/2.webp";
import "../assets/Style/navbar.css";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef(null);
  const [activeSection, setActiveSection] = useState("");

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

  // Only observe sections on homepage (prevents weird behavior on /faq)
  useEffect(() => {
    if (location.pathname !== "/") return;

    const sections = ["services", "about", "reviews", "contact"];
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

        <li className="cont" onClick={() => setOpen(false)}>
          <a href="#" onClick={(e) => e.preventDefault()}>
            Client Portal
          </a>
        </li>

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

      <button className="slice" onClick={() => scrollToSection("contact")}>
        <span className="text">Consult</span>
      </button>
    </nav>
  );
}