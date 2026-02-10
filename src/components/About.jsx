import { useEffect, useRef } from "react";
import den_love from "../assets/Image/den.webp";

export default function About() {
  const aboutRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
        } else {
          entry.target.classList.remove("show"); // replay animation on scroll
        }
      },
      {
        threshold: 0.25,
      }
    );

    if (aboutRef.current) observer.observe(aboutRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <section className="about" id="about" ref={aboutRef}>
      <div className="about-image fade-left">
        <img src={den_love} alt="Dental team" />
      </div>

      <div className="about-text fade-right">
        <span className="section-tag">About Our Practice</span>
        <h2>Dedicated to Your Dental Health</h2>

        <p>
          Dental Business Process Outsourcing (BPO) involves contracting non-clinical,
          administrative tasks—such as billing, insurance verification, patient
          scheduling, and call center support—to specialized third-party providers.
        </p>

        <ul>
          <li>✔ Flexible hours</li>
          <li>✔ Insurance friendly</li>
          <li>✔ Experienced professionals</li>
        </ul>
      </div>
    </section>
  );
}
