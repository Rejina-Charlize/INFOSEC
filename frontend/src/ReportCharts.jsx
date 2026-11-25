import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

const monthlySales = [
  { month: "Jun", sales: 4820 },
  { month: "Jul", sales: 5360 },
  { month: "Aug", sales: 5100 },
  { month: "Sep", sales: 6210 },
  { month: "Oct", sales: 5840 },
  { month: "Nov", sales: 6475 },
];
const chartColors = ["#3975f1", "#46ad88", "#9a72d0", "#e7a54f", "#e17878"];

export default function ReportCharts({ categoryData }) {
  const totalStock = categoryData.reduce((sum, item) => sum + item.stock, 0);
  return <>
    <section className="module-card chart-card">
      <div className="module-card-heading"><div><h2>Monthly sales trend</h2><p>Illustrative totals · PHP</p></div><span className="chart-period">Last 6 months</span></div>
      <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthlySales} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}><CartesianGrid stroke="#edf1f6" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#8b96a5", fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#8b96a5", fontSize: 9 }} tickFormatter={(value) => `₱${value / 1000}k`} /><Tooltip formatter={(value) => formatCurrency(value)} /><Bar dataKey="sales" name="Sales" fill="#3975f1" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>
    </section>
    <section className="module-card chart-card">
      <div className="module-card-heading"><div><h2>Stock by category</h2><p>Current available units</p></div></div>
      {categoryData.length ? <div className="category-chart">
        <div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="stock" nameKey="name" innerRadius={48} outerRadius={68} paddingAngle={3}>{categoryData.map((item, index) => <Cell key={item.name} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="donut-total"><strong>{totalStock}</strong><small>units</small></div></div>
        <div className="chart-legend">{categoryData.map((item, index) => <span key={item.name}><i style={{ backgroundColor: chartColors[index % chartColors.length] }} />{item.name}<strong>{item.stock}</strong></span>)}</div>
      </div> : <div className="module-empty"><strong>No inventory to chart</strong><span>Add medicines and stock to see category totals.</span></div>}
    </section>
  </>;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(Number(value));
}
