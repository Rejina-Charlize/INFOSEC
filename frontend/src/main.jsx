import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./Login.jsx";
import ProtectedInventoryRoute from "./ProtectedInventoryRoute.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={sessionStorage.getItem("medstock-token") ? "/admin/inventory" : "/login"} replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/inventory" element={<ProtectedInventoryRoute />} />
        <Route path="*" element={<main className="p-8 text-slate-700">Page not found. <a className="text-blue-600 underline" href="/admin/inventory">Return to inventory</a></main>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
