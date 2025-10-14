import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "leaflet/dist/leaflet.css";
import "./leaflet.fix";
import ToastProvider from "./ui/toast/ToastProvider";

const appTree = (
  <ToastProvider>
    <App />
  </ToastProvider>
);

// ⚠️ StrictMode seulement en production (évite le double-mount en dev)
const Root = import.meta.env.DEV ? appTree : (
  <React.StrictMode>{appTree}</React.StrictMode>
);

ReactDOM.createRoot(document.getElementById("root")!).render(Root);
