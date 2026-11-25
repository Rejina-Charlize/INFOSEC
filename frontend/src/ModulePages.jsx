import { lazy, Suspense, useMemo, useState } from "react";
import {
  ArrowDownToLine, ArrowUpRight, Boxes, Building2, CalendarDays, Check,
  ClipboardList, Download, FileText, Mail, Package, Pencil, Plus, Search,
  ShoppingCart, Stethoscope, Truck, X,
} from "lucide-react";
import { adjustStock } from "./services/api.js";

const ReportCharts = lazy(() => import("./ReportCharts.jsx"));
const today = new Date().toISOString().slice(0, 10);
const initialSuppliers = [
  { id: "sup-001", name: "Northstar Medical Supply", contact: "Maya Chen", email: "orders@northstarmed.example", phone: "+1 (555) 010-2400", products: 18, status: "Active" },
  { id: "sup-002", name: "WellSpring Pharma", contact: "Daniel Reyes", email: "sales@wellspring.example", phone: "+1 (555) 010-3812", products: 12, status: "Active" },
  { id: "sup-003", name: "Cedar Health Distribution", contact: "Olivia Martin", email: "olivia@cedarhealth.example", phone: "+1 (555) 010-6105", products: 9, status: "Active" },
  { id: "sup-004", name: "MetroCare Wholesale", contact: "Ethan Brooks", email: "orders@metrocare.example", phone: "+1 (555) 010-7750", products: 7, status: "Pending" },
];
const initialOrders = [
  { id: "PO-2026-0104", supplier: "Northstar Medical Supply", date: "2026-11-23", expected: "2026-11-30", items: 4, total: 1240.00, status: "Submitted" },
  { id: "PO-2026-0103", supplier: "WellSpring Pharma", date: "2026-11-21", expected: "2026-11-28", items: 2, total: 685.50, status: "Draft" },
  { id: "PO-2026-0102", supplier: "Cedar Health Distribution", date: "2026-11-18", expected: "2026-11-26", items: 3, total: 912.00, status: "Partially received" },
  { id: "PO-2026-0101", supplier: "Northstar Medical Supply", date: "2026-11-12", expected: "2026-11-19", items: 5, total: 1530.00, status: "Received" },
];
const initialSales = [
  { id: "TX-8421", date: "2026-11-25T09:32:00", medicine: "Paracetamol Tablets", sku: "DEMO-PARA-500", quantity: 2, amount: 9.00, staff: "A. Cruz", status: "Completed", sample: true },
  { id: "TX-8420", date: "2026-11-25T08:54:00", medicine: "Cetirizine Tablets", sku: "DEMO-CET-10", quantity: 1, amount: 5.50, staff: "A. Cruz", status: "Completed", sample: true },
  { id: "TX-8419", date: "2026-11-24T16:18:00", medicine: "Ibuprofen Tablets", sku: "DEMO-IBU-200", quantity: 3, amount: 18.00, staff: "J. Patel", status: "Completed", sample: true },
  { id: "TX-8418", date: "2026-11-24T14:06:00", medicine: "Metformin Tablets", sku: "DEMO-MET-500", quantity: 1, amount: 8.00, staff: "J. Patel", status: "Completed", sample: true },
  { id: "TX-8417", date: "2026-11-23T11:42:00", medicine: "Amoxicillin Capsules", sku: "DEMO-AMOX-500", quantity: 2, amount: 25.00, staff: "A. Cruz", status: "Completed", sample: true },
];

function storedState(key, initialValue) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : initialValue;
  } catch {
    return initialValue;
  }
}

function saveRecords(key, records) {
  try {
    localStorage.setItem(key, JSON.stringify(records));
  } catch {
    return false;
  }
  return true;
}

export default function ModulePages({ section, medicines, summary, onInventoryChanged, showToast, onNavigate }) {
  const [suppliers, setSuppliers] = useState(() => storedState("medstock-demo-suppliers", initialSuppliers));
  const [orders, setOrders] = useState(() => storedState("medstock-demo-orders", initialOrders));
  const [sales, setSales] = useState(() => storedState("medstock-demo-sales", initialSales));
  const [supplierModal, setSupplierModal] = useState(null);
  const [orderModal, setOrderModal] = useState(false);
  const [dispenseModal, setDispenseModal] = useState(false);

  function updateSuppliers(next) {
    setSuppliers(next);
    if (!saveRecords("medstock-demo-suppliers", next)) showToast("Browser storage is unavailable; this change may not persist.");
  }
  function updateOrders(next) {
    setOrders(next);
    if (!saveRecords("medstock-demo-orders", next)) showToast("Browser storage is unavailable; this change may not persist.");
  }
  function updateSales(next) {
    setSales(next);
    if (!saveRecords("medstock-demo-sales", next)) showToast("Browser storage is unavailable; this change may not persist.");
  }

  const pageInfo = {
    suppliers: { title: "Suppliers", subtitle: "Manage supplier contacts and keep your purchasing partners organized.", icon: <Truck size={17} /> },
    orders: { title: "Purchase orders", subtitle: "Create and track replenishment orders for your pharmacy.", icon: <ShoppingCart size={17} /> },
    sales: { title: "Dispense & sales history", subtitle: "Review dispensing activity and record stock deductions.", icon: <Stethoscope size={17} /> },
    reports: { title: "Reports & analytics", subtitle: "Review inventory health and operational trends at a glance.", icon: <ClipboardList size={17} /> },
  }[section];

  return (
    <section className={`module-page module-${section}`}>
      <div className="module-breadcrumb">WORKSPACE <span>/</span> {pageInfo.title.toUpperCase()}</div>
      <div className="page-heading module-heading">
        <div><h1>{pageInfo.title}</h1><p>{pageInfo.subtitle}</p></div>
        <span className="module-heading-icon">{pageInfo.icon}</span>
      </div>
      <div className="demo-notice"><FileText size={14} /><span><strong>Interface preview:</strong> supplier and purchase-order records are saved in this browser only. The sample sales and report trends are illustrative; dispensing deductions update MongoDB inventory.</span></div>

      {section === "suppliers" && <SuppliersPage
        suppliers={suppliers}
        onAdd={() => setSupplierModal({})}
        onEdit={(supplier) => setSupplierModal(supplier)}
        onToggle={(supplier) => updateSuppliers(suppliers.map((item) => item.id === supplier.id
          ? { ...item, status: item.status === "Active" ? "Inactive" : "Active" } : item))}
        onPurchase={() => { onNavigate("orders"); setOrderModal(true); }}
      />}
      {section === "orders" && <OrdersPage orders={orders} suppliers={suppliers} onCreate={() => setOrderModal(true)}
        onStatus={(order, status) => updateOrders(orders.map((item) => item.id === order.id ? { ...item, status } : item))} />}
      {section === "sales" && <SalesPage sales={sales} medicines={medicines} onRecord={() => setDispenseModal(true)} />}
      {section === "reports" && <ReportsPage medicines={medicines} summary={summary} />}

      {supplierModal && <SupplierForm supplier={supplierModal} onClose={() => setSupplierModal(null)} onSave={(record) => {
        const exists = suppliers.some((supplier) => supplier.id === record.id);
        const next = exists ? suppliers.map((supplier) => supplier.id === record.id ? record : supplier) : [record, ...suppliers];
        updateSuppliers(next);
        setSupplierModal(null);
        showToast(exists ? "Supplier details updated in this browser." : "Supplier added in this browser.");
      }} />}
      {orderModal && <OrderForm suppliers={suppliers} medicines={medicines} orderNumber={orders.length + 1} onClose={() => setOrderModal(false)} onSave={(order) => {
        updateOrders([order, ...orders]);
        setOrderModal(false);
        showToast("Purchase order saved in this browser preview.");
      }} />}
      {dispenseModal && <DispenseForm medicines={medicines} onClose={() => setDispenseModal(false)} onSave={async (medicine, quantity, note) => {
        await adjustStock(medicine.id, { direction: "dispense", quantity, note });
        const next = [{
          id: `TX-${Date.now().toString().slice(-6)}`,
          date: new Date().toISOString().slice(0, 19),
          medicine: medicine.name,
          sku: medicine.sku,
          quantity,
          amount: Number(medicine.unitPrice) * quantity,
          staff: JSON.parse(sessionStorage.getItem("medstock-user") || "{}").username || "Staff",
          status: "Completed",
          sample: false,
        }, ...sales];
        updateSales(next);
        await onInventoryChanged();
        setDispenseModal(false);
        showToast("Dispense recorded; MongoDB stock has been updated.");
      }} />}
    </section>
  );
}

function SuppliersPage({ suppliers, onAdd, onEdit, onToggle, onPurchase }) {
  const [query, setQuery] = useState("");
  const filtered = suppliers.filter((supplier) => [supplier.name, supplier.contact, supplier.email]
    .some((value) => value.toLowerCase().includes(query.toLowerCase())));
  const activeCount = suppliers.filter((supplier) => supplier.status === "Active").length;
  return <>
    <div className="module-stats">
      <MetricCard title="Total suppliers" value={suppliers.length} caption="In your supplier list" icon={<Building2 size={16} />} />
      <MetricCard title="Active suppliers" value={activeCount} caption="Available for orders" icon={<Check size={16} />} />
      <MetricCard title="Products supplied" value={suppliers.reduce((sum, supplier) => sum + Number(supplier.products || 0), 0)} caption="Across all suppliers" icon={<Package size={16} />} />
    </div>
    <div className="module-card">
      <div className="module-card-heading"><div><h2>Supplier directory <span className="count-badge">{suppliers.length} records</span></h2><p>Supplier contacts shown here are sample browser data until supplier storage is connected.</p></div><button className="button button-primary" onClick={onAdd}><Plus size={13} />Add supplier</button></div>
      <div className="module-toolbar"><label className="module-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search supplier or contact..." /></label><span>{filtered.length} suppliers</span></div>
      <div className="module-table-wrap"><table className="module-table"><thead><tr><th>Supplier</th><th>Contact</th><th>Email / phone</th><th>Products</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {filtered.map((supplier) => <tr key={supplier.id}><td><div className="primary-cell"><span className="table-avatar"><Building2 size={15} /></span><strong>{supplier.name}</strong></div></td><td>{supplier.contact}</td><td><a className="contact-link" href={`mailto:${supplier.email}`}><Mail size={12} />{supplier.email}</a><small className="secondary-line">{supplier.phone}</small></td><td>{supplier.products}</td><td><StatusPill value={supplier.status} /></td><td><div className="table-actions"><button className="text-button" onClick={() => onEdit(supplier)}><Pencil size={12} />Edit</button><button className="text-button" onClick={() => onToggle(supplier)}>{supplier.status === "Active" ? "Deactivate" : "Activate"}</button></div></td></tr>)}
      </tbody></table>{filtered.length === 0 && <EmptyState title="No suppliers found" text="Try a different search, or add a new supplier." />}</div>
    </div>
    <div className="module-bottom-callout"><span><Truck size={17} /><strong>Ready to restock?</strong><small>Start a purchase order with one of your active suppliers.</small></span><button className="button button-outline" onClick={onPurchase}>Create purchase order <ArrowUpRight size={13} /></button></div>
  </>;
}

function OrdersPage({ orders, suppliers, onCreate, onStatus }) {
  const [statusFilter, setStatusFilter] = useState("All");
  const filtered = orders.filter((order) => statusFilter === "All" || order.status === statusFilter);
  const pending = orders.filter((order) => ["Submitted", "Partially received"].includes(order.status)).length;
  const outstanding = orders.filter((order) => order.status !== "Received").reduce((sum, order) => sum + Number(order.total), 0);
  return <>
    <div className="module-stats">
      <MetricCard title="Open orders" value={pending} caption="Submitted or partially received" icon={<ShoppingCart size={16} />} />
      <MetricCard title="Awaiting receipt" value={orders.filter((order) => order.status === "Submitted").length} caption="Expected deliveries" icon={<CalendarDays size={16} />} />
      <MetricCard title="Open order value" value={formatCurrency(outstanding)} caption="Across non-received orders" icon={<Package size={16} />} />
    </div>
    <div className="module-card">
      <div className="module-card-heading"><div><h2>Purchase orders <span className="count-badge">{orders.length} records</span></h2><p>Track draft, submitted, and received replenishment orders.</p></div><button className="button button-primary" onClick={onCreate}><Plus size={13} />New purchase order</button></div>
      <div className="module-toolbar"><label className="module-filter">Order status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All</option><option>Draft</option><option>Submitted</option><option>Partially received</option><option>Received</option></select></label><span>{filtered.length} orders</span></div>
      <div className="module-table-wrap"><table className="module-table"><thead><tr><th>Order</th><th>Supplier</th><th>Created</th><th>Expected</th><th>Items</th><th>Total</th><th>Status</th><th>Update</th></tr></thead><tbody>
        {filtered.map((order) => <tr key={order.id}><td><strong className="order-id">{order.id}</strong></td><td>{order.supplier}</td><td>{formatDate(order.date)}</td><td>{formatDate(order.expected)}</td><td>{order.items}</td><td>{formatCurrency(order.total)}</td><td><StatusPill value={order.status} /></td><td><select className="inline-select" aria-label={`Update status for ${order.id}`} value={order.status} onChange={(event) => onStatus(order, event.target.value)}><option>Draft</option><option>Submitted</option><option>Partially received</option><option>Received</option></select></td></tr>)}
      </tbody></table>{filtered.length === 0 && <EmptyState title="No matching orders" text="Change the status filter or create a purchase order." />}</div>
    </div>
    <p className="module-footnote">These purchase orders are saved in this browser preview only; receiving an order does not automatically add inventory.</p>
    <OrderFormHint suppliers={suppliers} />
  </>;
}

function OrderFormHint({ suppliers }) {
  return <div className="module-inline-note"><Truck size={14} /> {suppliers.filter((supplier) => supplier.status === "Active").length} active suppliers are available when creating an order.</div>;
}

function SalesPage({ sales, medicines, onRecord }) {
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("All");
  const filtered = sales.filter((item) => {
    const matchesText = [item.id, item.medicine, item.sku, item.staff].some((value) => value.toLowerCase().includes(query.toLowerCase()));
    const matchesPeriod = period === "All" || item.date.slice(0, 10) === today;
    return matchesText && matchesPeriod;
  });
  const total = filtered.reduce((sum, record) => sum + Number(record.amount), 0);
  return <>
    <div className="module-stats">
      <MetricCard title="Transactions shown" value={filtered.length} caption="Includes illustrative sample rows" icon={<ClipboardList size={16} />} />
      <MetricCard title="Dispensed units" value={filtered.reduce((sum, record) => sum + record.quantity, 0)} caption="For the selected view" icon={<Stethoscope size={16} />} />
      <MetricCard title="Sales value shown" value={formatCurrency(total)} caption="Sample amounts are illustrative" icon={<Package size={16} />} />
    </div>
    <div className="module-card">
      <div className="module-card-heading"><div><h2>Dispense &amp; sales log <span className="count-badge">{sales.length} records</span></h2><p>Demo transactions are labeled; new dispenses deduct real available stock using FEFO.</p></div><button className="button button-primary" onClick={onRecord} disabled={!medicines.length}><Plus size={13} />Record dispense</button></div>
      <div className="module-toolbar"><label className="module-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search medicine, SKU, or staff..." /></label><label className="module-filter">Date<select value={period} onChange={(event) => setPeriod(event.target.value)}><option>All</option><option>Today</option></select></label><button className="button button-outline" onClick={() => downloadCsv("dispense-history.csv", ["Transaction", "Date", "Medicine", "SKU", "Quantity", "Amount", "Staff", "Record type"], filtered.map((item) => [item.id, item.date, item.medicine, item.sku, item.quantity, item.amount, item.staff, item.sample ? "Sample" : "Recorded"]))}><Download size={12} />Export</button></div>
      <div className="module-table-wrap"><table className="module-table"><thead><tr><th>Transaction</th><th>Date &amp; time</th><th>Medicine</th><th>SKU</th><th>Quantity</th><th>Amount</th><th>Handled by</th><th>Record</th></tr></thead><tbody>
        {filtered.map((record) => <tr key={record.id}><td><strong className="order-id">{record.id}</strong></td><td>{formatDateTime(record.date)}</td><td><strong>{record.medicine}</strong></td><td>{record.sku}</td><td>{record.quantity} units</td><td>{formatCurrency(record.amount)}</td><td>{record.staff}</td><td><StatusPill value={record.sample ? "Sample" : record.status} /></td></tr>)}
      </tbody></table>{filtered.length === 0 && <EmptyState title="No transactions found" text="Try another search or date filter." />}</div>
    </div>
  </>;
}

function ReportsPage({ medicines, summary }) {
  const categoryData = useMemo(() => {
    const grouped = medicines.reduce((result, medicine) => {
      const name = medicine.category || "Uncategorized";
      result[name] = (result[name] || 0) + Number(medicine.availableStock || 0);
      return result;
    }, {});
    return Object.entries(grouped).map(([name, stock]) => ({ name, stock }));
  }, [medicines]);
  const reportRows = medicines.map((medicine) => [
    medicine.name, medicine.sku, medicine.category, medicine.availableStock,
    medicine.reorderThreshold, medicine.nextExpiryDate, medicine.expiryStatus,
    Number(medicine.inventoryValue || 0).toFixed(2),
  ]);
  return <>
    <div className="report-source-note"><Check size={14} /><span><strong>Inventory indicators are live.</strong> Stock, reorder alerts, categories, and inventory value come from MongoDB. Sales trend is example data.</span></div>
    <div className="module-stats">
      <MetricCard title="Active medicines" value={summary?.totalMedicines ?? medicines.length} caption="In the current inventory page" icon={<Boxes size={16} />} />
      <MetricCard title="Low stock items" value={summary?.lowStockCount ?? "—"} caption="At or below reorder threshold" icon={<Package size={16} />} />
      <MetricCard title="Expiring soon" value={summary?.expiringSoonCount ?? "—"} caption="Within the next 30 days" icon={<CalendarDays size={16} />} />
      <MetricCard title="Inventory value" value={formatCurrency(summary?.inventoryValue)} caption="Based on available quantity" icon={<ArrowDownToLine size={16} />} />
    </div>
    <div className="reports-grid">
      <Suspense fallback={<div className="chart-loading">Loading report charts…</div>}><ReportCharts categoryData={categoryData} /></Suspense>
    </div>
    <section className="module-card report-table-card"><div className="module-card-heading"><div><h2>Inventory valuation &amp; expiry</h2><p>Download a CSV snapshot of the loaded inventory records.</p></div><button className="button button-outline" onClick={() => downloadCsv("medstock-inventory-report.csv", ["Medicine", "SKU", "Category", "Available units", "Reorder threshold", "Next expiry", "Expiry status", "Inventory value"], reportRows)}><Download size={12} />Export report</button></div><div className="module-table-wrap"><table className="module-table"><thead><tr><th>Medicine</th><th>Category</th><th>Available</th><th>Reorder at</th><th>Next expiry</th><th>Status</th><th>Inventory value</th></tr></thead><tbody>{medicines.map((medicine) => <tr key={medicine.id}><td><strong>{medicine.name}</strong><small>{medicine.sku}</small></td><td>{medicine.category}</td><td>{medicine.availableStock}</td><td>{medicine.reorderThreshold}</td><td>{formatDate(medicine.nextExpiryDate)}</td><td><StatusPill value={medicine.expiryStatus === "ok" ? "Healthy" : medicine.expiryStatus} /></td><td>{formatCurrency(medicine.inventoryValue)}</td></tr>)}</tbody></table>{!medicines.length && <EmptyState title="No inventory records" text="Inventory data will appear here when available." />}</div></section>
  </>;
}

function SupplierForm({ supplier, onClose, onSave }) {
  function submit(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    onSave({ id: supplier.id || `sup-${Date.now()}`, name: values.name.trim(), contact: values.contact.trim(), email: values.email.trim(), phone: values.phone.trim(), products: Number(values.products || 0), status: values.status });
  }
  return <Modal title={supplier.id ? "Edit supplier" : "Add supplier"} onClose={onClose}><form className="modal-form" onSubmit={submit}><div className="form-grid">
    <FormField label="Supplier name" name="name" defaultValue={supplier.name} required />
    <FormField label="Contact person" name="contact" defaultValue={supplier.contact} required />
    <FormField label="Email address" name="email" type="email" defaultValue={supplier.email} required />
    <FormField label="Phone number" name="phone" defaultValue={supplier.phone} required />
    <FormField label="Products supplied" name="products" type="number" min="0" defaultValue={supplier.products ?? 0} />
    <label className="field-label">Status<select name="status" defaultValue={supplier.status || "Active"}><option>Active</option><option>Pending</option><option>Inactive</option></select></label>
  </div><p className="form-hint">Supplier records are stored in this browser preview, not in MongoDB.</p><ModalActions onClose={onClose} submitText={supplier.id ? "Save changes" : "Add supplier"} /></form></Modal>;
}

function OrderForm({ suppliers, medicines, orderNumber, onClose, onSave }) {
  const activeSuppliers = suppliers.filter((supplier) => supplier.status === "Active");
  function submit(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const medicine = medicines.find((item) => item.id === values.medicineId);
    const supplier = activeSuppliers.find((item) => item.name === values.supplier);
    const quantity = Number(values.quantity);
    const cost = Number(values.cost);
    onSave({ id: `PO-LOCAL-${String(orderNumber).padStart(4, "0")}`, supplier: supplier?.name || values.supplier, date: today, expected: values.expected, items: 1, total: quantity * cost, status: "Draft", medicine: medicine?.name, quantity, unitCost: cost });
  }
  return <Modal title="Create purchase order" onClose={onClose}><form className="modal-form" onSubmit={submit}>
    <label className="field-label">Supplier<select name="supplier" required defaultValue=""><option value="" disabled>Select supplier</option>{activeSuppliers.map((supplier) => <option key={supplier.id}>{supplier.name}</option>)}</select></label>
    <label className="field-label">Medicine<select name="medicineId" required defaultValue=""><option value="" disabled>Select medicine</option>{medicines.map((medicine) => <option value={medicine.id} key={medicine.id}>{medicine.name} · {medicine.sku}</option>)}</select></label>
    <div className="form-grid"><FormField label="Quantity" name="quantity" type="number" min="1" defaultValue="24" required /><FormField label="Unit cost" name="cost" type="number" min="0" step="0.01" defaultValue="5.00" required /><FormField label="Expected delivery" name="expected" type="date" defaultValue={today} required /></div>
    <p className="form-hint">This creates a browser-only purchase order preview. It does not reserve stock or change inventory.</p><ModalActions onClose={onClose} submitText="Save draft order" />
  </form></Modal>;
}

function DispenseForm({ medicines, onClose, onSave }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const medicine = medicines.find((item) => item.id === values.medicineId);
    if (!medicine) return;
    setBusy(true);
    setError("");
    try {
      await onSave(medicine, Number(values.quantity), values.note.trim() || "Dispense recorded from sales history");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not record dispense. Check stock availability and try again.");
      setBusy(false);
    }
  }
  return <Modal title="Record dispense" onClose={onClose}><form className="modal-form" onSubmit={submit}>
    <label className="field-label">Medicine<select name="medicineId" required defaultValue=""><option value="" disabled>Select medicine</option>{medicines.map((medicine) => <option value={medicine.id} key={medicine.id}>{medicine.name} · {medicine.availableStock} available</option>)}</select></label>
    <FormField label="Quantity" name="quantity" type="number" min="1" defaultValue="1" required />
    <FormField label="Note (optional)" name="note" defaultValue="" maxLength="500" />
    <p className="form-hint">This uses the existing inventory dispense endpoint and subtracts from eligible batches in expiry order.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    <ModalActions onClose={onClose} submitText={busy ? "Recording…" : "Record dispense"} disabled={busy} />
  </form></Modal>;
}

function MetricCard({ title, value, caption, icon }) {
  return <article className="module-metric"><div><span>{title}</span><i>{icon}</i></div><strong>{value ?? "—"}</strong><small>{caption}</small></article>;
}

function StatusPill({ value }) {
  const kind = /received|completed|active|healthy/i.test(value) ? "good"
    : /draft|sample|pending|partial/i.test(value) ? "pending"
      : /inactive|expired/i.test(value) ? "muted" : "info";
  return <span className={`status-pill status-${kind}`}>{value}</span>;
}

function EmptyState({ title, text }) {
  return <div className="module-empty"><Package size={20} /><strong>{title}</strong><span>{text}</span></div>;
}

function Modal({ title, onClose, children }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="module-modal-title"><header className="modal-header"><h2 id="module-modal-title">{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={15} /></button></header>{children}</section></div>;
}

function FormField({ label, name, ...props }) {
  return <label className="field-label">{label}<input name={name} {...props} /></label>;
}

function ModalActions({ onClose, submitText, disabled = false }) {
  return <div className="modal-actions"><button type="button" className="button button-outline" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={disabled}>{submitText}</button></div>;
}

function downloadCsv(filename, headers, rows) {
  const contents = [headers, ...rows].map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([contents], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
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
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
