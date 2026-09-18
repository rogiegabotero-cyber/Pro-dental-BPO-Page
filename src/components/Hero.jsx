import { useEffect, useRef, useState } from "react";
import Smile_love from "../assets/Image/deent.webp";
import HeroBgImage from "../assets/Image/3.webp";
import { defaultHeroContent } from "../data/defaultContent";
import {
  useCmsDocumentOverride,
  useSectionStyleOverride,
  buildBackgroundStyle,
  inferBackgroundType,
  normalizeSectionOrder,
} from "../hooks/useCmsData";
import { useLayoutEditorContext } from "../context/LayoutEditorContext";
import { EditableCmsField, EditableCmsImage, buildFieldStyle } from "./EditableCmsField";
import ReorderableSlot from "./ReorderableSlot";

const HERO_SLOTS = ["tag", "title", "benefits", "buttons"];

export default function Hero() {
  const heroRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);
  const { data: hero } = useCmsDocumentOverride("hero", defaultHeroContent);
  const { raw: heroStyleOverride } = useSectionStyleOverride("hero");
  const ctx = useLayoutEditorContext();
  const updateHeroField = (fieldName, value) => ctx?.updateFieldContent("hero", fieldName, value);
  const heroFieldRef = (fieldName) => ({ kind: "content", docId: "hero", fieldName });
  const heroFontStyle = heroStyleOverride.fontFamily
    ? { fontFamily: heroStyleOverride.fontFamily }
    : undefined;

  const heroBgStyle = inferBackgroundType(heroStyleOverride)
    ? buildBackgroundStyle(heroStyleOverride)
    : { backgroundImage: `url(${hero.backgroundImageUrl || HeroBgImage})` };

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          setHasViewed(true);
        } else {
          setInView(false);
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY * 0.15;
      document.documentElement.style.setProperty("--bg-offset", `${offset}px`);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const heroOrder = normalizeSectionOrder(hero.elementOrder, HERO_SLOTS);

  const heroSlotContent = {
    tag: (
      <div className="containerHero-section-tag">
        <EditableCmsField
          as="span"
          className="hero-tag"
          type="text"
          value={hero.tag}
          onCommit={(value) => updateHeroField("tag", value)}
          sectionKey="hero"
          ariaLabel="Edit hero tag"
          styleValue={hero.tagStyle}
          fieldRef={heroFieldRef("tag")}
        />
      </div>
    ),
    title: (
      <EditableCmsField
        as="h1"
        type="text"
        value={hero.title}
        onCommit={(value) => updateHeroField("title", value)}
        sectionKey="hero"
        ariaLabel="Edit hero title"
        styleValue={hero.titleStyle}
        fieldRef={heroFieldRef("title")}
      />
    ),
    benefits: (
      <EditableCmsField
        type="lines"
        value={hero.benefits}
        onCommit={(value) => updateHeroField("benefits", value)}
        sectionKey="hero"
        ariaLabel="Edit hero benefits list"
        styleValue={hero.benefitsStyle}
        fieldRef={heroFieldRef("benefits")}
        renderView={(benefits) => (
          <ul className="hero-benefits">
            {(benefits || []).map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>
        )}
      />
    ),
    buttons: (
      <div className="hero-buttons" style={buildFieldStyle(hero.buttonsStyle)}>
        <button
          className="btn-primary"
          onClick={() => scrollToSection("contact")}
        >
          <EditableCmsField
            as="span"
            type="text"
            value={hero.primaryButtonLabel}
            onCommit={(value) => updateHeroField("primaryButtonLabel", value)}
            sectionKey="hero"
            ariaLabel="Edit primary button label"
            styleValue={hero.primaryButtonLabelStyle}
            fieldRef={heroFieldRef("primaryButtonLabel")}
          />
        </button>

        <button
          className="btn-outline"
          onClick={() => scrollToSection("services")}
        >
          <EditableCmsField
            as="span"
            type="text"
            value={hero.secondaryButtonLabel}
            onCommit={(value) => updateHeroField("secondaryButtonLabel", value)}
            sectionKey="hero"
            ariaLabel="Edit secondary button label"
            styleValue={hero.secondaryButtonLabelStyle}
            fieldRef={heroFieldRef("secondaryButtonLabel")}
          />
        </button>
      </div>
    ),
  };

  return (
    <div className="Home-background">
      <section
        ref={heroRef}
        id="hero"
        className={`hero ${inView ? "hero-animate" : "hero-exit"} ${
          hasViewed ? "hero-seen" : ""
        }`}
        style={heroFontStyle}
      >
        <div className="hero-bg" style={heroBgStyle} />

        <div className="hero-text">
          {heroOrder.map((key) => (
            <ReorderableSlot
              key={key}
              docId="hero"
              sectionKey="hero"
              slotKey={key}
              order={heroOrder}
              ariaLabel={`Drag to reorder the ${key} block`}
            >
              {heroSlotContent[key]}
            </ReorderableSlot>
          ))}
        </div>

        <div className="hero-image">
            <div className="card2 image-box">
              <EditableCmsImage
                src={hero.foregroundImageUrl || Smile_love}
                alt={hero.foregroundImageAlt || "Pro-Dental BPO Support Team"}
                sectionKey="hero"
                storagePathPrefix="content-images/hero-foregroundImageUrl"
                onCommit={(url) => updateHeroField("foregroundImageUrl", url)}
                styleValue={hero.foregroundImageUrlStyle}
                fieldRef={{ ...heroFieldRef("foregroundImageUrl"), isImage: true }}
              />
            </div>
        </div>
      </section>
    </div>
  );
}
