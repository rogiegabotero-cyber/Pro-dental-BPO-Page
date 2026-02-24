import { useEffect, useRef } from "react";
import {
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaClock,
  FaEnvelope
} from "react-icons/fa";

export default function Contact() {
  const sectionRef = useRef(null);

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

  return (
    <section className="contact" id="contact" ref={sectionRef}>
     
      {/* LEFT SIDE */}
      <div className="contact-info animate-left">

        <div className="containerSection-tag">
        <span className="section-tag">Get In Touch</span>
        </div>
        <h2>Try Pro-Dental BPO: Because Revenue Cycle Management shouldn't feel like pulling teeth.</h2>
        <p>
          Schedule your appointment today and take the first step
          towards a healthier smile.
        </p>
      <div className="icon-container"> 
        <div className="contact-item">
          <FaPhoneAlt className="contact-icon" />
          <span>(844) 477-6336</span>
        </div>
        
        <div className="contact-item">
          <FaEnvelope className="contact-icon" />
          <span>info@prodental.com</span>
        </div>
        {/* <div className="contact-item">
          <FaMapMarkerAlt className="contact-icon" />
          <span>123 Smile Street, Suite 100</span>
        </div> */}
        
       
        

        <div className="contact-item">
          <FaClock className="contact-icon" />
          <span>Mon–Fri: 8:00am–6:00pm</span>
        </div>
      </div>
      </div>

      {/* RIGHT SIDE FORM */}
      <div className="contact-form animate-right">
        <form className="form">
          <p className="title">Consult</p>

          <div className="flex">
            <label>
              <input required type="text" className="input" />
              <span>Firstname</span>
            </label>

            <label>
              <input required type="text" className="input" />
              <span>Lastname</span>
            </label>
          </div>

          <label>
            <input required type="email" className="input" />
            <span>Email</span>
          </label>

          <label>
            <input
              required
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              className="input"
            />
            <span>Phone Number</span>
          </label>

        <label className="select-wrapper">
  <select required className="input">
    <option value="" ></option>
    <option>Dental Billing & Revenue Management</option>
    <option>Insurance Verification</option>
    <option>Patient Scheduling & Support</option>
    <option>Administrative Support</option>
  </select>
  <span>Select Services</span>
</label>

<button type="submit" className="submit">
  Submit Appointment
</button>

        </form>
      </div>
    </section>
  );
}
