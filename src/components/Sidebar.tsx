/*
  Sidebar.tsx — Left Navigation Panel
  ─────────────────────────────────────────────────────────────────────────
  PURPOSE:
    Renders the fixed left sidebar containing:
    1. Brand logo + name (clicking navigates to Overview)
    2. Navigation items (6 pages, split into 2 sections)
    3. Status pill at the bottom showing system operational state

  ICONS:
    All icons are INLINE SVG — no icon library (Lucide, FontAwesome etc.) used.
    Each icon is a hand-drawn SVG path inside a 16×16 viewBox.
    stroke="currentColor" means the icon color inherits from parent CSS color.

    Icon breakdown:
    - Overview  : Bar chart (3 ascending rectangles)
    - Metrics   : Line chart polyline
    - History   : Clock circle with hands
    - Prediction: Stacked hexagons (layered diamond shape)
    - Incidents : Lightning bolt / energy
    - Settings  : Gear — center circle + 8 radiating lines

  PROPS:
    activePage  : Page — which page is currently active (highlights nav item)
    onNavigate  : (page: Page) => void — called when a nav item is clicked

  BRAND CLICK:
    The .brand div has onClick={() => onNavigate("overview")}
    This means clicking the logo or "SentinelAPI" text always goes to Overview.
    The cursor: pointer and hover opacity in CSS confirm it's clickable.
*/

import React, { JSX } from "react";
import { Page } from "../App";

interface Props {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

// NAV_ITEMS defines the two nav sections and their items.
// Each item has: page (route name), label (display text), icon (JSX element)
const NAV_ITEMS: {
  section: string;
  items: { page: Page; label: string; icon: JSX.Element }[];
}[] = [
  {
    section: "Analytics",
    items: [
      {
        page: "overview",
        label: "Overview",
        icon: (
          <svg viewBox="0 0 16 16">
            <rect x="1" y="9" width="3" height="6" rx="1"/>
            <rect x="6" y="5" width="3" height="10" rx="1"/>
            <rect x="11" y="1" width="3" height="14" rx="1"/>
          </svg>
        ),
      },
      {
        page: "metrics",
        label: "Metrics",
        icon: (
          <svg viewBox="0 0 16 16">
            <polyline points="1,11 5,6 9,9 15,3"/>
          </svg>
        ),
      },
      {
        page: "history",
        label: "History",
        icon: (
          <svg viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="6"/>
            <polyline points="8,4 8,8 11,10"/>
          </svg>
        ),
      },
    ],
  },

  {
    section: "Operations",
    items: [
      {
        page: "prediction",
        label: "Prediction",
        icon: (
          <svg viewBox="0 0 16 16">
            <path d="M8 2L2 5L8 8L14 5L8 2Z"/>
            <path d="M2 8L8 11L14 8"/>
          </svg>
        ),
      },
      {
        page: "incidents",
        label: "Incidents",
        icon: (
          <svg viewBox="0 0 16 16">
            <path d="M13 6H9L11 1L3 9H7L5 15L13 6Z"/>
          </svg>
        ),
      },
      {
        page: "settings",
        label: "Settings",
        icon: (
          <svg viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="2"/>
            <path d="M8 1V3M8 13V15M1 8H3M13 8H15M3.5 3.5L5 5M11 11L12.5 12.5M12.5 3.5L11 5M5 11L3.5 12.5"/>
          </svg>
        ),
      },
    ],
  },

  // 🔥 NEW SECTION
  {
    section: "Integrations",
    items: [
      {
        page: "connect",
        label: "Connect",
        // Link / plug icon
        icon: (
          <svg viewBox="0 0 16 16">
            <path d="M6 5L10 9M5 10a3 3 0 010-4l1-1a3 3 0 014 0M11 6a3 3 0 010 4l-1 1a3 3 0 01-4 0"/>
          </svg>
        ),
      },
      {
        page: "repo-analyzer",
        label: "Repo Analyzer",
        // Code / repo icon
        icon: (
          <svg viewBox="0 0 16 16">
            <polyline points="6,4 2,8 6,12"/>
            <polyline points="10,4 14,8 10,12"/>
          </svg>
        ),
      },
      {
        page: "endpoint-monitor",
        label: "Endpoint Monitor",
        // Network / nodes icon
        icon: (
          <svg viewBox="0 0 16 16">
            <circle cx="3" cy="8" r="2"/>
            <circle cx="13" cy="4" r="2"/>
            <circle cx="13" cy="12" r="2"/>
            <line x1="5" y1="8" x2="11" y2="4"/>
            <line x1="5" y1="8" x2="11" y2="12"/>
          </svg>
        ),
      },
    ],
  },
];

const Sidebar: React.FC<Props> = ({ activePage, onNavigate }) => {
  return (
    <aside className="sidebar">

      {/* BRAND — clicking this always navigates to "overview"
          onClick passes "overview" to App.tsx's setActivePage
          The cursor:pointer and hover:opacity are set in App.css (.brand) */}
      <div
        className="brand"
        onClick={() => onNavigate("overview")}
        role="button"              /* Accessibility: screen readers understand it's clickable */
        tabIndex={0}               /* Keyboard-navigable */
        onKeyDown={e => e.key === "Enter" && onNavigate("overview")} /* Enter key support */
        title="Go to Overview"
      >
        {/* brand-icon: blue square with rounded corners, hexagon SVG inside */}
        <div className="brand-icon">
          <svg viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            {/* Hexagon outline */}
            <path d="M8 2L14 5V11L8 14L2 11V5L8 2Z"/>
            {/* White filled circle in center */}
            <circle cx="8" cy="8" r="2" fill="white" stroke="none"/>
          </svg>
        </div>

        {/* Brand text: "SentinelAPI" in Syne font + "Monitoring Platform" subtitle */}
        <div>
          <div className="brand-name">SentinelAPI</div>
          <div className="brand-sub">Monitoring Platform</div>
        </div>
      </div>

      {/* NAVIGATION
          .nav has flex:1 so it expands to fill space between brand and footer.
          Each section has a label div + button items below it. */}
      <nav className="nav">
        {NAV_ITEMS.map((section) => (
          <React.Fragment key={section.section}>
            {/* Section label — "Analytics" or "Operations" */}
            <div className="nav-section-label">{section.section}</div>

            {/* Nav buttons — each is a <button> for accessibility */}
            {section.items.map(({ page, label, icon }) => (
              <button
                key={page}
                className={`nav-item ${activePage === page ? "active" : ""}`}
                /* Template literal adds "active" class when this page matches activePage.
                   CSS .nav-item.active sets blue background + accent text color. */
                onClick={() => onNavigate(page)}
                /* Calls App.tsx's setActivePage with the page string.
                   This re-renders App → renderPage() picks the new component. */
              >
                {icon}   {/* Inline SVG icon from NAV_ITEMS array above */}
                {label}  {/* Text label e.g. "Overview" */}
              </button>
            ))}
          </React.Fragment>
        ))}
      </nav>

      {/* SIDEBAR FOOTER — always sticks to the bottom via CSS flex layout
          Shows system operational status with a pulsing green dot animation. */}
      <div className="sidebar-footer">
        <div className="status-pill">
          {/* Pulsing dot — CSS @keyframes pulse-dot expands box-shadow */}
          <div className="status-dot" />
          <div>
            <div className="status-label">All Systems Operational</div>
            <div className="status-sub">Auto-refresh every 5s</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;