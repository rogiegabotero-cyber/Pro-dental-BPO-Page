import { FaBars, FaMobileAlt } from "react-icons/fa";

// Body of the side panel's "Mobile" tab, available while a device is selected.
// Everything here only affects phones (768px and narrower).
export default function MobileSettingsPanel({ mobile, sections, navLinks, onChange }) {
  const setNavStyle = (navStyle) => onChange({ ...mobile, navStyle });

  const toggle = (bucket, key, visible) => {
    const next = { ...mobile[bucket] };
    if (visible) {
      delete next[key];
    } else {
      next[key] = true;
    }
    onChange({ ...mobile, [bucket]: next });
  };

  return (
    <div className="layout-editor-sidepanel__body">
        <div className="layout-editor-panel-section">
          <span className="layout-editor-panel-section__label">
            <FaBars /> Navigation style
          </span>
          <label className="layout-editor-choice">
            <input
              type="radio"
              name="mobile-nav-style"
              checked={mobile.navStyle === "burger"}
              onChange={() => setNavStyle("burger")}
            />
            <span>
              <strong>Burger menu</strong>
              <small>Links open from a menu button at the top.</small>
            </span>
          </label>
          <label className="layout-editor-choice">
            <input
              type="radio"
              name="mobile-nav-style"
              checked={mobile.navStyle === "bottom"}
              onChange={() => setNavStyle("bottom")}
            />
            <span>
              <strong>Bottom tab bar</strong>
              <small>Buttons stay pinned below the screen.</small>
            </span>
          </label>
        </div>

        <div className="layout-editor-panel-section">
          <span className="layout-editor-panel-section__label">
            <FaMobileAlt /> Sections shown on phones
          </span>
          {sections.map((section) => (
            <label key={section.key} className="layout-editor-check">
              <input
                type="checkbox"
                checked={!mobile.hiddenSections[section.key]}
                onChange={(event) => toggle("hiddenSections", section.key, event.target.checked)}
              />
              <span>{section.label}</span>
            </label>
          ))}
        </div>

        <div className="layout-editor-panel-section">
          <span className="layout-editor-panel-section__label">Menu links shown on phones</span>
          {navLinks.map((link) => (
            <label key={link.id} className="layout-editor-check">
              <input
                type="checkbox"
                checked={!mobile.hiddenNavLinks[link.id]}
                onChange={(event) => toggle("hiddenNavLinks", link.id, event.target.checked)}
              />
              <span>{link.label}</span>
            </label>
          ))}
        </div>

        <p className="layout-editor-sidepanel__hint">
          Changes preview instantly. Click Save to apply them to the site.
        </p>
    </div>
  );
}
