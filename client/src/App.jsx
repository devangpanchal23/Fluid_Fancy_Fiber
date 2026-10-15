import { lazy, useCallback, useState } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import WhyUs from "./components/WhyUs";
import Stats from "./components/Stats";
import Ticker from "./components/Ticker";
import QuoteBanner from "./components/QuoteBanner";
import DeferredSection from "./components/DeferredSection";
import Process from "./components/Process";
import Mill from "./components/Mill";
import Reviews from "./components/Reviews";
import Faq from "./components/Faq";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import BackToTop from "./components/BackToTop";
import { useScrollProgress } from "./hooks/useScrollProgress";
import { useReveal } from "./hooks/useReveal";
import { useMagnetic } from "./hooks/useMagnetic";

const Catalogue = lazy(() => import("./components/Catalogue.jsx"));
const Gallery = lazy(() => import("./components/Gallery.jsx"));
const VideoGallery = lazy(() => import("./components/VideoGallery.jsx"));
const People = lazy(() => import("./components/People.jsx"));
const SpecModal = lazy(() => import("./components/SpecModal.jsx"));

export default function App() {
  const [modal, setModal] = useState({ open: false, title: "", lineName: "" });
  const { scroll, shrink, showTop } = useScrollProgress({ shrinkAt: 90, topAt: 0.07 });

  useReveal({ current: document });
  useMagnetic({ current: document });

  const openModal = useCallback((title, lineName = "") => {
    setModal({ open: true, title, lineName });
  }, []);
  const closeModal = useCallback(() => setModal((m) => ({ ...m, open: false })), []);

  return (
    <div className="ff-app">
      <div className="ff-progress" style={{ transform: `scaleX(${scroll.toFixed(4)})` }} />

      <Header shrink={shrink} onOpenModal={openModal} />

      <Hero onOpenModal={openModal} />
      <WhyUs />
      <Stats />
      <Ticker />
      <QuoteBanner onOpenModal={openModal} />
      <DeferredSection id="catalogue" label="Catalogue" minHeight="min(1200px, 150vh)">
        <Catalogue onOpenModal={openModal} />
      </DeferredSection>
      <DeferredSection id="gallery" label="Cone library" minHeight="min(720px, 100vh)">
        <Gallery />
      </DeferredSection>
      <DeferredSection id="videos" label="Videos" minHeight="1px">
        <VideoGallery />
      </DeferredSection>
      <Process />
      <Mill />
      <DeferredSection id="people" label="People" minHeight="min(720px, 100vh)">
        <People />
      </DeferredSection>
      <Reviews />
      <Faq />
      <Contact />
      <Footer />

      <BackToTop visible={showTop} />

      {modal.open && (
        <Suspense fallback={null}>
          <SpecModal isOpen={modal.open} title={modal.title} lineName={modal.lineName} onClose={closeModal} />
        </Suspense>
      )}
    </div>
  );
}
