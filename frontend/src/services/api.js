import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("medstock-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      sessionStorage.removeItem("medstock-token");
      sessionStorage.removeItem("medstock-user");
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }
    return Promise.reject(error);
  },
);

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

export async function createStaffAccount(username, password) {
  const { data } = await api.post("/admin/accounts", { username, password });
  return data;
}

export async function signIn(username, password) {
  const { data } = await api.post("/auth/login", { username, password });
  sessionStorage.setItem("medstock-token", data.token);
  sessionStorage.setItem("medstock-user", JSON.stringify({ username: data.username, role: data.role }));
  return data;
}

export function signOut() {
  sessionStorage.removeItem("medstock-token");
  sessionStorage.removeItem("medstock-user");
}
