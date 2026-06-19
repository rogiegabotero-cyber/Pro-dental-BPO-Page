import { useEffect, useRef, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { FaPhoneAlt, FaClock, FaEnvelope } from "react-icons/fa";
import { useAuth } from "../auth/useAuth";
import { db } from "../firebase";
import { defaultContactContent } from "../data/defaultContent";
import { useCmsDocument } from "../hooks/useCmsData";
import { sendConsultationEmail } from "../services/emailService";

const initialFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  scheduleDate: "",
};

export default function Contact() {
  const sectionRef = useRef(null);
  const dateRef = useRef(null);
  const { user } = useAuth();
  const { data: contact } = useCmsDocument("contact", defaultContactContent);
  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({
    type: "",
    message: "",
  });

  useEffect(() => {
    const section = sectionRef.current;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.classList.add("contact-show");
        } else {
          section.classList.remove("contact-show"); // replay on re-scroll
        }
      },
      { threshold: 0.25 }
    );

    if (section) observer.observe(section);

    return () => observer.disconnect();
  }, []);

  const openDatePicker = () => {
    const el = dateRef.current;
    if (!el) return;

    // Chrome / Edge support
    if (typeof el.showPicker === "function") {
      el.showPicker();
      return;
    }

    // Fallback (Safari/iOS)
    el.focus();
    if (typeof el.click === "function") el.click();
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    if (submitStatus.message) {
      setSubmitStatus({
        type: "",
        message: "",
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({
      type: "",
      message: "",
    });

    try {
      await addDoc(collection(db, "consultations"), {
        ...formData,
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        status: "new",
        authUid: user?.uid || "",
        authEmail: user?.email || "",
        createdAt: serverTimestamp(),
      });

      try {
        await sendConsultationEmail({
          ...formData,
          recipientEmail: contact.email,
        });

        setSubmitStatus({
          type: "success",
          message: contact.successMessage,
        });
      } catch (emailError) {
        console.error("Consultation email send failed:", emailError);
        setSubmitStatus({
          type: "error",
          message:
            "Your consultation request was saved, but the email notification could not be sent right now.",
        });
      }

      setFormData(initialFormState);
    } catch (error) {
      console.error("Consultation submission error:", error);
      setSubmitStatus({
        type: "error",
        message:
          "We couldn't send your request right now. Please try again in a moment.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="contact" id="contact" ref={sectionRef}>
      {/* LEFT SIDE */}
      <div className="contact-info animate-left">
        <div className="containerSection-tag">
          <span className="section-tag">{contact.tag}</span>
        </div>

        <h2>{contact.title}</h2>

        <p>{contact.body}</p>

        <div className="icon-container">
          <div className="contact-item">
            <FaPhoneAlt className="contact-icon" />
            <span>{contact.phone}</span>
          </div>

          <div className="contact-item">
            <FaEnvelope className="contact-icon" />
            <span>{contact.email}</span>
          </div>

          <div className="contact-item">
            <FaClock className="contact-icon" />
            <span>{contact.hours}</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE FORM */}
      <div className="contact-form animate-right">
        <form className="form" onSubmit={handleSubmit}>
          <p className="title">{contact.formTitle}</p>

          <div className="flex">
            <label>
              <input
                required
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="input"
              />
              <span>Firstname</span>
            </label>

            <label>
              <input
                required
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="input"
              />
              <span>Lastname</span>
            </label>
          </div>

          <label>
            <input
              required
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="input"
            />
            <span>Email</span>
          </label>

          <label>
            <input
              required
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="input"
            />
            <span>Phone Number</span>
          </label>

          {/* DATE PICKER */}
          <label
            className={`select-wrapper ${formData.scheduleDate ? "has-value" : ""}`}
            onClick={openDatePicker}
          >
            <input
              ref={dateRef}
              type="date"
              required
              name="scheduleDate"
              className="input"
              value={formData.scheduleDate}
              onChange={handleInputChange}
              onClick={(e) => {
                // prevent double triggering from label click
                e.stopPropagation();
                openDatePicker();
              }}
            />
            <span>Select Schedule Date</span>
          </label>

          {submitStatus.message && (
            <p
              className={`form-status form-status-${submitStatus.type}`}
              role="status"
              aria-live="polite"
            >
              {submitStatus.message}
            </p>
          )}

          <button type="submit" className="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Submit Appointment"}
          </button>
        </form>
      </div>
    </section>
  );
}
