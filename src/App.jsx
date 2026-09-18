import "./App.css";
import { lazy, Suspense, useEffect } from "react";
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
import { useVisitTracking } from "./hooks/useVisitTracking";
import { useCmsLayout, normalizeSectionOrder } from "./hooks/useCmsData";
import { useLayoutEditorContext } from "./context/LayoutEditorContext";

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
  const liveOrder = editorContext?.editMode ? editorContext.pendingOrder : layout.order;
  const order = normalizeSectionOrder(liveOrder, Object.keys(SECTION_COMPONENTS));

  return (
    <>
      <SectionFrame sectionKey="navbar" reorderable={false}>
        <Navbar />
      </SectionFrame>
      {order.map((sectionKey) => {
        const Section = SECTION_COMPONENTS[sectionKey];
        if (!Section) return null;

        return (
          <SectionFrame key={sectionKey} sectionKey={sectionKey}>
            <Section />
            {sectionKey === "benefits" && <ArticlePreviewSection />}
          </SectionFrame>
        );
      })}
    </>
  );
}

function PublicFaq() {
  return (
    <>
      <Navbar />
      <FAQ />
      <Footer />
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
              <Route path="/login" element={<PublicLogin />} />
              <Route path="/settings" element={<AccountSettings />} />
              <Route path="/faq" element={<PublicFaq />} />
              <Route
                path="/articles"
                element={
                  <>
                    <Navbar />
                    <ArticlesList />
                    <Footer />
                  </>
                }
              />
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
                <Route path="page-content" element={<VisualPageEditor />} />
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
          <NewsletterPromptDrawer />
        </NewsletterPromptProvider>
        <FloatingClientPreview />
        <ForcePasswordChangeGate />
      </Router>
    </AuthProvider>
  );
}

export default App;
