import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/inventory" replace />} />
        <Route path="/admin/inventory" element={<App />} />
        <Route path="*" element={<main className="p-8 text-slate-700">Page not found. <a className="text-blue-600 underline" href="/admin/inventory">Return to inventory</a></main>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
