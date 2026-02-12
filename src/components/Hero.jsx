import { useEffect, useRef, useState } from "react";
import Smile_love from "../assets/Image/deent.webp";
import HeroBgImage from "../assets/Image/3.webp";

export default function Hero() {
  const heroRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);

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
          setInView(false);
        }
      },
      { threshold: 0.35 }
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
    handleScroll();
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
        className={`hero ${inView ? "hero-animate" : "hero-exit"} ${
          hasViewed ? "hero-seen" : ""
        }`}
      >
        <div
          className="hero-bg"
          style={{ backgroundImage: `url(${HeroBgImage})` }}
        />

        <div className="hero-text">
          <div className="containerHero-section-tag">
            <span className="hero-tag">Pro-Dental BPO</span>
          </div>

          <h1>
            Why Hire <br />
            Pro-Dental BPO
          </h1>

          <ul className="hero-benefits">
            <li>Save 60% in Labor Costs</li>
            <li>Scale On Demand</li>
            <li>
              Access to Entire Back-Office Support Suites
              <span className="benefit-sub">
                (Marketing, Accounting, IT, AI / Automation)
              </span>
            </li>
            <li>Access to Global Talent Pool (Nearshore / Offshore)</li>
          </ul>

          <div className="hero-buttons">
            <button
              className="btn-primary"
              onClick={() => scrollToSection("contact")}
            >
              Consult →
            </button>

            <button
              className="btn-outline"
              onClick={() => scrollToSection("services")}
            >
              Explore Services
            </button>
          </div>
        </div>

        <div className="hero-image">
          <div className="card">
            <div className="card2 image-box">
              <img src={Smile_love} alt="Pro-Dental BPO Support Team" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}