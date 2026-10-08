import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
} from "react-router-dom";
import { GuestContext, RecordPicker, request, ErrorBox } from "./shared";
import { Browse, Property, Guests, Wallet } from "./pages";
import { BookingForm, Bookings } from "./bookings";
import { Analytics, Reviews } from "./reports";
import { Hotspots } from "./hotspots";
import "./style.css";

// The shell owns demo actor selection; switching actors remounts views to clear stale forms.
function App() {
  const [guestId, setGuestId] = useState(
    localStorage.getItem("stayspot-guest") || "",
  );
  const [open, setOpen] = useState(false),
    [error, setError] = useState(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!guestId)
      request("/guests?limit=1")
        .then((data) => {
          if (data.items[0]) setGuestId(data.items[0].id);
        })
        .catch(setError);
  }, [guestId]);
  // Confirm before discarding a partially entered booking when changing the demo actor.
  function switchGuest(id) {
    if (
      window.location.pathname.includes("/book") &&
      !window.confirm(
        "Switch demo guest and discard any unfinished booking form?",
      )
    )
      return;
    setGuestId(id);
    localStorage.setItem("stayspot-guest", id);
    setError(null);
  }
  return (
    <GuestContext.Provider
      value={{
        guestId,
        setGuestId: switchGuest,
        revision,
        refreshGuest: () => setRevision((n) => n + 1),
      }}
    >
      <header>
        <NavLink className="brand" to="/properties">
          StaySpot<span>A place for every stay.</span>
        </NavLink>
        <div className="actor">
          <RecordPicker
            type="guests"
            label="Demo guest"
            value={guestId}
            onChange={switchGuest}
          />
        </div>
        <span className="demo-label">
          Guest / Platform staff
          <br />
          <small>Demo workspace · no login</small>
        </span>
        <button
          className="menu-toggle"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          Menu
        </button>
      </header>
      <div className="workspace">
        <aside className={open ? "open" : ""}>
          <small>WORKSPACE</small>
          <nav>
            {[
              ["/properties", "Browse"],
              ["/bookings", "Bookings"],
              ["/guests", "Guests"],
              ["/wallet", "Wallet & audit"],
              ["/analytics", "Analytics"],
              ["/hotspots", "Search hotspots"],
              ["/reviews", "Reviews"],
            ].map(([path, title]) => (
              <NavLink key={path} to={path} onClick={() => setOpen(false)}>
                {title}
              </NavLink>
            ))}
          </nav>
          <p className="sidebar-note">
            StaySpot / Project 3<br />
            Amounts in currency units
          </p>
        </aside>
        <main key={guestId}>
          <ErrorBox error={error} />
          <Routes>
            <Route path="/" element={<Navigate to="/properties" replace />} />
            <Route path="/properties" element={<Browse />} />
            <Route path="/properties/:id" element={<Property />} />
            <Route path="/properties/:id/book" element={<BookingForm />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/bookings/:id" element={<Bookings />} />
            <Route path="/guests" element={<Guests />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/hotspots" element={<Hotspots />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route
              path="*"
              element={
                <>
                  <h1>Page not found</h1>
                  <NavLink to="/properties">Browse properties</NavLink>
                </>
              }
            />
          </Routes>
        </main>
      </div>
    </GuestContext.Provider>
  );
}

// Mount the single-page application with client-side navigation.
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
