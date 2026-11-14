import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const credentials = sessionStorage.getItem("medstock-auth");
  if (credentials) config.headers.Authorization = `Basic ${credentials}`;
  return config;
});

export async function fetchMedicines(params) {
  const { data } = await api.get("/medicines", { params });
  return data;
}

export async function fetchDashboardSummary() {
  const { data } = await api.get("/dashboard/summary");
  return data;
}

export async function createMedicine(payload) {
  const { data } = await api.post("/medicines", payload);
  return data;
}

export async function updateMedicine(id, payload) {
  const { data } = await api.put(`/medicines/${id}`, payload);
  return data;
}

export async function archiveMedicine(id) {
  await api.delete(`/medicines/${id}`);
}

export async function adjustStock(id, payload) {
  const { data } = await api.post(`/medicines/${id}/adjustments`, payload);
  return data;
}

export async function signIn(username, password) {
  const credentials = btoa(`${username}:${password}`);
  const { data } = await api.get("/auth/me", {
    headers: { Authorization: `Basic ${credentials}` },
  });
  sessionStorage.setItem("medstock-auth", credentials);
  return data;
}

export function signOut() {
  sessionStorage.removeItem("medstock-auth");
}
