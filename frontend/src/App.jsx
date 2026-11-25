import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, ArrowDownToLine, Bell, Boxes, CalendarDays, Check,
  ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Download,
  LayoutDashboard, LogOut, Menu, MoreHorizontal, Package, Pencil,
  Plus, Search, Settings, ShieldCheck, ShoppingCart, Stethoscope,
  Thermometer, Truck, X,
} from "lucide-react";
import ModulePages from "./ModulePages.jsx";
import {
  archiveMedicine, adjustStock, createMedicine, createStaffAccount, fetchDashboardSummary,
  fetchMedicines, signOut, updateMedicine,
} from "./services/api.js";

const PAGE_SIZE = 8;
const FILTERS = [
  { key: "category", label: "Category" },
  { key: "prescription", label: "Prescription type" },
  { key: "stock", label: "Stock level" },
  { key: "expiry", label: "Expiry status" },
];
const EMPTY_MEDICINE = {
  name: "", genericName: "", brandName: "", sku: "", dosageStrength: "",
  category: "", description: "", unitPrice: "", costPrice: "",
  prescriptionRequired: false, storageRequirements: "", reorderThreshold: 20,
};

function App() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("inventory");
  const [staff, setStaff] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("medstock-user")) || null;
    } catch {
      return null;
    }
  });
  const [medicines, setMedicines] = useState([]);
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [filters, setFilters] = useState({ category: "", prescription: "", stock: "", expiry: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState("");
  const [form, setForm] = useState(EMPTY_MEDICINE);
  const [staffAccountBusy, setStaffAccountBusy] = useState(false);
  const [adjustment, setAdjustment] = useState({ direction: "receive", quantity: "", batchNumber: "", expirationDate: "" });
  const [busy, setBusy] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const requestParams = useMemo(() => ({
    page, size: PAGE_SIZE, search: query.trim() || undefined,
    category: filters.category || undefined, prescription: filters.prescription || undefined,
    stock: filters.stock || undefined,
    expiry: activeTab === "all" ? filters.expiry || undefined : activeTab,
  }), [page, query, filters, activeTab]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [inventory, dashboard] = await Promise.all([
        fetchMedicines(requestParams), fetchDashboardSummary(),
      ]);
      setMedicines(inventory.content || []);
      setTotalPages(inventory.totalPages || 0);
      setTotalElements(inventory.totalElements || 0);
      setSummary(dashboard);
      setCategories(dashboard.categories || []);
      setSelectedMedicine((current) => current
        ? inventory.content?.find((medicine) => medicine.id === current.id) || current
        : inventory.content?.[0] || null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not connect to MedStock. Check the backend and database, then retry.");
    } finally {
      setLoading(false);
    }
  }, [requestParams]);

  useEffect(() => {
    const timer = window.setTimeout(loadData, query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [loadData, query]);

  useEffect(() => {
    function onKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.querySelector("#medicine-search")?.focus();
      }
      if (event.key === "Escape") setModal("");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  };
  const handleLogout = () => {
    signOut();
    setStaff(null);
    navigate("/login", { replace: true });
  };
  const staffName = staff?.username || "MedStock staff";
  const staffRole = staff?.role?.replace("ROLE_", "").replaceAll("_", " ").toLowerCase();
  const staffInitials = staffName === "MedStock staff"
    ? "MS"
    : staffName
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  const changeFilter = (key, value) => {
    setPage(0);
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const goToSection = (section) => {
    setActiveSection(section);
    setMobileNavOpen(false);
    if (section === "inventory") setActiveTab("all");
  };
  const beginCreate = () => {
    setSelectedMedicine(null);
    setForm(EMPTY_MEDICINE);
    setModal("create-medicine");
  };
  const beginEdit = (medicine) => {
    setSelectedMedicine(medicine);
    setForm({
      name: medicine.name || "", genericName: medicine.genericName || "",
      brandName: medicine.brandName || "", sku: medicine.sku || "",
      dosageStrength: medicine.dosageStrength || "", category: medicine.category || "",
      description: medicine.description || "", unitPrice: medicine.unitPrice ?? "",
      costPrice: medicine.costPrice ?? "", prescriptionRequired: Boolean(medicine.prescriptionRequired),
      storageRequirements: medicine.storageRequirements || "", reorderThreshold: medicine.reorderThreshold ?? 20,
    });
    setModal("edit-medicine");
  };

  async function submitMedicine(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, unitPrice: Number(form.unitPrice), costPrice: Number(form.costPrice || 0), reorderThreshold: Number(form.reorderThreshold) };
      if (modal === "edit-medicine") {
        await updateMedicine(selectedMedicine.id, payload);
        showToast("Medicine details saved.");
      } else {
        await createMedicine(payload);
        showToast("Medicine added to inventory.");
      }
      setModal("");
      await loadData();
    } catch (requestError) {
      showToast(requestError.response?.data?.message || "Could not save medicine. Check your staff sign-in and the form.");
    } finally {
      setBusy(false);
    }
  }

  async function submitAdjustment(event) {
    event.preventDefault();
    if (!selectedMedicine) return;
    setBusy(true);
    try {
      await adjustStock(selectedMedicine.id, { ...adjustment, quantity: Number(adjustment.quantity) });
      setModal("");
      setAdjustment({ direction: "receive", quantity: "", batchNumber: "", expirationDate: "" });
      showToast("Stock movement recorded.");
      await loadData();
    } catch (requestError) {
      showToast(requestError.response?.data?.message || "Could not adjust stock. Check your staff sign-in and batch details.");
    } finally {
      setBusy(false);
    }
  }

  async function submitStaffAccount(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setStaffAccountBusy(true);
    try {
      const account = await createStaffAccount(values.get("username"), values.get("password"));
      setModal("");
      showToast(`Worker account created for ${account.username}.`);
    } catch (requestError) {
      showToast(requestError.response?.data?.message || "Could not create worker account.");
    } finally {
      setStaffAccountBusy(false);
    }
  }

  async function handleArchive(medicine) {
    if (!window.confirm(`Archive ${medicine.name}? It will be hidden from active inventory while historical records are retained.`)) return;
    try {
      await archiveMedicine(medicine.id);
      setSelectedMedicine(null);
      showToast("Medicine archived.");
      await loadData();
    } catch (requestError) {
      showToast(requestError.response?.data?.message || "Could not archive medicine.");
    }
  }

  function exportInventory() {
    if (!medicines.length) return showToast("There are no medicines on this page to export.");
    const columns = ["Name", "Generic name", "SKU", "Category", "Stock", "Expiry", "Unit price"];
    const values = medicines.map((medicine) => [medicine.name, medicine.genericName, medicine.sku, medicine.category, medicine.availableStock, medicine.nextExpiryDate, medicine.unitPrice]);
    const csv = [columns, ...values].map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "medicine-inventory.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-shell min-h-screen bg-slate-50 text-slate-800">
      <aside className={`sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
        <a className="brand" href="#inventory" aria-label="MedStock home"><span className="brand-mark"><Package size={23} strokeWidth={2.2} /></span><span className="brand-name">MedStock<small>ENTERPRISE</small></span></a>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          <button className="nav-item" onClick={() => goToSection("inventory")}><LayoutDashboard /><span>Dashboard</span></button>
          <button className={`nav-item ${activeSection === "inventory" && activeTab === "all" ? "active" : ""}`} aria-current={activeSection === "inventory" && activeTab === "all" ? "page" : undefined} onClick={() => goToSection("inventory")}><Boxes /><span>Medicine Inventory</span></button>
          <button className={`nav-item ${activeSection === "inventory" && activeTab !== "all" ? "active" : ""}`} aria-current={activeSection === "inventory" && activeTab !== "all" ? "page" : undefined} onClick={() => { goToSection("inventory"); setActiveTab("expiring"); }}><CalendarDays /><span>Batch &amp; Expiry Tracker</span></button>
          <button className="nav-item" onClick={() => { goToSection("inventory"); changeFilter("category", ""); }}><ClipboardList /><span>Categories</span></button>
          <button className={`nav-item ${activeSection === "suppliers" ? "active" : ""}`} aria-current={activeSection === "suppliers" ? "page" : undefined} onClick={() => goToSection("suppliers")}><Truck /><span>Suppliers</span></button>
          <button className={`nav-item ${activeSection === "orders" ? "active" : ""}`} aria-current={activeSection === "orders" ? "page" : undefined} onClick={() => goToSection("orders")}><ShoppingCart /><span>Purchase Orders</span></button>
          <button className={`nav-item ${activeSection === "sales" ? "active" : ""}`} aria-current={activeSection === "sales" ? "page" : undefined} onClick={() => goToSection("sales")}><Stethoscope /><span>Dispense &amp; Sales History</span></button>
          <button className={`nav-item ${activeSection === "reports" ? "active" : ""}`} aria-current={activeSection === "reports" ? "page" : undefined} onClick={() => goToSection("reports")}><LayoutDashboard /><span>Reports &amp; Analytics</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><strong>Need assistance?</strong><p>Our team is here to help you.</p><a href="mailto:support@medstock.example">Visit support center <span>›</span></a></div>
          <button className="nav-item settings-link" onClick={() => staff?.role === "ROLE_ADMINISTRATOR" ? setModal("create-staff") : navigate("/login")}><Settings /><span>{staff?.role === "ROLE_ADMINISTRATOR" ? "Manage staff" : "Switch account"}</span></button>
          <div className="profile"><span className="avatar">{staffInitials}</span><span className="profile-text"><strong>{staffName}</strong><small>{staffRole ? staffRole.charAt(0).toUpperCase() + staffRole.slice(1) : "Inventory workspace"}</small></span><button className="icon-button profile-menu" aria-label="Sign out" title="Sign out" onClick={handleLogout}><LogOut size={14} /></button></div>
        </div>
      </aside>

      <main className="workspace min-w-0">
        <header className="topbar">
          {activeSection === "inventory" ? <label className="global-search"><Search size={15} aria-hidden="true" /><input id="medicine-search" type="search" value={query} onChange={(event) => { setPage(0); setQuery(event.target.value); }} placeholder="Search medicines by name, SKU, or batch number..." aria-label="Search medicines" /><kbd>⌘ K</kbd></label> : <div className="topbar-page-label">{activeSection === "suppliers" ? "Suppliers" : activeSection === "orders" ? "Purchase Orders" : activeSection === "sales" ? "Dispense & Sales History" : "Reports & Analytics"}</div>}
          <div className="topbar-actions"><span className="online-status"><i /> Pharmacy Main #04 · Online</span><button className="icon-button notification-button" aria-label="Show expiring medicines" onClick={() => { goToSection("inventory"); setActiveTab("expiring"); }}><Bell size={15} /><i /></button>{activeSection === "inventory" && <button className="button button-primary add-stock" onClick={beginCreate}><Plus size={14} />Add New Stock</button>}<span className="workspace-switch">Workspace / {activeSection === "inventory" ? "Inventory" : activeSection === "suppliers" ? "Suppliers" : activeSection === "orders" ? "Purchase Orders" : activeSection === "sales" ? "Sales" : "Reports"} <ChevronDown size={11} /></span><button className="mobile-menu icon-button" aria-label="Toggle navigation" onClick={() => setMobileNavOpen((open) => !open)}><Menu size={18} /></button></div>
        </header>

        {activeSection === "inventory" ? <div className={`content ${selectedMedicine ? "" : "details-closed"}`}>
          <section className="main-column" id="inventory">
            <div className="breadcrumb">WORKSPACE <span>/</span> MEDICINE INVENTORY</div>
            <div className="page-heading"><div><h1>Inventory overview</h1><p>A clear view of your medicines, stock health, and upcoming expirations.</p></div><div className="last-updated">Updated just now<br /><span>Inventory synced with database</span></div></div>
            <section className="summary-grid" aria-label="Inventory summary">
              <SummaryCard title="Low Stock Alerts" value={summary?.lowStockCount} helper="Below reorder threshold" tone="amber" icon={<AlertTriangle size={13} />} badge={summary?.lowStockCount ? "Action needed" : null} />
              <SummaryCard title="Expiring Soon (30 Days)" value={summary?.expiringSoonCount} helper="Batches require attention" tone="red" icon={<CalendarDays size={13} />} badge={summary?.expiringSoonCount ? "Review batches" : null} />
              <SummaryCard title="Total Inventory Value" value={summary ? formatCurrency(summary.inventoryValue) : "—"} helper="Calculated from active batches" icon={<Package size={13} />} />
            </section>
            <section className="inventory-card">
              <div className="inventory-heading"><div><h2>Medicine inventory <span className="count-badge">{totalElements.toLocaleString()} items</span></h2><p>Manage stock levels, batches, and availability across your pharmacy.</p></div><button className="button button-outline export-button" onClick={exportInventory}><Download size={12} />Export</button></div>
              <div className="filter-row">{FILTERS.map(({ key, label }) => <label className="select-wrap" key={key}>
                <select aria-label={`Filter by ${label.toLowerCase()}`} value={filters[key]} onChange={(event) => changeFilter(key, event.target.value)}>
                  <option value="">{label}</option>
                  {key === "category" && categories.map((category) => <option value={category} key={category}>{category}</option>)}
                  {key === "prescription" && <><option value="true">Prescription</option><option value="false">Over-the-counter</option></>}
                  {key === "stock" && <><option value="low">Low stock</option><option value="healthy">Healthy</option></>}
                  {key === "expiry" && <><option value="soon">Expiring soon</option><option value="expired">Expired</option><option value="ok">Good shelf life</option></>}
                </select>
              </label>)}</div>
              <div className="table-toolbar"><div className="table-tabs" role="tablist" aria-label="Inventory views">{[["all", "All medicines"], ["low", "Low stock"], ["expiring", "Expiring soon"], ["expired", "Expired"]].map(([key, label]) => <button className={`table-tab ${activeTab === key ? "selected" : ""}`} role="tab" aria-selected={activeTab === key} key={key} onClick={() => { setPage(0); setActiveTab(key); }}>{label}</button>)}</div><span className="showing-count">{loading ? "Loading inventory…" : `Showing ${medicines.length} medicines`}</span></div>
              {error && <div className="api-error" role="alert"><AlertTriangle size={15} /><span>{error}</span><button onClick={loadData}>Retry</button></div>}
              <div className="table-scroll"><table><thead><tr><th>Medicine &amp; dosage</th><th>SKU / Barcode</th><th>Category</th><th>Batch no.</th><th>Stock level</th><th>Expiry date</th><th>Unit price</th><th>Actions</th></tr></thead>
                <tbody>{!loading && !error && medicines.map((medicine) => <MedicineRow key={medicine.id} medicine={medicine} selected={medicine.id === selectedMedicine?.id} onSelect={() => setSelectedMedicine(medicine)} onEdit={() => beginEdit(medicine)} onAdjust={() => { setSelectedMedicine(medicine); setModal("adjustment"); }} onArchive={() => handleArchive(medicine)} />)}</tbody>
              </table>{!loading && !error && medicines.length === 0 && <p className="empty-state">No medicines match these filters. Add a medicine or adjust your search.</p>}{loading && <p className="empty-state">Loading medicines from MongoDB…</p>}</div>
              <div className="pagination"><span>Page {totalPages ? page + 1 : 0} of {totalPages} · {totalElements.toLocaleString()} medicines</span><div className="page-controls"><label>Rows per page <select value={PAGE_SIZE} disabled aria-label="Rows per page"><option>{PAGE_SIZE}</option></select></label><button aria-label="Previous page" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}><ChevronLeft size={12} /></button><button className="current-page">{totalPages ? page + 1 : 0}</button><button aria-label="Next page" disabled={page + 1 >= totalPages} onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}><ChevronRight size={12} /></button></div></div>
            </section>
            <footer className="content-footer"><div><ShieldCheck className="footer-icon" size={14} /><strong>Inventory integrity</strong><p>All stock movements are securely logged and traceable.</p></div><div className="sync-note"><Check size={11} /> Auto-sync enabled<br /><span>Data served by MongoDB</span></div></footer>
          </section>
          {selectedMedicine && <MedicineDetails medicine={selectedMedicine} onClose={() => setSelectedMedicine(null)} onAdjust={() => setModal("adjustment")} onEdit={() => beginEdit(selectedMedicine)} />}
        </div> : <div className="content details-closed module-content"><section className="main-column"><ModulePages section={activeSection} medicines={medicines} summary={summary} onInventoryChanged={loadData} onNavigate={goToSection} showToast={showToast} /></section></div>}
      </main>

      {(modal === "create-medicine" || modal === "edit-medicine") && <Modal title={modal === "edit-medicine" ? "Edit medicine" : "Add medicine"} onClose={() => setModal("")}><form className="modal-form" onSubmit={submitMedicine}>
        <div className="form-grid"><Field label="Medicine name" name="name" value={form.name} required onChange={setForm} /><Field label="SKU / barcode" name="sku" value={form.sku} required onChange={setForm} /><Field label="Generic name" name="genericName" value={form.genericName} onChange={setForm} /><Field label="Brand name" name="brandName" value={form.brandName} onChange={setForm} /><Field label="Dosage / strength" name="dosageStrength" value={form.dosageStrength} onChange={setForm} /><label className="field-label">Category<select required value={form.category} onChange={(event) => setForm((value) => ({ ...value, category: event.target.value }))}><option value="">Select category</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><Field label="Selling price" name="unitPrice" type="number" min="0" step="0.01" value={form.unitPrice} required onChange={setForm} /><Field label="Cost price" name="costPrice" type="number" min="0" step="0.01" value={form.costPrice} onChange={setForm} /><Field label="Reorder threshold" name="reorderThreshold" type="number" min="0" value={form.reorderThreshold} onChange={setForm} /><Field label="Storage requirements" name="storageRequirements" value={form.storageRequirements} onChange={setForm} /></div>
        <label className="checkbox-field"><input type="checkbox" checked={form.prescriptionRequired} onChange={(event) => setForm((value) => ({ ...value, prescriptionRequired: event.target.checked }))} />Prescription required</label><label className="field-label">Description<textarea rows="3" value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} /></label>
        {modal === "create-medicine" && <p className="form-hint">Add the medicine record first, then receive stock as a dated batch using Adjust stock.</p>}
        <div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setModal("")}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Save medicine"}</button></div>
      </form></Modal>}

      {modal === "adjustment" && selectedMedicine && <Modal title={`Adjust stock · ${selectedMedicine.name}`} onClose={() => setModal("")}><form className="modal-form" onSubmit={submitAdjustment}>
        <label className="field-label">Adjustment type<select value={adjustment.direction} onChange={(event) => setAdjustment((value) => ({ ...value, direction: event.target.value }))}><option value="receive">Receive stock</option><option value="dispense">Dispense stock (FEFO)</option></select></label>
        <Field label="Quantity" name="quantity" type="number" min="1" value={adjustment.quantity} required onChange={setAdjustment} />
        {adjustment.direction === "receive" && <><Field label="Batch number" name="batchNumber" value={adjustment.batchNumber} required onChange={setAdjustment} /><Field label="Expiration date" name="expirationDate" type="date" value={adjustment.expirationDate} required onChange={setAdjustment} /></>}
        <p className="form-hint">{adjustment.direction === "dispense" ? "Quantity is deducted from the earliest-expiring eligible batches. Expired stock cannot be dispensed." : "A new batch and an auditable stock movement will be recorded."}</p>
        <div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setModal("")}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Recording…" : "Record adjustment"}</button></div>
      </form></Modal>}

      {modal === "create-staff" && staff?.role === "ROLE_ADMINISTRATOR" && <Modal title="Create worker account" onClose={() => setModal("")}><form className="modal-form" onSubmit={submitStaffAccount}>
        <p className="form-hint">Create a pharmacist account for a worker. Share the username and password with them securely.</p>
        <Field label="Worker username" name="username" required minLength="3" maxLength="120" pattern="[a-zA-Z0-9][a-zA-Z0-9._@+-]*" autoComplete="off" />
        <Field label="Temporary password" name="password" type="password" required minLength="8" maxLength="72" autoComplete="new-password" />
        <div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setModal("")}>Cancel</button><button className="button button-primary" disabled={staffAccountBusy}>{staffAccountBusy ? "Creating…" : "Create account"}</button></div>
      </form></Modal>}

      <div className={`toast ${toast ? "visible" : ""}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}

function SummaryCard({ title, value, helper, tone, icon, badge }) {
  return <article className="summary-card"><div className="summary-label">{title}<span className={tone ? `${tone}-icon` : "summary-icon"}>{icon}</span></div><div className="summary-value">{value ?? "—"}{badge && <span className={`pill pill-${tone}`}>{badge}</span>}</div><p>{helper}</p></article>;
}

function MedicineRow({ medicine, selected, onSelect, onEdit, onAdjust, onArchive }) {
  const category = medicine.category || "Uncategorized";
  const stock = medicine.availableStock ?? 0;
  const low = stock <= (medicine.reorderThreshold ?? 0);
  const fill = Math.min(100, medicine.reorderThreshold > 0 ? stock / (medicine.reorderThreshold * 4) * 100 : stock ? 75 : 0);
  return <tr className={selected ? "row-selected" : ""} onClick={onSelect}>
    <td><strong>{medicine.name}</strong><small>{medicine.dosageStrength || medicine.genericName || "Medicine"}</small></td><td>{medicine.sku}</td><td><span className={`category-tag ${categoryTone(category)}`}>{category}</span></td><td>{medicine.nextBatchNumber || "—"}</td><td><div className={`stock-cell ${low ? "low" : ""}`}><b>{stock.toLocaleString()} units</b><span className="stock-bar"><i style={{ width: `${fill}%` }} /></span></div></td><td><span className={["soon", "expired"].includes(medicine.expiryStatus) ? "date-soon" : "date-good"}>{medicine.nextExpiryDate || "—"}</span></td><td>{formatCurrency(medicine.unitPrice)}</td>
    <td className="action-cell"><button className="edit-button" aria-label={`Edit ${medicine.name}`} onClick={(event) => { event.stopPropagation(); onEdit(); }}><Pencil size={10} /></button><button className="reorder-button" onClick={(event) => { event.stopPropagation(); onAdjust(); }}>{low ? "Reorder" : "Adjust"}</button><button className="dots-button" aria-label={`Archive ${medicine.name}`} onClick={(event) => { event.stopPropagation(); onArchive(); }}><MoreHorizontal size={12} /></button></td>
  </tr>;
}

function MedicineDetails({ medicine, onClose, onAdjust, onEdit }) {
  return <aside className="details-panel" aria-label="Selected medicine details">
    <div className="details-header"><span>MEDICINE DETAILS</span><button className="icon-button close-details" aria-label="Close medicine details" onClick={onClose}><X size={14} /></button></div>
    <div className="detail-body">
      <div className="detail-actions"><button className="icon-button" aria-label="Edit medicine" onClick={onEdit}><Pencil size={12} /></button><span className="category-tag purple">{medicine.category || "Uncategorized"}</span></div>
      <h2>{medicine.name}</h2><p className="detail-subtitle">{medicine.dosageStrength || medicine.genericName || "Medicine"}<br />SKU: {medicine.sku}</p>
      {["soon", "expired"].includes(medicine.expiryStatus) && <div className="expiry-alert"><span className="alert-symbol"><AlertTriangle size={12} /></span><div><strong>{medicine.expiringQuantity || medicine.availableStock} units {medicine.expiryStatus === "expired" ? "are expired" : "expire soon"}</strong><p>{medicine.nextBatchNumber || "Batch"} · Expires {formatDate(medicine.nextExpiryDate)}</p></div></div>}
      <div className="detail-stats"><div><span>Current stock</span><strong>{(medicine.availableStock ?? 0).toLocaleString()} <small>units</small></strong></div><div><span>Inventory value</span><strong>{formatCurrency(medicine.inventoryValue)}</strong></div></div>
      <section className="detail-section storage-section"><h3>Storage requirements</h3><div className="storage-box"><Thermometer size={14} className="thermometer" /><div><strong>{medicine.storageRequirements || "No storage requirements set"}</strong><p>Follow the product label and pharmacy policy.</p></div></div></section>
      <section className="detail-section supplier-section"><h3>Supplier</h3><div className="supplier-name">{medicine.supplierName || "No supplier assigned"}</div>{medicine.supplierEmail && <p className="supplier-contact">{medicine.supplierEmail}</p>}</section>
      <section className="detail-section batch-section"><div className="section-title-row"><h3>Batch breakdown</h3><button className="text-button" onClick={onAdjust}>Adjust stock</button></div>
        {medicine.batches?.length ? medicine.batches.map((batch) => <div className={`batch-item ${["soon", "expired"].includes(batch.expiryStatus) ? "alert-batch" : ""}`} key={batch.id}><div><strong>{batch.batchNumber}</strong><span>{batch.currentQuantity} units · Expires {formatDate(batch.expirationDate)}</span></div><b>{batch.status}</b></div>) : <div className="batch-item"><div><strong>No active batches</strong><span>Receive stock to add a batch.</span></div></div>}
      </section>
      <section className="detail-section adjustment-section"><div className="section-title-row"><h3>Stock adjustment log</h3></div>{medicine.recentMovements?.length ? medicine.recentMovements.map((movement) => <div className="adjustment-row" key={movement.id}><span><i className={`log-dot ${movement.quantityDelta > 0 ? "green-dot" : "red-dot"}`} /><strong>{movement.movementType}</strong><small>{formatDateTime(movement.createdAt)} · {movement.note || "Inventory adjustment"}</small></span><b className={movement.quantityDelta > 0 ? "increase" : "decrease"}>{movement.quantityDelta > 0 ? "+" : ""}{movement.quantityDelta}</b></div>) : <p className="empty-log">No stock movements recorded.</p>}</section>
    </div>
    <div className="detail-footer"><button className="button button-primary adjust-button" onClick={onAdjust}><ArrowDownToLine size={12} />Adjust stock</button><button className="button button-outline reorder-detail" onClick={onEdit}>Edit</button></div>
  </aside>;
}

function Modal({ title, onClose, children }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header className="modal-header"><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={15} /></button></header>{children}</section></div>;
}

function Field({ label, name, type = "text", value, onChange, ...attributes }) {
  const controlled = value !== undefined;
  return <label className="field-label">{label}<input name={name} type={type} {...(controlled ? { value } : {})} onChange={onChange ? (event) => onChange((current) => ({ ...current, [name]: event.target.value })) : undefined} {...attributes} /></label>;
}
function categoryTone(category) {
  if (/chronic|diabet|cardiac/i.test(category)) return "purple";
  if (/antibi|analgesi|pain/i.test(category)) return "blue";
  return "green";
}
function formatCurrency(value) {
  if (value === null || value === undefined || value === "") return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value));
}
function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
function formatDateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default App;
