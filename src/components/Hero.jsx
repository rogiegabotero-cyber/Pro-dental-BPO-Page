import { useEffect, useRef, useState } from "react";
import Smile_love from "../assets/Image/deent.webp";
import HeroBgImage from "../assets/Image/3.webp";
import { defaultHeroContent } from "../data/defaultContent";
import { useCmsDocument } from "../hooks/useCmsData";

export default function Hero() {
  const heroRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);
  const { data: hero } = useCmsDocument("hero", defaultHeroContent);

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
          style={{
            backgroundImage: `url(${hero.backgroundImageUrl || HeroBgImage})`,
          }}
        />

        <div className="hero-text">
          <div className="containerHero-section-tag">
            <span className="hero-tag">{hero.tag}</span>
          </div>

          <h1>{hero.title}</h1>

          <ul className="hero-benefits">
            {(hero.benefits || []).map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>

          <div className="hero-buttons">
            <button
              className="btn-primary"
              onClick={() => scrollToSection("contact")}
            >
              {hero.primaryButtonLabel}
            </button>

            <button
              className="btn-outline"
              onClick={() => scrollToSection("services")}
            >
              {hero.secondaryButtonLabel}
            </button>
          </div>
        </div>

        <div className="hero-image">
            <div className="card2 image-box">
              <img
                src={hero.foregroundImageUrl || Smile_love}
                alt={hero.foregroundImageAlt || "Pro-Dental BPO Support Team"}
              />
            </div>
        </div>
      </section>
    </div>
  );
}
