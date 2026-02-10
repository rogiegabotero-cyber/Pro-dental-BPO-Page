import { useState, useEffect, useRef } from "react";
import { FaHome } from "react-icons/fa";
import { FaBars, FaTimes } from "react-icons/fa";
import dental_logo from "../assets/Image/1.png";
import dental_logo2 from "../assets/Image/2.png";
import "../assets/Style/navbar.css";

export default function Navbar() {
  
  const [open, setOpen] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef(null);
const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);

      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      scrollTimeout.current = setTimeout(() => {
        setIsScrolling(false);
      }, 200);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
      setOpen(false);
    }
  };

  const handleLogoClick = () => {
    // Scroll to hero/home section
    window.scrollTo({ top: 0, behavior: "smooth" });
    setOpen(false);
  };
useEffect(() => {
  const sections = ["services", "about", "reviews", "contact"];


  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    },
    {
      threshold: 0.6, // section must be mostly visible
    }
  );

  sections.forEach((id) => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });

  return () => observer.disconnect();
}, []);

  return (

    
    <nav className={`nav ${isScrolling ? "scrolling" : ""}`}>
      {/* LOGO */}
      <div
        className="nav-logo logo-tooltip-wrapper"
        onClick={handleLogoClick}
        style={{ cursor: "pointer" }}
      >
        <img src={dental_logo} className="logo-icon" alt="Dental Logo" />
        <img src={dental_logo2} className="logo-icon2" alt="Dental Name" />

        {/* VISUAL TOOLTIP ONLY */}
        <span className="logo-tooltip">
          <FaHome className="logo-tooltip-icon" />
          Home
        </span>
      </div>

      {/* LINKS */}
      <ul className={`nav-links ${open ? "open" : ""}`}>
     
         <li 
        className={`serv ${activeSection === "services" ? "active" : ""}`}
        onClick={() => scrollToSection("services")}>Services</li>
    
        <li 
        className={`abt ${activeSection === "about" ? "active" : ""}`}
        onClick={() => scrollToSection("about")}>About</li>
        <li 
        className={`rev ${activeSection === "reviews" ? "active" : ""}`} 
        onClick={() => scrollToSection("reviews")}>Benefits</li>
        <li
        className={`cont ${activeSection === "contact" ? "active" : ""}`} 
        onClick={() => scrollToSection("contact")}>Contact</li>

        <button
          className="btn-primary mobile-btn"
          onClick={() => scrollToSection("contact")}
        >
          Book Appointment
        </button>
      </ul>

      {/* HAMBURGER */}
      <button className="menu-toggle" onClick={() => setOpen(!open)}>
        {open ? <FaTimes /> : <FaBars />}
  

      </button>

      {/* DESKTOP BUTTON */}
      <button
       className="slice"
       onClick={() => scrollToSection("contact")}
      >
      <span className="text">Book Appointment</span>
        
      
        
      </button>
    </nav>
  );
}
