import "./App.css";
import { Fragment, lazy, Suspense, useEffect } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { AuthProvider } from "./auth/AuthProvider";
import About from "./components/About";
import {
  ArticleDetail,
  ArticlePreviewSection,
  ArticlesList,
} from "./components/Articles";
import Contact from "./components/Contact";
import FAQ from "./components/FAQ";
import FloatingClientPreview from "./components/FloatingClientPreview";
import ForcePasswordChangeGate from "./components/ForcePasswordChangeGate";
import Footer from "./components/Footer";
import Home from "./components/Hero";
import Login from "./components/Login";
import Navbar from "./components/Navbar";
import AccountSettings from "./components/AccountSettings";
import NewsletterPromptDrawer from "./components/NewsletterPromptDrawer";
import { NewsletterPromptProvider } from "./components/NewsletterPromptContext";
import Reviews from "./components/Reviews";
import Services from "./components/Services";
import SectionFrame from "./components/SectionFrame";
import CustomSection from "./components/CustomSection";
import InsertPageBar from "./components/InsertPageBar";
import MobileSettingsProvider from "./components/MobileSettingsProvider";
import { useVisitTracking } from "./hooks/useVisitTracking";
import {
  useCmsLayout,
  normalizeSectionOrder,
  customSectionKeys,
  CUSTOM_SECTION_PREFIX,
} from "./hooks/useCmsData";
import { useLayoutEditorContext } from "./context/LayoutEditorContext";
import { useMobileSettings } from "./hooks/useMobileSettings";

const lazyAdmin = (exportName) =>
  lazy(() =>
    import("./admin/Admin").then((module) => ({
      default: module[exportName],
    }))
  );

const AdminDashboard = lazyAdmin("AdminDashboard");
const AdminLayout = lazyAdmin("AdminLayout");
const AdminUsersPage = lazyAdmin("AdminUsersPage");
const ArticlesAdminPage = lazyAdmin("ArticlesAdminPage");
const CollectionEditor = lazyAdmin("CollectionEditor");
const MediaPage = lazyAdmin("MediaPage");
const SiteContentEditor = lazyAdmin("SiteContentEditor");
const VisualPageEditor = lazy(() => import("./admin/VisualPageEditor"));
const PageContentList = lazy(() => import("./admin/PageContentList"));
const DraftPreview = lazy(() => import("./admin/DraftPreview"));
const EditorFrame = lazy(() => import("./admin/EditorFrame"));

// Thumbnails on the admin Pages screen load the site inside iframes; keep the
// admin-only floating widgets and popups out of those.
const isEmbedded = typeof window !== "undefined" && window.self !== window.top;

const SECTION_COMPONENTS = {
  hero: Home,
  services: Services,
  about: About,
  benefits: Reviews,
  contact: Contact,
  footer: Footer,
};

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

export function PublicHome() {
  const { data: layout } = useCmsLayout();
  const editorContext = useLayoutEditorContext();
  const mobile = useMobileSettings();
  const editing = Boolean(editorContext?.editMode);
  // Hidden-on-phone sections are hidden by CSS media query; the editor
  // desktop canvas never applies it so every section stays editable.
  const applyMobile = !editorContext;
  const liveOrder = editing ? editorContext.pendingOrder : layout.order;
  const customSections = (editing ? editorContext.pendingCustomSections : layout.customSections) || {};
  const order = normalizeSectionOrder(liveOrder, [
    ...Object.keys(SECTION_COMPONENTS),
    ...customSectionKeys(customSections),
  ]);

  return (
    <MobileSettingsProvider>
      <SectionFrame sectionKey="navbar" reorderable={false}>
        <Navbar />
      </SectionFrame>
      {editing && <InsertPageBar afterKey={null} />}
      {order.map((sectionKey, index) => {
        const isCustom = sectionKey.startsWith(CUSTOM_SECTION_PREFIX);
        const Section = SECTION_COMPONENTS[sectionKey];
        const customContent = isCustom
          ? customSections[sectionKey.slice(CUSTOM_SECTION_PREFIX.length)]
          : null;
        if (!Section && !customContent) return null;

        return (
          <Fragment key={sectionKey}>
            <SectionFrame
              sectionKey={sectionKey}
              removable={isCustom}
              hideOnMobile={applyMobile && Boolean(mobile.hiddenSections[sectionKey])}
              dimOnMobile={
                Boolean(editorContext?.deviceFrame) && Boolean(mobile.hiddenSections[sectionKey])
              }
            >
              {customContent ? (
                <CustomSection sectionKey={sectionKey} content={customContent} />
              ) : (
                <Section />
              )}
              {sectionKey === "benefits" && <ArticlePreviewSection />}
            </SectionFrame>
            {editing && index < order.length - 1 && <InsertPageBar afterKey={sectionKey} />}
          </Fragment>
        );
      })}
    </MobileSettingsProvider>
  );
}

export function PublicFaq() {
  return (
    <>
      <SectionFrame sectionKey="navbar" reorderable={false}>
        <Navbar />
      </SectionFrame>
      <FAQ />
      <SectionFrame sectionKey="footer" reorderable={false}>
        <Footer />
      </SectionFrame>
    </>
  );
}

export function PublicArticles() {
  return (
    <>
      <SectionFrame sectionKey="navbar" reorderable={false}>
        <Navbar />
      </SectionFrame>
      <SectionFrame sectionKey="articles" reorderable={false}>
        <ArticlesList />
      </SectionFrame>
      <SectionFrame sectionKey="footer" reorderable={false}>
        <Footer />
      </SectionFrame>
    </>
  );
}

function PublicLogin() {
  return (
    <>
      <Navbar />
      <Login />
      <Footer />
    </>
  );
}

function App() {
  useVisitTracking();

  return (
    <AuthProvider>
      <Router>
        <NewsletterPromptProvider>
          <Suspense fallback={null}>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<PublicHome />} />
              <Route path="/draft-preview/:draftId" element={<DraftPreview />} />
              <Route path="/editor-frame/:draftId" element={<EditorFrame />} />
              <Route path="/login" element={<PublicLogin />} />
              <Route path="/settings" element={<AccountSettings />} />
              <Route path="/faq" element={<PublicFaq />} />
              <Route path="/articles" element={<PublicArticles />} />
              <Route
                path="/articles/:articleId"
                element={
                  <>
                    <Navbar />
                    <ArticleDetail />
                    <Footer />
                  </>
                }
              />

              <Route path="/admin/login" element={<Navigate to="/login" replace />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="articles" element={<ArticlesAdminPage />} />
                <Route path="page-content" element={<PageContentList />} />
                <Route path="page-content/:draftId" element={<VisualPageEditor />} />
                <Route path="hero" element={<SiteContentEditor configKey="hero" />} />
                <Route
                  path="services"
                  element={<CollectionEditor configKey="services" />}
                />
                <Route
                  path="benefits"
                  element={<CollectionEditor configKey="benefits" />}
                />
                <Route path="faq" element={<CollectionEditor configKey="faqs" />} />
                <Route path="about" element={<SiteContentEditor configKey="about" />} />
                {/* Contact is now edited on the Settings page, alongside site
                    settings — redirect any old links/bookmarks there. */}
                <Route path="contact" element={<Navigate to="/admin/settings" replace />} />
                <Route
                  path="settings"
                  element={<SiteContentEditor configKey="settings" />}
                />
                <Route path="media" element={<MediaPage />} />
                <Route path="users" element={<AdminUsersPage />} />
              </Route>
            </Routes>
          </Suspense>
          {!isEmbedded && <NewsletterPromptDrawer />}
        </NewsletterPromptProvider>
        {!isEmbedded && <FloatingClientPreview />}
        <ForcePasswordChangeGate />
      </Router>
    </AuthProvider>
  );
}

export default App;
