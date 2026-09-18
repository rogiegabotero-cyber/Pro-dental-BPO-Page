import { useEffect, useRef, useState } from "react";
import { FaArrowsAlt, FaGripVertical } from "react-icons/fa";
import { defaultBenefits, defaultBenefitsSectionContent } from "../data/defaultContent";
import {
  useCmsCollectionOverride,
  useCmsDocumentOverride,
  useSectionStyleOverride,
} from "../hooks/useCmsData";
import { useLayoutEditorContext } from "../context/LayoutEditorContext";
import { EditableCmsField, buildFieldStyle } from "./EditableCmsField";
import { buildCardDragProps } from "../utils/cardDragProps";
import { usePixelNudgeDrag } from "../utils/usePixelNudgeDrag";

function BenefitCard({ benefit, ctx, armedCardId, setArmedCardId }) {
  const cardRef = useRef(null);
  const cardFieldRef = { kind: "collection", collectionName: "benefits", itemId: benefit.id, fieldName: "card" };
  const { onPointerDown: onMoveHandlePointerDown } = usePixelNudgeDrag({
    targetRef: cardRef,
    getBase: () => ctx?.resolveFieldStyle(cardFieldRef) || {},
    onCommit: (patch) => ctx?.updateFieldStyle(cardFieldRef, patch),
    getScale: () => ctx?.canvasScale,
  });

  const cardDrag =
    ctx?.editMode && buildCardDragProps(ctx, "benefits", benefit.id, armedCardId === benefit.id, setArmedCardId);

  return (
    <div
      ref={cardRef}
      className={`benefit-card fade-up ${benefit.highlight ? "benefit-highlight" : ""}`}
      style={buildFieldStyle(benefit.cardStyle)}
      data-cms-interactive={ctx?.editMode ? "true" : undefined}
      onClick={
        ctx?.editMode
          ? (event) => {
              event.stopPropagation();
              ctx.selectField("benefits", cardFieldRef);
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
            aria-label="Drag to reorder this benefit card"
            {...cardDrag.handleProps}
          >
            <FaGripVertical />
          </button>
          <button
            type="button"
            className="cms-move-handle"
            data-cms-interactive="true"
            aria-label="Move this benefit card"
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
      <div className="benefit-sents">
        <EditableCmsField
          as="strong"
          type="text"
          value={benefit.title}
          onCommit={(value) => ctx.updateCollectionField("benefits", benefit.id, "title", value)}
          sectionKey="benefits"
          ariaLabel="Edit benefit title"
          styleValue={benefit.titleStyle}
          fieldRef={{ kind: "collection", collectionName: "benefits", itemId: benefit.id, fieldName: "title" }}
        />
      </div>
      <EditableCmsField
        as="p"
        type="textarea"
        value={benefit.description}
        onCommit={(value) => ctx.updateCollectionField("benefits", benefit.id, "description", value)}
        sectionKey="benefits"
        ariaLabel="Edit benefit description"
        styleValue={benefit.descriptionStyle}
        fieldRef={{ kind: "collection", collectionName: "benefits", itemId: benefit.id, fieldName: "description" }}
      />
    </div>
  );
}

export default function Reviews() {
  const reviewsRef = useRef(null);
  const [armedCardId, setArmedCardId] = useState(null);
  const { items: benefits } = useCmsCollectionOverride("benefits", defaultBenefits);
  const { data: benefitsSection } = useCmsDocumentOverride(
    "benefitsSection",
    defaultBenefitsSectionContent
  );
  const { style: benefitsStyle } = useSectionStyleOverride("benefits");
  const ctx = useLayoutEditorContext();
  const updateBenefitsSectionField = (fieldName, value) =>
    ctx?.updateFieldContent("benefitsSection", fieldName, value);
  const benefitsSectionFieldRef = (fieldName) => ({
    kind: "content",
    docId: "benefitsSection",
    fieldName,
  });

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
    <section className="reviews" id="reviews" ref={reviewsRef} style={benefitsStyle}>
      <EditableCmsField
        as="h2"
        type="text"
        value={benefitsSection.heading}
        onCommit={(value) => updateBenefitsSectionField("heading", value)}
        sectionKey="benefits"
        ariaLabel="Edit benefits section heading"
        styleValue={benefitsSection.headingStyle}
        fieldRef={benefitsSectionFieldRef("heading")}
      />

      <div className="review-grid">
        {benefits.map((benefit) => (
          <BenefitCard
            key={benefit.id}
            benefit={benefit}
            ctx={ctx}
            armedCardId={armedCardId}
            setArmedCardId={setArmedCardId}
          />
        ))}
      </div>
    </section>
  );
}
