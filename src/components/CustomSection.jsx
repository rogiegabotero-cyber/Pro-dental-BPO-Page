import { useSectionStyleOverride } from "../hooks/useCmsData";
import { useLayoutEditorContext } from "../context/LayoutEditorContext";
import { EditableCmsField } from "./EditableCmsField";
import "../assets/Style/customSection.css";

// A page (panel) the admin added between two existing ones. Its content lives
// on the layout document (`customSections[id]`), edited in place in the page
// editor and read from the live layout on the public site.
export default function CustomSection({ sectionKey, content }) {
  const ctx = useLayoutEditorContext();
  const { style } = useSectionStyleOverride(sectionKey);
  const id = sectionKey.replace(/^custom-/, "");
  const update = (field, value) => ctx?.updateCustomSection(id, { [field]: value });

  return (
    <section className="custom-section" style={style}>
      <div className="custom-section__inner">
        <EditableCmsField
          as="h2"
          type="text"
          value={content.title}
          onCommit={(value) => update("title", value)}
          sectionKey={sectionKey}
          ariaLabel="Edit page title"
        />
        <EditableCmsField
          as="p"
          type="textarea"
          className="custom-section__body"
          value={content.body}
          onCommit={(value) => update("body", value)}
          sectionKey={sectionKey}
          ariaLabel="Edit page text"
        />
      </div>
    </section>
  );
}
