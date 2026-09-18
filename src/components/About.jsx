import { useEffect, useRef } from "react";
import den_love from "../assets/Image/den.webp";
import { defaultAboutContent } from "../data/defaultContent";
import {
  useCmsDocumentOverride,
  useSectionStyleOverride,
  normalizeSectionOrder,
} from "../hooks/useCmsData";
import { useLayoutEditorContext } from "../context/LayoutEditorContext";
import { EditableCmsField, EditableCmsImage } from "./EditableCmsField";
import ReorderableSlot from "./ReorderableSlot";

const ABOUT_SLOTS = ["tag", "title", "paragraphs"];

export default function About() {
  const aboutRef = useRef(null);
  const { data: about } = useCmsDocumentOverride("about", defaultAboutContent);
  const { style: aboutStyle } = useSectionStyleOverride("about");
  const ctx = useLayoutEditorContext();
  const updateAboutField = (fieldName, value) => ctx?.updateFieldContent("about", fieldName, value);
  const aboutFieldRef = (fieldName) => ({ kind: "content", docId: "about", fieldName });

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

    if (aboutRef.current) observer.observe(aboutRef.current);

    return () => observer.disconnect();
  }, []);

  const aboutOrder = normalizeSectionOrder(about.elementOrder, ABOUT_SLOTS);

  const aboutSlotContent = {
    tag: (
      <EditableCmsField
        as="span"
        className="section-tag"
        type="text"
        value={about.tag}
        onCommit={(value) => updateAboutField("tag", value)}
        sectionKey="about"
        ariaLabel="Edit about tag"
        styleValue={about.tagStyle}
        fieldRef={aboutFieldRef("tag")}
      />
    ),
    title: (
      <EditableCmsField
        as="h2"
        type="text"
        value={about.title}
        onCommit={(value) => updateAboutField("title", value)}
        sectionKey="about"
        ariaLabel="Edit about title"
        styleValue={about.titleStyle}
        fieldRef={aboutFieldRef("title")}
      />
    ),
    paragraphs: (
      <EditableCmsField
        type="blocks"
        value={about.paragraphs}
        onCommit={(value) => updateAboutField("paragraphs", value)}
        sectionKey="about"
        ariaLabel="Edit about paragraphs"
        styleValue={about.paragraphsStyle}
        fieldRef={aboutFieldRef("paragraphs")}
        renderView={(paragraphs) => (
          <div className="about-paragraphs">
            {(paragraphs || []).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        )}
      />
    ),
  };

  return (
    <section className="about" id="about" ref={aboutRef} style={aboutStyle}>
      <div className="about-image fade-left">
        <EditableCmsImage
          src={about.imageUrl || den_love}
          alt={about.imageAlt || "Pro-Dental BPO Operations Team"}
          sectionKey="about"
          storagePathPrefix="content-images/about-imageUrl"
          onCommit={(url) => updateAboutField("imageUrl", url)}
          styleValue={about.imageUrlStyle}
          fieldRef={{ ...aboutFieldRef("imageUrl"), isImage: true }}
        />
      </div>

      <div className="about-text fade-right">
        {aboutOrder.map((key) => (
          <ReorderableSlot
            key={key}
            docId="about"
            sectionKey="about"
            slotKey={key}
            order={aboutOrder}
            ariaLabel={`Drag to reorder the ${key} block`}
          >
            {aboutSlotContent[key]}
          </ReorderableSlot>
        ))}
      </div>
    </section>
  );
}
