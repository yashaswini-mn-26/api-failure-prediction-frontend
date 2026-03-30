
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { ThemeProvider } from "./ThemeContext";

// ReactDOM.createRoot is the React 18 API (replaces ReactDOM.render from React 17)
// document.getElementById("root") finds the <div id="root"> in public/index.html
// The "as HTMLElement" cast tells TypeScript it's definitely an element (not null)
const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);