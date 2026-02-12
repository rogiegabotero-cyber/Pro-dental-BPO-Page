import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Home from "./components/Hero";
import Services from "./components/Services";
import About from "./components/About";
import Reviews from "./components/Reviews";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import FAQ from "./components/FAQ";

function App() {
  return (
    <Router>
      <Navbar />

      <Routes>
        <Route
          path="/"
          element={
            <>
              <Home />
              <Services />
              <About />
              <Reviews />
              <Contact />
              <Footer />
            </>
          }
        />

        <Route
          path="/faq"
          element={
            <>
              <FAQ />
              <Footer />
            </>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;