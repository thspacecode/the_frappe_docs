import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import "./style.css";

function Home() {
  return (
    <>
      <p className="eyebrow">REACT + FRAPPE</p>
      <h1>The Frappe Docs</h1>
      <p className="intro">A new home for your Frappe documentation.</p>
      <Link className="button" to="/getting-started">Get started →</Link>
    </>
  );
}

function GettingStarted() {
  return (
    <>
      <p className="eyebrow">GETTING STARTED</p>
      <h1>Ready to build.</h1>
      <p className="intro">This React app runs inside Frappe. Add your documentation and features here.</p>
      <Link to="/">← Back to home</Link>
    </>
  );
}

function App() {
  return (
    <BrowserRouter basename="/docs">
      <header><Link className="brand" to="/">The Frappe Docs</Link><a href="/app">Open Desk ↗</a></header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/getting-started" element={<GettingStarted />} />
          <Route path="*" element={<><h1>Page not found</h1><Link to="/">Back to home</Link></>} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>);
