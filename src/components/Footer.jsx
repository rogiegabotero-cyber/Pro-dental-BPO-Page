import dent_logo from "../assets/Image/1.webp";
import dent_logo2 from "../assets/Image/2.webp";
import { FaPhoneAlt, FaEnvelope } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import {
  defaultContactContent,
  defaultSettingsContent,
  defaultFooterSectionContent,
} from "../data/defaultContent";
import {
  useCmsDocumentOverride,
  useSectionStyleOverride,
  normalizeSectionOrder,
} from "../hooks/useCmsData";
import { useLayoutEditorContext } from "../context/LayoutEditorContext";
import { EditableCmsField, buildFieldStyle } from "./EditableCmsField";
import ReorderableSlot from "./ReorderableSlot";
import NewsletterSignup from "./NewsletterSignup";

const FOOTER_SLOTS = ["logo", "quickLinks", "contactBlock", "social", "newsletter"];

export default function Footer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: contact } = useCmsDocumentOverride("contact", defaultContactContent);
  const { data: settings } = useCmsDocumentOverride("settings", defaultSettingsContent);
  const { data: footerSection } = useCmsDocumentOverride(
    "footerSection",
    defaultFooterSectionContent
  );
  const { style: footerStyle } = useSectionStyleOverride("footer");
  const ctx = useLayoutEditorContext();
  const updateFooterField = (fieldName, value) =>
    ctx?.updateFieldContent("footerSection", fieldName, value);
  const footerFieldRef = (fieldName) => ({ kind: "content", docId: "footerSection", fieldName });

  // Route-aware scroll helper (same idea as Navbar)
  const scrollToSection = (id) => {
    const doScroll = () => {
      const section = document.getElementById(id);
      if (section) section.scrollIntoView({ behavior: "smooth" });
    };

    // If not on homepage, go home first then scroll
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(doScroll, 50); // wait for home sections to mount
      return;
    }

    doScroll();
  };

  const goToFaq = () => {
    navigate("/faq");
  };

  const footerOrder = normalizeSectionOrder(footerSection.elementOrder, FOOTER_SLOTS);

  const footerSlotContent = {
    logo: (
      <div style={buildFieldStyle(footerSection.logoStyle)}>
        <div className="name-logo">
          <div className="name-logo">
            <img src={dent_logo}
            className="name-icon" alt="Dental care" />


            <div className="name-logo2">
                  <img src={dent_logo2}
                  className="name-icon2" alt="Dental care" />
            </div>
          </div>
        </div>
      </div>
    ),
    quickLinks: (
      <div className="quick-links" style={buildFieldStyle(footerSection.quickLinksStyle)}>
        <EditableCmsField
          as="h4"
          type="text"
          value={footerSection.quickLinksHeading}
          onCommit={(value) => updateFooterField("quickLinksHeading", value)}
          sectionKey="footer"
          ariaLabel="Edit quick links heading"
          styleValue={footerSection.quickLinksHeadingStyle}
          fieldRef={footerFieldRef("quickLinksHeading")}
        />
        <p onClick={() => scrollToSection("services")}>
          <EditableCmsField
            as="span"
            type="text"
            value={footerSection.navServicesLabel}
            onCommit={(value) => updateFooterField("navServicesLabel", value)}
            sectionKey="footer"
            ariaLabel="Edit Services nav label"
            styleValue={footerSection.navServicesLabelStyle}
            fieldRef={footerFieldRef("navServicesLabel")}
          />
        </p>
        <p onClick={() => scrollToSection("about")}>
          <EditableCmsField
            as="span"
            type="text"
            value={footerSection.navAboutLabel}
            onCommit={(value) => updateFooterField("navAboutLabel", value)}
            sectionKey="footer"
            ariaLabel="Edit About nav label"
            styleValue={footerSection.navAboutLabelStyle}
            fieldRef={footerFieldRef("navAboutLabel")}
          />
        </p>
        <p onClick={() => scrollToSection("reviews")}>
          <EditableCmsField
            as="span"
            type="text"
            value={footerSection.navBenefitsLabel}
            onCommit={(value) => updateFooterField("navBenefitsLabel", value)}
            sectionKey="footer"
            ariaLabel="Edit Benefits nav label"
            styleValue={footerSection.navBenefitsLabelStyle}
            fieldRef={footerFieldRef("navBenefitsLabel")}
          />
        </p>
        <p onClick={() => scrollToSection("contact")}>
          <EditableCmsField
            as="span"
            type="text"
            value={footerSection.navContactLabel}
            onCommit={(value) => updateFooterField("navContactLabel", value)}
            sectionKey="footer"
            ariaLabel="Edit Contact nav label"
            styleValue={footerSection.navContactLabelStyle}
            fieldRef={footerFieldRef("navContactLabel")}
          />
        </p>
        <p onClick={goToFaq}>
          <EditableCmsField
            as="span"
            type="text"
            value={footerSection.navFaqLabel}
            onCommit={(value) => updateFooterField("navFaqLabel", value)}
            sectionKey="footer"
            ariaLabel="Edit FAQ nav label"
            styleValue={footerSection.navFaqLabelStyle}
            fieldRef={footerFieldRef("navFaqLabel")}
          />
        </p>
        <p onClick={() => navigate("/articles")}>
          <EditableCmsField
            as="span"
            type="text"
            value={footerSection.navArticlesLabel}
            onCommit={(value) => updateFooterField("navArticlesLabel", value)}
            sectionKey="footer"
            ariaLabel="Edit Articles nav label"
            styleValue={footerSection.navArticlesLabelStyle}
            fieldRef={footerFieldRef("navArticlesLabel")}
          />
        </p>
      </div>
    ),
    contactBlock: (
      <div className="containerFoot" style={buildFieldStyle(footerSection.contactBlockStyle)}>
        <EditableCmsField
          as="h4"
          type="text"
          value={footerSection.contactHeading}
          onCommit={(value) => updateFooterField("contactHeading", value)}
          sectionKey="footer"
          ariaLabel="Edit contact heading"
          styleValue={footerSection.contactHeadingStyle}
          fieldRef={footerFieldRef("contactHeading")}
        />
        <div className="contact-item1">
          <FaPhoneAlt className="contact-icon2" />
          <p>{contact.phone}</p>
        </div>
        <div className="contact-item1">
          <FaEnvelope className="contact-icon2" />
          <p>{contact.email}</p>
        </div>
        {/* <div className="contact-item1">
          <FaMapMarkerAlt className="contact-icon2" />
          <p>123 Smile Street, Suite 100</p>
        </div> */}
      </div>
    ),
    social: (
      <div className="card" style={buildFieldStyle(footerSection.socialStyle)}>
        <a
          className="socialContainer containerOne"
          href={settings.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
        >
          <svg className="socialSvg instagramSvg" viewBox="0 0 16 16"> <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"></path> </svg>
        </a>

        <a
          className="socialContainer containerFacebook"
          href={settings.facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook"
        >
          <svg className="socialSvg facebookSvg" viewBox="0 0 16 16">
            <path d="M16 8.049C16 3.603 12.418 0 8 0S0 3.603 0 8.049c0 4.017 2.925 7.347 6.75 7.951v-5.625H4.719V8.049H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.875 0 1.79.157 1.79.157v1.98h-1.008c-.993 0-1.304.621-1.304 1.258v1.51h2.219l-.355 2.326H9.25V16C13.075 15.396 16 12.066 16 8.049z"/>
          </svg>
        </a>

        <a
          className="socialContainer containerThree"
          href={settings.linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
        >
          <svg className="socialSvg linkdinSvg" viewBox="0 0 448 512"><path d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z"></path></svg>
        </a>
      </div>
    ),
    newsletter: (
      <div className="containerFoot" style={buildFieldStyle(footerSection.newsletterStyle)}>
        <NewsletterSignup compact />
      </div>
    ),
  };

  return (
<footer className="footer" style={footerStyle}>
  <div className="footer-grid">
    {footerOrder.map((key) => (
      <ReorderableSlot
        key={key}
        docId="footerSection"
        sectionKey="footer"
        slotKey={key}
        order={footerOrder}
        ariaLabel={`Drag to reorder the ${key} block`}
      >
        {footerSlotContent[key]}
      </ReorderableSlot>
    ))}
  </div>

  <div>
    <EditableCmsField
      as="span"
      className="copyright"
      type="text"
      value={footerSection.copyrightText}
      onCommit={(value) => updateFooterField("copyrightText", value)}
      sectionKey="footer"
      ariaLabel="Edit copyright text"
      styleValue={footerSection.copyrightTextStyle}
      fieldRef={footerFieldRef("copyrightText")}
    />
  </div>
</footer>
  );
}
