import { useEffect, useRef, useState } from "react";
import { defaultServices } from "../data/defaultContent";
import { useCmsCollection } from "../hooks/useCmsData";
import ServiceModal from "./servicesModal";

export default function Services() {
  const servicesRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [modalData, setModalData] = useState({});
  const { items: services } = useCmsCollection("services", defaultServices);

  useEffect(() => {
    const section = servicesRef.current;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.classList.add("services-animate");
        } else {
          section.classList.remove("services-animate");
        }
      },
      { threshold: 0.3 }
    );

    if (section) observer.observe(section);

    return () => {
      if (section) observer.unobserve(section);
    };
  }, []);

  const openModal = (service) => {
    setModalData(service);
    setIsOpen(true);
  };

  return (
    <>
      <section className="services" id="services" ref={servicesRef}>
        <span className="section-tag">Our Services</span>
        <h2>What We Offer</h2>

        <div className="service-grid">
          {services.map((service) => (
            <div className="service-card" key={service.id}>
              <h3>{service.title}</h3>
              <p>{service.shortDescription}</p>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  openModal(service);
                }}
              >
                Learn More
              </a>
            </div>
          ))}
        </div>
      </section>

      <ServiceModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={modalData.title}
        description={modalData.description}
      />
    </>
  );
}
