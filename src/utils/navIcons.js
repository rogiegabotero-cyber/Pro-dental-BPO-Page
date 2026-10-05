import {
  FaBriefcase,
  FaCalendarAlt,
  FaClipboardList,
  FaCog,
  FaComments,
  FaEnvelope,
  FaHeart,
  FaHome,
  FaInfoCircle,
  FaLink,
  FaMapMarkerAlt,
  FaNewspaper,
  FaPhoneAlt,
  FaQuestionCircle,
  FaSearch,
  FaShieldAlt,
  FaStar,
  FaTooth,
  FaUser,
  FaUsers,
} from "react-icons/fa";

// Icons the bottom tab bar can use (picked per link in the page editor).
export const NAV_ICONS = {
  tooth: { label: "Tooth", Icon: FaTooth },
  home: { label: "Home", Icon: FaHome },
  info: { label: "Info", Icon: FaInfoCircle },
  star: { label: "Star", Icon: FaStar },
  heart: { label: "Heart", Icon: FaHeart },
  newspaper: { label: "Newspaper", Icon: FaNewspaper },
  envelope: { label: "Envelope", Icon: FaEnvelope },
  phone: { label: "Phone", Icon: FaPhoneAlt },
  question: { label: "Question", Icon: FaQuestionCircle },
  calendar: { label: "Calendar", Icon: FaCalendarAlt },
  briefcase: { label: "Briefcase", Icon: FaBriefcase },
  clipboard: { label: "Clipboard", Icon: FaClipboardList },
  comments: { label: "Chat", Icon: FaComments },
  map: { label: "Location", Icon: FaMapMarkerAlt },
  user: { label: "Person", Icon: FaUser },
  users: { label: "People", Icon: FaUsers },
  shield: { label: "Shield", Icon: FaShieldAlt },
  search: { label: "Search", Icon: FaSearch },
  cog: { label: "Settings", Icon: FaCog },
  link: { label: "Link", Icon: FaLink },
};

export const DEFAULT_TAB_ICONS = {
  services: "tooth",
  about: "info",
  benefits: "star",
  articles: "newspaper",
  contact: "envelope",
  faq: "question",
};

export function resolveNavIcon(linkId, chosen) {
  const key = chosen || DEFAULT_TAB_ICONS[linkId] || "link";
  return (NAV_ICONS[key] || NAV_ICONS.link).Icon;
}
