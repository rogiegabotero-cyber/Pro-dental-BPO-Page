import { useEffect, useRef } from "react";
import den_love from "../assets/Image/den.webp";
import { defaultAboutContent } from "../data/defaultContent";
import { useCmsDocument } from "../hooks/useCmsData";

export default function About() {
  const aboutRef = useRef(null);
  const { data: about } = useCmsDocument("about", defaultAboutContent);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
        } else {
          entry.target.classList.remove("show");
        }
      },
      { threshold: 0.25 }
    );

    if (aboutRef.current) observer.observe(aboutRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <section className="about" id="about" ref={aboutRef}>
      <div className="about-image fade-left">
        <img
          src={about.imageUrl || den_love}
          alt={about.imageAlt || "Pro-Dental BPO Operations Team"}
        />
      </div>

      <div className="about-text fade-right">
        <span className="section-tag">{about.tag}</span>
        <h2>{about.title}</h2>

        {(about.paragraphs || []).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
