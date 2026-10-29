import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  DollarSign,
  Download,
  Filter,
  Layers,
  MapPin,
  PieChart,
  RefreshCw,
  Tractor,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  X,
  XCircle,
} from "lucide-react";

// ========================================================
// REUSABLE RESPONSIVE SVG AREA / MULTI-LINE CHART
// ========================================================
function SvgAreaChart({ data = [], series = [], height = 260, formatValue = (v) => v }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-gray-400 text-sm">
        <BarChart3 className="w-8 h-8 mb-2 opacity-50" />
        No trend data points in this timeframe
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 35, left: 45 };
  const width = 650;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Find max value across all series
  const allValues = data.flatMap((d) => series.map((s) => Number(d[s.key] || 0)));
  const rawMax = Math.max(...allValues, 1);
  const maxValue = Math.ceil(rawMax * 1.15) || 5;

  const getX = (index) => {
    if (data.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (val) => {
    return padding.top + chartHeight - (val / maxValue) * chartHeight;
  };

  // Generate smooth line path
  const generatePath = (key) => {
    return data
      .map((d, i) => {
        const x = getX(i);
        const y = getY(Number(d[key] || 0));
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  // Generate closed area path for gradient fill
  const generateArea = (key) => {
    const linePath = generatePath(key);
    const startX = getX(0);
    const endX = getX(data.length - 1);
    const bottomY = padding.top + chartHeight;
    return `${linePath} L ${endX} ${bottomY} L ${startX} ${bottomY} Z`;
  };

  // Y-axis ticks (4 ticks)
  const yTicks = [0, 0.33, 0.66, 1].map((pct) => Math.round(maxValue * pct));

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          {series.map((s) => (
            <linearGradient key={`grad-${s.key}`} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.01" />
            </linearGradient>
          ))}
        </defs>

        {/* Y Gridlines & labels */}
        {yTicks.map((val, idx) => {
          const y = getY(val);
          return (
            <g key={`ytick-${idx}`}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#E5E7EB"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] fill-gray-400 font-mono"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Areas */}
        {series.map((s) => (
          <path
            key={`area-${s.key}`}
            d={generateArea(s.key)}
            fill={`url(#grad-${s.key})`}
            className="transition-all duration-300"
          />
        ))}

        {/* Lines */}
        {series.map((s) => (
          <path
            key={`line-${s.key}`}
            d={generatePath(s.key)}
            fill="none"
            stroke={s.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-300"
          />
        ))}

        {/* X Axis labels (sample at intervals) */}
        {data.map((d, i) => {
          const step = Math.max(1, Math.floor(data.length / 6));
          if (i % step !== 0 && i !== data.length - 1) return null;
          const x = getX(i);
          const label = d.date.length > 7 ? d.date.slice(5) : d.date;
          return (
            <text
              key={`xlabel-${i}`}
              x={x}
              y={height - 10}
              textAnchor="middle"
              className="text-[10px] fill-gray-400 font-mono"
            >
              {label}
            </text>
          );
        })}

        {/* Hover Crosshair & Dots */}
        {hoverIndex !== null && data[hoverIndex] && (
          <g>
            <line
              x1={getX(hoverIndex)}
              y1={padding.top}
              x2={getX(hoverIndex)}
              y2={padding.top + chartHeight}
              stroke="#6B7280"
              strokeDasharray="3 3"
              strokeWidth="1.5"
            />
            {series.map((s) => {
              const val = Number(data[hoverIndex][s.key] || 0);
              return (
                <circle
                  key={`dot-${s.key}`}
                  cx={getX(hoverIndex)}
                  cy={getY(val)}
                  r="5"
                  fill="#ffffff"
                  stroke={s.color}
                  strokeWidth="3"
                />
              );
            })}
          </g>
        )}

        {/* Invisible mouse detection bars */}
        {data.map((d, i) => {
          const colWidth = chartWidth / data.length;
          const x = getX(i) - colWidth / 2;
          return (
            <rect
              key={`hover-rect-${i}`}
              x={x}
              y={padding.top}
              width={colWidth}
              height={chartHeight}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(i)}
            />
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoverIndex !== null && data[hoverIndex] && (
        <div
          className="absolute z-20 pointer-events-none bg-gray-900/95 text-white text-xs rounded-lg p-2.5 shadow-xl border border-gray-700/60 backdrop-blur-sm transform -translate-x-1/2 -translate-y-full transition-all duration-75"
          style={{
            left: `${(getX(hoverIndex) / width) * 100}%`,
            top: `${(padding.top / height) * 100}%`,
          }}
        >
          <p className="font-semibold text-gray-300 pb-1 border-b border-gray-700 mb-1.5 font-mono">
            {data[hoverIndex].date}
          </p>
          <div className="space-y-1">
            {series.map((s) => (
              <div key={`tip-${s.key}`} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-gray-300">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}:
                </span>
                <span className="font-bold text-white font-mono">
                  {formatValue(data[hoverIndex][s.key] || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================================
// DONUT CHART COMPONENT
// ========================================================
function SvgDonutChart({ slices = [], total = 0, size = 180, strokeWidth = 24 }) {
  if (total === 0) {
    return (
      <div className="h-44 flex flex-col items-center justify-center text-gray-400 text-sm">
        <PieChart className="w-8 h-8 mb-2 opacity-50" />
        No distribution data
      </div>
    );
  }

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#F3F4F6"
          strokeWidth={strokeWidth}
        />
        {slices.map((slice, i) => {
          const percent = slice.count / total;
          const strokeDashoffset = circumference * (1 - percent);
          const rotationAngle = (accumulatedPercent * 360);
          accumulatedPercent += percent;

          if (slice.count === 0) return null;

          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={slice.color}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(${rotationAngle} ${size / 2} ${size / 2})`}
              className="transition-all duration-500 hover:opacity-80"
            />
          );
        })}
      </svg>
      {/* Centered Total Counter */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-bold text-gray-900 leading-tight">{total}</span>
        <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Total</span>
      </div>
    </div>
  );
}

// ========================================================
// MAIN ANALYTICS DASHBOARD PAGE
// ========================================================
export default function AdminAnalytics() {
  const [timeframe, setTimeframe] = useState("30d");
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get("/api/admin/analytics/overview", {
        params: { timeframe },
        withCredentials: true,
      });

      if (response.data.success) {
        setAnalyticsData(response.data);
      } else {
        setError(response.data.message || "Failed to load platform analytics.");
      }
    } catch (err) {
      console.error("Fetch analytics error:", err);
      setError(err.response?.data?.message || "Failed to connect to analytics service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  const summary = analyticsData?.summary || {};
  const trends = analyticsData?.trends || {};
  const breakdowns = analyticsData?.breakdowns || {};

  // Formatter helpers
  const formatCurrency = (val) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-emerald-600" />
            Platform Analytics & Intelligence
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time aggregate data, growth velocity, and operational breakdown across WorkShetu.
          </p>
        </div>

        {/* Timeframe Filter Buttons */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
          {[
            { label: "7 Days", val: "7d" },
            { label: "30 Days", val: "30d" },
            { label: "90 Days", val: "90d" },
            { label: "1 Year", val: "1y" },
            { label: "All Time", val: "all" },
          ].map((btn) => (
            <button
              key={btn.val}
              onClick={() => setTimeframe(btn.val)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                timeframe === btn.val
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {btn.label}
            </button>
          ))}
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 ml-1 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Financial & Operational Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Bookings Volume */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Gross Platform GMV</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {formatCurrency(summary.grossVolume)}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Settled: {formatCurrency(summary.completedVolume)}
            </span>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Completion Rate</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {summary.completionRate || 0}%
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <span>{summary.completedBookings || 0} completed out of {summary.totalBookings || 0} total</span>
          </div>
        </div>

        {/* Cancellation Rate */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cancellation Rate</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {summary.cancellationRate || 0}%
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <span>{summary.cancelledBookings || 0} bookings cancelled</span>
          </div>
        </div>

        {/* Total Ecosystem Listings */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Inventory</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Tractor className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {summary.totalListings || 0}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <span>{summary.totalMachines || 0} Machines · {summary.totalLabour || 0} Labour · {summary.totalTransport || 0} Transport</span>
          </div>
        </div>
      </div>

      {/* Main Growth Charts: User Growth & Booking Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User & Driver Growth Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                User & Driver Growth Velocity
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                New farmer registrations and driver onboardings over time.
              </p>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Farmers ({summary.totalFarmers || 0})
              </span>
              <span className="flex items-center gap-1.5 text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                Drivers ({summary.totalDrivers || 0})
              </span>
            </div>
          </div>

          <SvgAreaChart
            data={trends.userGrowth || []}
            series={[
              { key: "farmers", label: "Farmers", color: "#10B981" },
              { key: "drivers", label: "Drivers", color: "#3B82F6" },
            ]}
          />
        </div>

        {/* Booking Volume & Completion Trends */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Booking Trends & Resolution
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Order inflow vs completed vs cancelled jobs over time.
              </p>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                Completed
              </span>
              <span className="flex items-center gap-1.5 text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Pending
              </span>
              <span className="flex items-center gap-1.5 text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Cancelled
              </span>
            </div>
          </div>

          <SvgAreaChart
            data={trends.bookingGrowth || []}
            series={[
              { key: "completed", label: "Completed", color: "#10B981" },
              { key: "pending", label: "Pending", color: "#F59E0B" },
              { key: "cancelled", label: "Cancelled", color: "#EF4444" },
            ]}
          />
        </div>
      </div>

      {/* Row 2: Status Breakdown Donut & Machine Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Booking Status Distribution Donut */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-emerald-600" />
              Booking Status Split
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Current breakdown across all lifecycle states.
            </p>
          </div>

          <div className="py-4 flex justify-center">
            <SvgDonutChart
              slices={breakdowns.bookingStatus || []}
              total={summary.totalBookings || 0}
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-100">
            {(breakdowns.bookingStatus || []).map((item) => {
              const pct = summary.totalBookings > 0
                ? Math.round((item.count / summary.totalBookings) * 100)
                : 0;
              return (
                <div key={item.status} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-700 font-medium">{item.status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 font-mono">{item.count}</span>
                    <span className="text-gray-400 font-mono w-9 text-right">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Machine Categories Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Tractor className="w-5 h-5 text-emerald-600" />
                Machine Category Distribution
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Breakdown of verified machinery types and average rental pricing.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg">
              {summary.totalMachines || 0} Total Machines
            </span>
          </div>

          {(!breakdowns.machineCategories || breakdowns.machineCategories.length === 0) ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              <Tractor className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No machinery categories registered yet.
            </div>
          ) : (
            <div className="space-y-4">
              {breakdowns.machineCategories.map((item) => {
                const total = summary.totalMachines || 1;
                const percentage = Math.round((item.count / total) * 100);
                return (
                  <div key={item.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-semibold text-gray-800">
                        <span>{item.category}</span>
                        <span className="text-gray-400 font-normal">({item.count} units)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {item.avgPrice > 0 && (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono text-[11px]">
                            Avg: ₹{item.avgPrice.toLocaleString("en-IN")}
                          </span>
                        )}
                        <span className="font-bold text-gray-900 font-mono w-10 text-right">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Popular Locations & Service Types Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Popular Platform Locations Table */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Popular Geographic Hubs & Locations
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                High-demand agricultural locations based on verified farmer bookings.
              </p>
            </div>
          </div>

          {(!breakdowns.popularLocations || breakdowns.popularLocations.length === 0) ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No booking location data recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase font-semibold">
                    <th className="py-2.5 px-3">Location Name</th>
                    <th className="py-2.5 px-3 text-center">Total Bookings</th>
                    <th className="py-2.5 px-3 text-center">Completed</th>
                    <th className="py-2.5 px-3 text-right">Total GMV (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {breakdowns.popularLocations.map((loc, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 px-3 font-medium text-gray-900 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        {loc.location}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-semibold text-gray-800">
                        {loc.bookings}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-emerald-700">
                        {loc.completed}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-gray-900">
                        ₹{(loc.spend || 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Service Request Types Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              Service Demand Split
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Demand distribution between Machine, Labour, and Transport.
            </p>
          </div>

          <div className="space-y-4 my-6">
            {(breakdowns.serviceTypes || []).map((service) => {
              const total = summary.totalBookings || 1;
              const percentage = Math.round((service.count / total) * 100);
              const icon =
                service.type === "Machine" ? (
                  <Tractor className="w-4 h-4 text-emerald-600" />
                ) : service.type === "Labour" ? (
                  <Users className="w-4 h-4 text-blue-600" />
                ) : (
                  <Truck className="w-4 h-4 text-amber-600" />
                );

              return (
                <div key={service.type} className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-bold text-gray-900">
                      {icon}
                      {service.type}
                    </span>
                    <span className="font-mono font-bold text-gray-900">{service.count} orders ({percentage}%)</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 flex justify-between">
                    <span>Revenue Generated:</span>
                    <span className="font-mono font-medium text-gray-800">
                      ₹{(service.amount || 0).toLocaleString("en-IN")}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Aggregate insights calculated dynamically from active MongoDB ledger records.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

