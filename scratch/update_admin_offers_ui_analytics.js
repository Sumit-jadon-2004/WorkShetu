const fs = require("fs");
const file = "Frontend/src/Pages/Admin/Offers/OfferManagement.jsx";
let content = fs.readFileSync(file, "utf8");

// 1. Add icons to lucide-react import
const iconTarget = "  DollarSign,\n  Edit2,";
const iconReplacement = "  DollarSign,\n  BarChart3,\n  TrendingUp,\n  Receipt,\n  Edit2,";
content = content.replace(iconTarget, iconReplacement);

// 2. Add analytics state variables
const stateTarget = `  const [offers, setOffers] = useState([]);
  const [stats, setStats] = useState({
    totalOffers: 0,
    activeOffers: 0,
    scheduledOffers: 0,
    expiredOffers: 0,
    inactiveOffers: 0,
    totalRedemptions: 0,
    totalDiscountGiven: 0,
  });`;

const stateReplacement = `  const [offers, setOffers] = useState([]);
  const [stats, setStats] = useState({
    totalOffers: 0,
    activeOffers: 0,
    scheduledOffers: 0,
    expiredOffers: 0,
    inactiveOffers: 0,
    totalRedemptions: 0,
    totalDiscountGiven: 0,
  });

  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);`;

content = content.replace(stateTarget, stateReplacement);

// 3. Add fetchAnalytics and update useEffect
const effectTarget = `  useEffect(() => {
    fetchOffers(1);
  }, [activeTab, serviceFilter]);`;

const effectReplacement = `  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const response = await axios.get("/api/admin/offers/analytics", {
        withCredentials: true,
      });
      if (response.data.success) {
        setAnalyticsData(response.data);
      }
    } catch (err) {
      console.error("Failed to load offer analytics:", err);
      setError("Failed to load promotion analytics.");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "analytics") {
      fetchAnalytics();
    } else {
      fetchOffers(1);
    }
  }, [activeTab, serviceFilter]);`;

content = content.replace(effectTarget, effectReplacement);

// 4. Add Analytics tab to the tab list
const tabTarget = `            { id: "expired", label: "Expired", count: stats.expiredOffers },
            { id: "inactive", label: "Inactive", count: stats.inactiveOffers },
          ].map((tab) => (`;

const tabReplacement = `            { id: "expired", label: "Expired", count: stats.expiredOffers },
            { id: "inactive", label: "Inactive", count: stats.inactiveOffers },
            { id: "analytics", label: "Analytics", count: "Insights" },
          ].map((tab) => (`;

content = content.replace(tabTarget, tabReplacement);

// 5. In the tab rendering, conditionally show analytics view or standard offers table
const tableContainerTarget = `      {/* Offers Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        {loading ? (`;

const tableContainerReplacement = `      {/* Analytics Tab View */}
      {activeTab === "analytics" ? (
        <div className="space-y-6">
          {analyticsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : analyticsData ? (
            <>
              {/* Analytics Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Redemptions</p>
                    <p className="text-2xl font-black text-gray-900 mt-0.5">
                      {analyticsData.stats?.totalRedemptions || 0}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Bookings discounted</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Discount Given</p>
                    <p className="text-2xl font-black text-gray-900 mt-0.5">
                      ₹{(analyticsData.stats?.totalDiscountGiven || 0).toLocaleString("en-IN")}
                    </p>
                    <p className="text-[11px] text-purple-600 font-medium mt-0.5">Farmer savings delivered</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Gross Booking Value</p>
                    <p className="text-2xl font-black text-gray-900 mt-0.5">
                      ₹{(analyticsData.stats?.totalBookingRevenue || 0).toLocaleString("en-IN")}
                    </p>
                    <p className="text-[11px] text-blue-600 font-medium mt-0.5">Revenue with offers</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Avg Discount / Booking</p>
                    <p className="text-2xl font-black text-gray-900 mt-0.5">
                      ₹{(analyticsData.stats?.avgDiscount || 0).toLocaleString("en-IN")}
                    </p>
                    <p className="text-[11px] text-amber-600 font-medium mt-0.5">Per redemption average</p>
                  </div>
                </div>
              </div>

              {/* Leaderboard & Service Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Performing Offers */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-2xs p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" /> Top Performing Promotions Leaderboard
                    </h3>
                    <span className="text-xs text-gray-400">Ranked by usage</span>
                  </div>

                  {analyticsData.topOffers && analyticsData.topOffers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 text-gray-400 uppercase font-semibold text-[10px]">
                            <th className="py-2.5 px-3">Offer Title</th>
                            <th className="py-2.5 px-3">Code</th>
                            <th className="py-2.5 px-3">Discount</th>
                            <th className="py-2.5 px-3">Service</th>
                            <th className="py-2.5 px-3 text-center">Redemptions</th>
                            <th className="py-2.5 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {analyticsData.topOffers.map((top, idx) => (
                            <tr key={top._id || idx} className="hover:bg-gray-50/80">
                              <td className="py-2.5 px-3 font-semibold text-gray-900">{top.title}</td>
                              <td className="py-2.5 px-3">
                                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                                  {top.code}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-gray-700">
                                {top.discountType === "Percentage" ? \`\${top.discountValue}% OFF\` : \`₹\${top.discountValue} FLAT\`}
                              </td>
                              <td className="py-2.5 px-3 text-gray-600">{top.applicableService}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                                {top.usedCount || 0}
                                {top.totalUsageLimit ? \` / \${top.totalUsageLimit}\` : ""}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <UnifiedBadge
                                  label={top.status}
                                  variant={top.status === "Active" ? "success" : top.status === "Scheduled" ? "info" : "neutral"}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 py-4 text-center">No promotions redeemed yet.</p>
                  )}
                </div>

                {/* Service Distribution Breakdown */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-5">
                  <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" /> Redemptions by Service
                  </h3>

                  <div className="space-y-4">
                    {["Machine", "Labour", "Transport"].map((srv) => {
                      const match = (analyticsData.serviceBreakdown || []).find((s) => s._id === srv);
                      const count = match ? match.redemptions : 0;
                      const disc = match ? match.totalDiscount : 0;
                      const totalRed = analyticsData.stats?.totalRedemptions || 1;
                      const pct = Math.round((count / totalRed) * 100);

                      return (
                        <div key={srv} className="p-3 rounded-lg border border-gray-100 bg-gray-50/60">
                          <div className="flex justify-between text-xs font-bold text-gray-800">
                            <span>{srv}</span>
                            <span>{count} bookings ({pct}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mt-1.5">
                            <div
                              className="bg-emerald-600 h-full rounded-full transition-all"
                              style={{ width: \`\${pct}%\` }}
                            />
                          </div>
                          <p className="text-[10px] text-gray-500 mt-1">
                            Discounts delivered: ₹{disc.toLocaleString("en-IN")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Recent Redemptions Live Feed */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" /> Recent Offer Redemptions Activity Feed
                  </h3>
                  <button
                    onClick={fetchAnalytics}
                    className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-bold"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh Live Feed
                  </button>
                </div>

                {analyticsData.recentRedemptions && analyticsData.recentRedemptions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-400 uppercase font-semibold text-[10px]">
                          <th className="py-2.5 px-3">Farmer / Customer</th>
                          <th className="py-2.5 px-3">Service</th>
                          <th className="py-2.5 px-3">Applied Coupon</th>
                          <th className="py-2.5 px-3">Base Price</th>
                          <th className="py-2.5 px-3">Savings Granted</th>
                          <th className="py-2.5 px-3">Final Amount</th>
                          <th className="py-2.5 px-3 text-right">Date & Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {analyticsData.recentRedemptions.map((red) => (
                          <tr key={red._id} className="hover:bg-gray-50/80">
                            <td className="py-2.5 px-3 font-semibold text-gray-900">
                              {red.customerName || "Farmer Customer"}
                              <span className="block text-[10px] text-gray-400 font-normal">{red.customerPhone || "N/A"}</span>
                            </td>
                            <td className="py-2.5 px-3 text-gray-600 font-medium">{red.requestType || "Machine"}</td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                                {red.offerCode || "PROMO"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-gray-700 font-mono">
                              ₹{(red.basePrice || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                              - ₹{(red.offerDiscount || red.discountAmount || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-black text-gray-900">
                              ₹{(red.finalPrice || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="py-2.5 px-3 text-right text-gray-500 text-[11px]">
                              {new Date(red.createdAt).toLocaleString("en-IN", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 py-6 text-center">No redemptions logged yet.</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-center py-10 text-gray-500">Failed to load analytics data.</p>
          )}
        </div>
      ) : (
        /* Offers Table */
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
          {loading ? (`;

content = content.replace(tableContainerTarget, tableContainerReplacement);

// 6. Close the activeTab !== "analytics" conditional block after the table
const tableContainerEndTarget = `        )}
      </div>

      {/* CREATE / EDIT OFFER MODAL */}`;

const tableContainerEndReplacement = `        )}
        </div>
      )}

      {/* CREATE / EDIT OFFER MODAL */}`;

content = content.replace(tableContainerEndTarget, tableContainerEndReplacement);

fs.writeFileSync(file, content, "utf8");
console.log("Successfully updated OfferManagement.jsx with Analytics Dashboard!");

