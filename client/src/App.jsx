import { useCallback, useState } from "react";
import Preloader from "./components/Preloader";
import Header from "./components/Header";
import Hero from "./components/Hero";
import WhyUs from "./components/WhyUs";
import Stats from "./components/Stats";
import Ticker from "./components/Ticker";
import QuoteBanner from "./components/QuoteBanner";
import Catalogue from "./components/Catalogue";
import Gallery from "./components/Gallery";
import VideoGallery from "./components/VideoGallery";
import Process from "./components/Process";
import Mill from "./components/Mill";
import People from "./components/People";
import Reviews from "./components/Reviews";
import Faq from "./components/Faq";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import BackToTop from "./components/BackToTop";
import SpecModal from "./components/SpecModal";
import { useScrollProgress } from "./hooks/useScrollProgress";
import { useReveal } from "./hooks/useReveal";
import { useMagnetic } from "./hooks/useMagnetic";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, title: "", lineName: "" });
  const { scroll, shrink, showTop } = useScrollProgress({ shrinkAt: 90, topAt: 0.07 });

  useReveal({ current: document }, []);
  useMagnetic({ current: document }, []);

  const openModal = useCallback((title, lineName = "") => {
    setModal({ open: true, title, lineName });
  }, []);
  const closeModal = useCallback(() => setModal((m) => ({ ...m, open: false })), []);

  return (
    <div className="ff-app">
      {loading && <Preloader onDone={() => setLoading(false)} />}

      <div className="ff-progress" style={{ transform: `scaleX(${scroll.toFixed(4)})` }} />

      <Header shrink={shrink} onOpenModal={openModal} />

      <Hero onOpenModal={openModal} />
      <WhyUs />
      <Stats />
      <Ticker />
      <QuoteBanner onOpenModal={openModal} />
      <Catalogue onOpenModal={openModal} />
      <Gallery />
      <VideoGallery />
      <Process />
      <Mill />
      <People />
      <Reviews />
      <Faq />
      <Contact />
      <Footer />

      <BackToTop visible={showTop} />

      <SpecModal isOpen={modal.open} title={modal.title} lineName={modal.lineName} onClose={closeModal} />
    </div>
  );
}
