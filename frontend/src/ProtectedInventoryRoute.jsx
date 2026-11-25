import App from "./App.jsx";
import { Navigate } from "react-router-dom";

export default function ProtectedInventoryRoute() {
  const isAuthenticated = Boolean(sessionStorage.getItem("medstock-token"));
  return isAuthenticated ? <App /> : <Navigate to="/login" replace />;
}
