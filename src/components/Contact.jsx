import { useEffect, useRef, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { FaPhoneAlt, FaClock, FaEnvelope } from "react-icons/fa";
import { useAuth } from "../auth/useAuth";
import { db } from "../firebase";
import { defaultContactContent } from "../data/defaultContent";
import {
  useCmsDocumentOverride,
  useSectionStyleOverride,
  normalizeSectionOrder,
} from "../hooks/useCmsData";
import { useLayoutEditorContext } from "../context/LayoutEditorContext";
import { EditableCmsField, buildFieldStyle } from "./EditableCmsField";
import ReorderableSlot from "./ReorderableSlot";
import { sendConsultationEmail } from "../services/emailService";

const initialFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  scheduleDate: "",
};

const CONTACT_SLOTS = ["tag", "title", "body", "details"];

export default function Contact() {
  const sectionRef = useRef(null);
  const dateRef = useRef(null);
  const { user } = useAuth();
  const { data: contact } = useCmsDocumentOverride("contact", defaultContactContent);
  const { style: contactStyle } = useSectionStyleOverride("contact");
  const ctx = useLayoutEditorContext();
  const updateContactField = (fieldName, value) => ctx?.updateFieldContent("contact", fieldName, value);
  const contactFieldRef = (fieldName) => ({ kind: "content", docId: "contact", fieldName });
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

  const contactOrder = normalizeSectionOrder(contact.elementOrder, CONTACT_SLOTS);

  const contactSlotContent = {
    tag: (
      <div className="containerSection-tag">
        <EditableCmsField
          as="span"
          className="section-tag"
          type="text"
          value={contact.tag}
          onCommit={(value) => updateContactField("tag", value)}
          sectionKey="contact"
          ariaLabel="Edit contact tag"
          styleValue={contact.tagStyle}
          fieldRef={contactFieldRef("tag")}
        />
      </div>
    ),
    title: (
      <EditableCmsField
        as="h2"
        type="textarea"
        value={contact.title}
        onCommit={(value) => updateContactField("title", value)}
        sectionKey="contact"
        ariaLabel="Edit contact title"
        styleValue={contact.titleStyle}
        fieldRef={contactFieldRef("title")}
      />
    ),
    body: (
      <EditableCmsField
        as="p"
        type="textarea"
        value={contact.body}
        onCommit={(value) => updateContactField("body", value)}
        sectionKey="contact"
        ariaLabel="Edit contact body"
        styleValue={contact.bodyStyle}
        fieldRef={contactFieldRef("body")}
      />
    ),
    details: (
      <div className="icon-container" style={buildFieldStyle(contact.detailsStyle)}>
        <div className="contact-item">
          <FaPhoneAlt className="contact-icon" />
          <EditableCmsField
            as="span"
            type="text"
            value={contact.phone}
            onCommit={(value) => updateContactField("phone", value)}
            sectionKey="contact"
            ariaLabel="Edit contact phone"
            styleValue={contact.phoneStyle}
            fieldRef={contactFieldRef("phone")}
          />
        </div>

        <div className="contact-item">
          <FaEnvelope className="contact-icon" />
          <EditableCmsField
            as="span"
            type="text"
            value={contact.email}
            onCommit={(value) => updateContactField("email", value)}
            sectionKey="contact"
            ariaLabel="Edit contact email"
            styleValue={contact.emailStyle}
            fieldRef={contactFieldRef("email")}
          />
        </div>

        <div className="contact-item">
          <FaClock className="contact-icon" />
          <EditableCmsField
            as="span"
            type="text"
            value={contact.hours}
            onCommit={(value) => updateContactField("hours", value)}
            sectionKey="contact"
            ariaLabel="Edit contact hours"
            styleValue={contact.hoursStyle}
            fieldRef={contactFieldRef("hours")}
          />
        </div>
      </div>
    ),
  };

  return (
    <section className="contact" id="contact" ref={sectionRef} style={contactStyle}>
      {/* LEFT SIDE */}
      <div className="contact-info animate-left">
        {contactOrder.map((key) => (
          <ReorderableSlot
            key={key}
            docId="contact"
            sectionKey="contact"
            slotKey={key}
            order={contactOrder}
            ariaLabel={`Drag to reorder the ${key} block`}
          >
            {contactSlotContent[key]}
          </ReorderableSlot>
        ))}
      </div>

      {/* RIGHT SIDE FORM */}
      <div className="contact-form animate-right">
        <form className="form" onSubmit={handleSubmit}>
          <EditableCmsField
            as="p"
            className="title"
            type="text"
            value={contact.formTitle}
            onCommit={(value) => updateContactField("formTitle", value)}
            sectionKey="contact"
            ariaLabel="Edit form title"
            styleValue={contact.formTitleStyle}
            fieldRef={contactFieldRef("formTitle")}
          />

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
