import { useEffect, useRef } from "react";

export default function Reviews() {
  const reviewsRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
        } else {
          entry.target.classList.remove("show"); // replay on scroll
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
        <div className="benefit-card fade-up">
          <div className="benefit-sents">
            <strong>Reduced Overhead</strong>
          </div>
          <p>
            Lower costs associated with hiring, training, and equipment for
            in-house staff.
          </p>
        </div>

        <div className="benefit-card fade-up">
          <div className="benefit-sents">
            <strong>Increased Accuracy</strong>
          </div>
          <p>
            Specialized teams reduce billing errors and speed up insurance claims
            processing.
          </p>
        </div>

        <div className="benefit-card fade-up">
          <div className="benefit-sents">
            <strong>Focus on Patient Care</strong>
          </div>
          <p>
            Allows dentists and their staff to focus on treatment rather than
            paperwork.
          </p>
        </div>

        <div className="benefit-card fade-up">
          <div className="benefit-sents">
            <strong>Improved Patient Experience</strong>
          </div>
          <p>
            24/7 service availability for appointment scheduling and inquiries.
          </p>
        </div>
      </div>
    </section>
  );
}
