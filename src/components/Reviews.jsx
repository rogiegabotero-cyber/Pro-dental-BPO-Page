import { useEffect, useRef } from "react";
import { defaultBenefits } from "../data/defaultContent";
import { useCmsCollection } from "../hooks/useCmsData";

export default function Reviews() {
  const reviewsRef = useRef(null);
  const { items: benefits } = useCmsCollection("benefits", defaultBenefits);

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

    if (reviewsRef.current) observer.observe(reviewsRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <section className="reviews" id="reviews" ref={reviewsRef}>
      <h2>Our Benefits</h2>

      <div className="review-grid">
        {benefits.map((benefit) => (
          <div
            className={`benefit-card fade-up ${
              benefit.highlight ? "benefit-highlight" : ""
            }`}
            key={benefit.id}
          >
            <div className="benefit-sents">
              <strong>{benefit.title}</strong>
            </div>
            <p>{benefit.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
