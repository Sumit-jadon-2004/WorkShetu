const fs = require("fs");
const file = "Frontend/src/Pages/Farmer/MachineDetails.jsx";
let content = fs.readFileSync(file, "utf8");

// 1. Add icons to lucide-react import
const iconTarget = "  Tractor,\n  X,";
const iconReplacement = "  Tag,\n  Sparkles,\n  Tractor,\n  X,";
content = content.replace(iconTarget, iconReplacement);

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

content = content.replace(stateTarget, stateReplacement);

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
      const response = await axios.post("/api/offers/validate", {
        code: promoCode.trim().toUpperCase(),
        itemId: id,
        service: "Machine",
        category: machine?.category,
        landArea: Number(bookingForm.landArea),
        location: bookingForm.customerLocation,
        bookingType: bookingType === "group" ? "Group" : "Single",
      });

      if (response.data?.valid) {
        setAppliedOffer(response.data);
        setPromoError("");
      } else {
        setPromoError(response.data?.message || "Invalid coupon code.");
        setAppliedOffer(null);
      }
    } catch (err) {
      console.error("Apply promo error:", err);
      setPromoError(err.response?.data?.message || t("machineDetails.promoFailed", "Coupon code is invalid or not applicable."));
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

content = content.replace(closeTarget, closeReplacement);

// 4. Update updateBookingField to reset appliedOffer on landArea change
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

content = content.replace(updateFieldTarget, updateFieldReplacement);

// 5. Update submitBooking to send offerCode and offerId
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

content = content.replace(submitTarget, submitReplacement);

// 6. Insert coupon input block before price estimates in the modal
const formBeforeEstimatesTarget = `                </div>

                {fastBookingQuote && (`;

const formBeforeEstimatesReplacement = `                </div>

                {/* COUPONS & OFFERS SECTION */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-700 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
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
                        className="h-10 flex-1 rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-bold uppercase tracking-wider text-slate-800 outline-none focus:border-emerald-600 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        disabled={promoLoading || !promoCode.trim()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                      >
                        {promoLoading ? (
                          <span>...</span>
                        ) : (
                          <span>{t("machineDetails.apply", "Apply")}</span>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2.5 flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/90 px-3 py-2 text-xs dark:border-emerald-800 dark:bg-emerald-950/40">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-emerald-800 dark:text-emerald-300">
                          {appliedOffer.offer.code}
                        </span>
                        <span className="text-slate-600 dark:text-slate-300">
                          ({appliedOffer.offer.title})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemovePromo}
                        className="font-bold text-red-600 hover:text-red-700 hover:underline dark:text-red-400"
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

content = content.replace(formBeforeEstimatesTarget, formBeforeEstimatesReplacement);

// 7. Update fastBookingQuote breakdown to display discount and revised total
const fastQuoteEndTarget = `                      <div className="flex justify-between gap-3 border-t border-green-200 pt-3 text-base font-black text-green-900 dark:border-green-800 dark:text-lime-200">
                        <span>{t("machineDetails.totalEstimate", "Estimated total")}</span>
                        <span>{formatMoney(fastBookingQuote.total)}</span>
                      </div>`;

const fastQuoteEndReplacement = `                      {appliedOffer && appliedOffer.breakdown && appliedOffer.breakdown.actualDiscount > 0 && (
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

content = content.replace(fastQuoteEndTarget, fastQuoteEndReplacement);

fs.writeFileSync(file, content, "utf8");
console.log("Updated MachineDetails.jsx successfully!");

