import { useEffect, useRef, useState } from "react";
import { FaArrowsAlt, FaGripVertical } from "react-icons/fa";
import { defaultServices, defaultServicesSectionContent } from "../data/defaultContent";
import {
  useCmsCollectionOverride,
  useCmsDocumentOverride,
  useSectionStyleOverride,
  normalizeSectionOrder,
} from "../hooks/useCmsData";
import { useLayoutEditorContext } from "../context/LayoutEditorContext";
import { EditableCmsField, buildFieldStyle } from "./EditableCmsField";
import ReorderableSlot from "./ReorderableSlot";
import { buildCardDragProps } from "../utils/cardDragProps";
import { usePixelNudgeDrag } from "../utils/usePixelNudgeDrag";
import ServiceModal from "./servicesModal";

const SERVICES_SECTION_SLOTS = ["tag", "heading"];

function ServiceCard({ service, ctx, armedCardId, setArmedCardId, openModal }) {
  const cardRef = useRef(null);
  const cardFieldRef = { kind: "collection", collectionName: "services", itemId: service.id, fieldName: "card" };
  const { onPointerDown: onMoveHandlePointerDown } = usePixelNudgeDrag({
    targetRef: cardRef,
    getBase: () => ctx?.resolveFieldStyle(cardFieldRef) || {},
    onCommit: (patch) => ctx?.updateFieldStyle(cardFieldRef, patch),
    getScale: () => ctx?.canvasScale,
  });

  const cardDrag =
    ctx?.editMode && buildCardDragProps(ctx, "services", service.id, armedCardId === service.id, setArmedCardId);

  return (
    <div
      ref={cardRef}
      className="service-card"
      style={buildFieldStyle(service.cardStyle)}
      data-cms-interactive={ctx?.editMode ? "true" : undefined}
      onClick={
        ctx?.editMode
          ? (event) => {
              event.stopPropagation();
              ctx.selectField("services", cardFieldRef);
            }
          : undefined
      }
      {...(cardDrag ? cardDrag.cardProps : {})}
    >
      {cardDrag && (
        <>
          <button
            type="button"
            className="cms-card-handle"
            data-cms-interactive="true"
            aria-label="Drag to reorder this service card"
            {...cardDrag.handleProps}
          >
            <FaGripVertical />
          </button>
          <button
            type="button"
            className="cms-move-handle"
            data-cms-interactive="true"
            aria-label="Move this service card"
            title="Drag to move (or select and use arrow keys)"
            onPointerDown={(event) => {
              event.stopPropagation();
              onMoveHandlePointerDown(event);
            }}
          >
            <FaArrowsAlt />
          </button>
        </>
      )}
      <EditableCmsField
        as="h3"
        type="text"
        value={service.title}
        onCommit={(value) => ctx.updateCollectionField("services", service.id, "title", value)}
        sectionKey="services"
        ariaLabel="Edit service title"
        styleValue={service.titleStyle}
        fieldRef={{ kind: "collection", collectionName: "services", itemId: service.id, fieldName: "title" }}
      />
      <EditableCmsField
        as="p"
        type="textarea"
        value={service.shortDescription}
        onCommit={(value) => ctx.updateCollectionField("services", service.id, "shortDescription", value)}
        sectionKey="services"
        ariaLabel="Edit service short description"
        styleValue={service.shortDescriptionStyle}
        fieldRef={{
          kind: "collection",
          collectionName: "services",
          itemId: service.id,
          fieldName: "shortDescription",
        }}
      />
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
  );
}

export default function Services() {
  const servicesRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [modalData, setModalData] = useState({});
  const [armedCardId, setArmedCardId] = useState(null);
  const { items: services } = useCmsCollectionOverride("services", defaultServices);
  const { data: servicesSection } = useCmsDocumentOverride(
    "servicesSection",
    defaultServicesSectionContent
  );
  const { style: servicesStyle } = useSectionStyleOverride("services");
  const ctx = useLayoutEditorContext();
  const updateServicesSectionField = (fieldName, value) =>
    ctx?.updateFieldContent("servicesSection", fieldName, value);
  const servicesSectionFieldRef = (fieldName) => ({
    kind: "content",
    docId: "servicesSection",
    fieldName,
  });

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

  const servicesSectionOrder = normalizeSectionOrder(
    servicesSection.elementOrder,
    SERVICES_SECTION_SLOTS
  );

  const servicesSectionSlotContent = {
    tag: (
      <EditableCmsField
        as="span"
        className="section-tag"
        type="text"
        value={servicesSection.tag}
        onCommit={(value) => updateServicesSectionField("tag", value)}
        sectionKey="services"
        ariaLabel="Edit services section tag"
        styleValue={servicesSection.tagStyle}
        fieldRef={servicesSectionFieldRef("tag")}
      />
    ),
    heading: (
      <EditableCmsField
        as="h2"
        type="text"
        value={servicesSection.heading}
        onCommit={(value) => updateServicesSectionField("heading", value)}
        sectionKey="services"
        ariaLabel="Edit services section heading"
        styleValue={servicesSection.headingStyle}
        fieldRef={servicesSectionFieldRef("heading")}
      />
    ),
  };

  return (
    <>
      <section className="services" id="services" ref={servicesRef} style={servicesStyle}>
        {servicesSectionOrder.map((key) => (
          <ReorderableSlot
            key={key}
            docId="servicesSection"
            sectionKey="services"
            slotKey={key}
            order={servicesSectionOrder}
            ariaLabel={`Drag to reorder the ${key} block`}
          >
            {servicesSectionSlotContent[key]}
          </ReorderableSlot>
        ))}

        <div className="service-grid">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              ctx={ctx}
              armedCardId={armedCardId}
              setArmedCardId={setArmedCardId}
              openModal={openModal}
            />
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
