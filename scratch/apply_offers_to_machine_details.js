const fs = require("fs");
const file = "Frontend/src/Pages/Farmer/MachineDetails.jsx";
let content = fs.readFileSync(file, "utf8");

// 1. Add Tag and Sparkles to lucide-react imports if missing
if (!content.includes("Tag,")) {
  content = content.replace("  Tractor,\n  X,", "  Tag,\n  Sparkles,\n  Tractor,\n  X,");
}

// 2. Add promo states after bookingForm
const stateTarget = `  const [bookingForm, setBookingForm] = useState({
    customerName: "",
    customerLocation: "",
    landArea: "",
    areaUnit: "Bigha",
    workType: "",
    requiredDate: "",
    latitude: "",
    longitude: "",
  });`;

const stateReplacement = `  const [bookingForm, setBookingForm] = useState({
    customerName: "",
    customerLocation: "",
    landArea: "",
    areaUnit: "Bigha",
    workType: "",
    requiredDate: "",
    latitude: "",
    longitude: "",
  });

  const [promoCode, setPromoCode] = useState("");
  const [appliedOffer, setAppliedOffer] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");`;

content = content.replace(/\r\n/g, "\n");
const normStateTarget = stateTarget.replace(/\r\n/g, "\n");

if (!content.includes(normStateTarget)) {
  console.error("State target not found!");
  process.exit(1);
}
content = content.replace(normStateTarget, stateReplacement);

// 3. Update closeBooking
const closeTarget = `  const closeBooking = () => {
    setBookingType(null);
    setBookingSubmitted(false);
  };`;

const closeReplacement = `  const closeBooking = () => {
    setBookingType(null);
    setBookingSubmitted(false);
    setAppliedOffer(null);
    setPromoCode("");
    setPromoError("");
  };

  const handleApplyPromo = async (e) => {
    if (e) e.preventDefault();
    if (!promoCode || !promoCode.trim()) {
      setPromoError(t("machineDetails.enterPromoCode", "Please enter a coupon code."));
      return;
    }

    setPromoLoading(true);
    setPromoError("");

    try {
      const response = await axios.post(
        "/api/offers/validate",
        {
          code: promoCode.trim().toUpperCase(),
          itemId: id,
          service: "Machine",
          category: machine?.category,
          landArea: Number(bookingForm.landArea),
          location: bookingForm.customerLocation,
          bookingType: bookingType === "group" ? "Group" : "Single",
        },
        { withCredentials: true }
      );

      if (response.data?.valid) {
        setAppliedOffer(response.data);
        setPromoError("");
      } else {
        setPromoError(response.data?.message || "Invalid coupon code.");
        setAppliedOffer(null);
      }
    } catch (err) {
      console.error("Apply promo error:", err);
      setPromoError(
        err.response?.data?.message ||
        t("machineDetails.promoFailed", "Coupon code is invalid or not applicable.")
      );
      setAppliedOffer(null);
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedOffer(null);
    setPromoCode("");
    setPromoError("");
  };`;

const normCloseTarget = closeTarget.replace(/\r\n/g, "\n");
if (!content.includes(normCloseTarget)) {
  console.error("Close target not found!");
  process.exit(1);
}
content = content.replace(normCloseTarget, closeReplacement);

// 4. Update updateBookingField to clear appliedOffer on landArea change
const updateFieldTarget = `  const updateBookingField = (event) => {
    const { name, value } = event.target;

    setBookingForm((form) => ({
      ...form,
      [name]: value,
    }));
  };`;

const updateFieldReplacement = `  const updateBookingField = (event) => {
    const { name, value } = event.target;

    setBookingForm((form) => ({
      ...form,
      [name]: value,
    }));

    if (name === "landArea" && appliedOffer) {
      setAppliedOffer(null);
    }
  };`;

const normUpdateField = updateFieldTarget.replace(/\r\n/g, "\n");
if (content.includes(normUpdateField)) {
  content = content.replace(normUpdateField, updateFieldReplacement);
}

// 5. Update submitBooking to pass offerCode & offerId
const submitTarget = `      const endpoint = bookingType === "group"
        ? "/api/group-bookings/create"
        : "/api/bookings/single";
      const response = await axios.post(endpoint, {
        itemId: id,
        location: bookingForm.customerLocation,
        latitude: bookingForm.latitude,
        longitude: bookingForm.longitude,
        landArea: bookingForm.landArea,
        bookingDate: bookingForm.requiredDate,
        workType: bookingForm.workType,
        message: \`Booking requested by \${bookingForm.customerName}\`
      });`;

const submitReplacement = `      const endpoint = bookingType === "group"
        ? "/api/group-bookings/create"
        : "/api/bookings/single";
      const response = await axios.post(endpoint, {
        itemId: id,
        location: bookingForm.customerLocation,
        latitude: bookingForm.latitude,
        longitude: bookingForm.longitude,
        landArea: bookingForm.landArea,
        bookingDate: bookingForm.requiredDate,
        workType: bookingForm.workType,
        message: \`Booking requested by \${bookingForm.customerName}\`,
        offerCode: appliedOffer?.offer?.code || null,
        offerId: appliedOffer?.offer?._id || null,
      });`;

const normSubmitTarget = submitTarget.replace(/\r\n/g, "\n");
if (!content.includes(normSubmitTarget)) {
  console.error("Submit target not found!");
  process.exit(1);
}
content = content.replace(normSubmitTarget, submitReplacement);

// 6. Insert Coupon Input section right before fastBookingQuote in Modal JSX
const formEstimateTarget = `                </div>

                {fastBookingQuote && (`;

const formEstimateReplacement = `                </div>

                {/* COUPONS & PROMOTIONS SECTION */}
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white p-4 dark:border-emerald-900/60 dark:from-emerald-950/30 dark:to-slate-900">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      <Tag size={14} className="text-emerald-600" />
                      <span>{t("machineDetails.haveCoupon", "Apply Promotion / Coupon")}</span>
                    </div>
                    {appliedOffer && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <Sparkles size={12} />
                        {appliedOffer.breakdown.actualDiscount > 0 ? \`Saved \${formatMoney(appliedOffer.breakdown.actualDiscount)}\` : "Applied"}
                      </span>
                    )}
                  </div>

                  {!appliedOffer ? (
                    <div className="mt-2.5 flex gap-2">
                      <input
                        type="text"
                        placeholder={t("machineDetails.enterPromoPlaceholder", "Enter promo code (e.g. TRACTOR500)")}
                        value={promoCode}
                        onChange={(e) => {
                          setPromoCode(e.target.value.toUpperCase());
                          if (promoError) setPromoError("");
                        }}
                        disabled={promoLoading}
                        className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-bold uppercase tracking-wider text-slate-800 outline-none focus:border-emerald-600 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        disabled={promoLoading || !promoCode.trim()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-xs font-black text-white hover:bg-emerald-800 disabled:opacity-50"
                      >
                        {promoLoading ? "..." : t("machineDetails.apply", "Apply")}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2.5 flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs dark:border-emerald-800 dark:bg-emerald-950/40">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-emerald-800 dark:text-emerald-300">
                          {appliedOffer.offer.code}
                        </span>
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                          ({appliedOffer.offer.title})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemovePromo}
                        className="font-bold text-rose-600 hover:text-rose-700 hover:underline dark:text-rose-400"
                      >
                        {t("machineDetails.remove", "Remove")}
                      </button>
                    </div>
                  )}

                  {promoError && (
                    <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                      {promoError}
                    </p>
                  )}
                </div>

                {fastBookingQuote && (`;

const normFormEstimateTarget = formEstimateTarget.replace(/\r\n/g, "\n");
if (!content.includes(normFormEstimateTarget)) {
  console.error("Form estimate target not found!");
  process.exit(1);
}
content = content.replace(normFormEstimateTarget, formEstimateReplacement);

// 7. Update fastBookingQuote breakdown to display discount & updated total
const fastTotalTarget = `                      <div className="flex justify-between gap-3 border-t border-green-200 pt-3 text-base font-black text-green-900 dark:border-green-800 dark:text-lime-200">
                        <span>{t("machineDetails.totalEstimate", "Estimated total")}</span>
                        <span>{formatMoney(fastBookingQuote.total)}</span>
                      </div>`;

const fastTotalReplacement = `                      {appliedOffer && appliedOffer.breakdown && appliedOffer.breakdown.actualDiscount > 0 && (
                        <div className="flex justify-between gap-3 font-semibold text-emerald-700 dark:text-emerald-300">
                          <span>
                            {t("machineDetails.promoDiscount", "Offer discount")} ({appliedOffer.offer.code})
                          </span>
                          <span className="font-bold">- {formatMoney(appliedOffer.breakdown.actualDiscount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between gap-3 border-t border-green-200 pt-3 text-base font-black text-green-900 dark:border-green-800 dark:text-lime-200">
                        <span>{t("machineDetails.totalEstimate", "Estimated total")}</span>
                        <span>
                          {appliedOffer && appliedOffer.breakdown
                            ? formatMoney(appliedOffer.breakdown.finalPayableAmount)
                            : formatMoney(fastBookingQuote.total)}
                        </span>
                      </div>`;

const normFastTotalTarget = fastTotalTarget.replace(/\r\n/g, "\n");
if (!content.includes(normFastTotalTarget)) {
  console.error("Fast total target not found!");
  process.exit(1);
}
content = content.replace(normFastTotalTarget, fastTotalReplacement);

fs.writeFileSync(file, content, "utf8");
console.log("Successfully updated MachineDetails.jsx with offer booking flow!");

