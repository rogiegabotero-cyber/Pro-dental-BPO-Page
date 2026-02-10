import { useEffect, useRef, useState } from "react";
import Smile_love from "../assets/Image/deent.webp";
import HeroBgImage from "../assets/Image/3.webp";

export default function Hero() {
  const heroRef = useRef(null);
  const [inView, setInView] = useState(false);      // hero is currently visible
  const [hasViewed, setHasViewed] = useState(false); // optional: for first-time logic

  // Enter/Exit animation trigger
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          setHasViewed(true);
        } else {
          setInView(false); // triggers exit animation
        }
      },
      {
        threshold: 0.35, // tweak: 0.2-0.5 is typical
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Parallax background
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY * 0.15;
      document.documentElement.style.setProperty("--bg-offset", `${offset}px`);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // initialize
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="Home-background">
      <section
        ref={heroRef}
        id="hero"
        className={`hero ${inView ? "hero-animate" : "hero-exit"} ${hasViewed ? "hero-seen" : ""}`}
      >
        <div className="hero-bg" style={{ backgroundImage: `url(${HeroBgImage})` }} />

        <div className="hero-text">
          <div className="containerHero-section-tag">
            <span className="hero-tag">Your Smile, Our Love</span>
          </div>

          <h1>
            Beautiful Smiles
            <br />
            Starts with Love
          </h1>

          <p>
            Experience gentle, compassionate dental care with our team of experts. We combine
            advanced technology with a warm, welcoming environment.
          </p>

          <div className="hero-buttons">
            <button className="btn-primary" onClick={() => scrollToSection("contact")}>
              Schedule Visit →
            </button>
            <button className="btn-outline" onClick={() => scrollToSection("services")}>
              Our Services
            </button>
          </div>

          <div className="hero-stats">
            <div>
              <h3>15+</h3>
              <span>Years Experience</span>
            </div>
            <div>
              <h3>10k+</h3>
              <span>Happy Patients</span>
            </div>
            <div>
              <h3>4.9</h3>
              <span>Star Rating</span>
            </div>
          </div>
        </div>

        <div className="hero-image">
          <div className="card">
            <div className="card2 image-box">
              <img src={Smile_love} alt="Dental care" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}