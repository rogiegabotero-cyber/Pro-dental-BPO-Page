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
      { threshold: 0.25 }
    );

    if (aboutRef.current) observer.observe(aboutRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <section className="about" id="about" ref={aboutRef}>
      <div className="about-image fade-left">
        <img src={den_love} alt="Pro-Dental BPO Operations Team" />
      </div>

      <div className="about-text fade-right">
        <span className="section-tag">Pro-Dental BPO</span>
        <h2>Strategic Evolution in Dental Practice Management</h2>

        <p>
          Pro-Dental BPO is a strategic evolution in Dental Practice Management,
          founded in 2025 by <strong>Dr. Arnold Paulos, DDS MAGD</strong>.
          Drawing on 35 years of frontline industry experience, Dr. Paulos has
          navigated the full spectrum of practice growth while witnessing the
          rising challenges of labor costs, staff burnout, and revenue leakage
          from aging accounts receivable.
        </p>

        <p>
          Pro-Dental BPO bridges the gap between clinical expertise and advanced
          automation, empowering practitioners to optimize operations and reclaim
          their revenue cycles. Our dentist-designed integration is engineered to
          streamline workflows and recover lost capital.
        </p>

        <p>
          By providing the essential bandwidth through independent suites—
          <strong>built for dentists, by a dentist</strong>—we allow you to focus on what
          matters most: <strong>your patients.</strong>
        </p>
      </div>
    </section>
  );
}