const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../Frontend/src/Pages/Farmer/MachineDetails.jsx');
let code = fs.readFileSync(targetPath, 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

// 1. Add useSearchParams to react-router-dom import
code = code.replace(
  'import { useLocation, useNavigate, useParams } from "react-router-dom";',
  'import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";'
);

// 2. Add audioAlert import
if (!code.includes('audioAlert.js')) {
  code = code.replace(
    'import PromotionsBanner from "../Common/PromotionsBanner.jsx";',
    'import PromotionsBanner from "../Common/PromotionsBanner.jsx";\nimport { playBookingAlertSound } from "../../utils/audioAlert.js";'
  );
}

// 3. Add activeBooking & countdown state in component
const anchorState = '  const [bookingModalError, setBookingModalError] = useState("");';
const extraState = `  const [bookingModalError, setBookingModalError] = useState("");
  const [activeBooking, setActiveBooking] = useState(null);
  const [countdownSeconds, setCountdownSeconds] = useState(120);
  const [alternativesList, setAlternativesList] = useState([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  const [rebookingInProgress, setRebookingInProgress] = useState(false);
  const [searchParams] = useSearchParams();`;

if (code.includes(anchorState) && !code.includes('const [activeBooking, setActiveBooking]')) {
  code = code.replace(anchorState, extraState);
}

// 4. Add openBooking URL trigger
const anchorInit = '  const { id } = useParams();';
const urlTriggerCode = `  const { id } = useParams();

  useEffect(() => {
    if (searchParams.get("openBooking") === "true" && machine && !bookingType && !bookingSubmitted) {
      openBooking("fast");
    }
  }, [searchParams, machine]);`;

if (code.includes(anchorInit) && !code.includes('searchParams.get("openBooking") === "true"')) {
  code = code.replace(anchorInit, urlTriggerCode);
}

// 5. Add Live 2-Minute Polling Effect
const anchorPolling = '  // --------------------------------------------------\n  // REVIEWS';
const pollingEffectCode = `  // --------------------------------------------------
  // LIVE 2-MINUTE COUNTDOWN & STATUS POLLING
  // --------------------------------------------------

  useEffect(() => {
    if (!bookingSubmitted || !activeBooking?._id) return;
    if (activeBooking.status !== "Pending") return;

    // Countdown interval
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setActiveBooking((curr) => curr ? { ...curr, status: "Expired" } : null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Backend status poll interval
    const pollInterval = setInterval(async () => {
      try {
        const res = await axios.get("/api/group-bookings/my/requests", { withCredentials: true });
        const updated = (res.data?.bookings || []).find((b) => b._id === activeBooking._id);
        if (updated && updated.status !== "Pending") {
          setActiveBooking(updated);
          if (updated.status === "Accepted") {
            playBookingAlertSound();
          }
          clearInterval(pollInterval);
          clearInterval(timer);
        }
      } catch (pollErr) {
        console.warn("Status poll error:", pollErr.message);
      }
    }, 3000);

    return () => {
      clearInterval(timer);
      clearInterval(pollInterval);
    };
  }, [bookingSubmitted, activeBooking?._id, activeBooking?.status]);

  const loadAlternatives = async (bookingId) => {
    if (!bookingId) return;
    try {
      setLoadingAlternatives(true);
      const res = await axios.get(\`/api/group-bookings/single/\${bookingId}/alternatives\`, { withCredentials: true });
      setAlternativesList(res.data?.alternatives || []);
    } catch (err) {
      console.warn("Failed to load alternative machines:", err);
    } finally {
      setLoadingAlternatives(false);
    }
  };

  const rebookAlternative = async (altMachine) => {
    if (!altMachine?._id || !activeBooking?._id) return;
    try {
      setRebookingInProgress(true);
      const res = await axios.post("/api/bookings/single", {
        itemId: altMachine._id,
        originalBookingId: activeBooking._id,
        location: bookingForm.customerLocation,
        latitude: bookingForm.latitude,
        longitude: bookingForm.longitude,
        landArea: bookingForm.landArea,
        bookingDate: bookingForm.requiredDate,
        preferredTime: bookingForm.preferredTime,
        workType: bookingForm.workType,
        message: \`Alternative booking requested for \${bookingForm.customerName}\`
      }, { withCredentials: true });

      setActiveBooking(res.data);
      setCountdownSeconds(120);
      setAlternativesList([]);
      playBookingAlertSound();
    } catch (err) {
      setBookingModalError(err.response?.data?.message || "Failed to book alternative machine.");
    } finally {
      setRebookingInProgress(false);
    }
  };

  // --------------------------------------------------
  // REVIEWS`;

if (code.includes(anchorPolling) && !code.includes('LIVE 2-MINUTE COUNTDOWN & STATUS POLLING')) {
  code = code.replace(anchorPolling, pollingEffectCode);
}

// 6. Update submitBooking to store activeBooking & start 120s timer
const oldSubmitResponse = `      setBookingSubmitted(true);
      setBookingType(null);
      localStorage.setItem("workshetu-order-notice", JSON.stringify({
        type: bookingType === "group" ? "Group" : "Fast",
        bookingId: response.data?._id || response.data?.group?._id,
      }));
      window.dispatchEvent(new Event("workshetu-order-notice"));
      return response;`;

const newSubmitResponse = `      setActiveBooking(response.data);
      setCountdownSeconds(120);
      setBookingSubmitted(true);
      playBookingAlertSound();
      localStorage.setItem("workshetu-order-notice", JSON.stringify({
        type: bookingType === "group" ? "Group" : "Fast",
        bookingId: response.data?._id || response.data?.group?._id,
      }));
      window.dispatchEvent(new Event("workshetu-order-notice"));
      return response;`;

if (code.includes(oldSubmitResponse)) {
  code = code.replace(oldSubmitResponse, newSubmitResponse);
}

// 7. Update the Booking Modal Success / Live Status view
const oldSuccessBlock = `            {/* SUCCESS */}

            {bookingSubmitted ? (
              <div className="mt-7 rounded-2xl bg-green-50 p-5 text-center">

                <CheckCircle2
                  className="mx-auto text-green-700"
                  size={36}
                />

                <p className="mt-3 font-black text-green-900">
                  {t(
                    "machineDetails.bookingReady",
                    "Your booking request is ready."
                  )}
                </p>

                <p className="mt-1 text-sm leading-6 text-green-800/75">
                  {t(
                    "machineDetails.ownerCanReview",
                    "The owner can review your {{type}} booking details after submission.",
                    {
                      type:
                        bookingType ===
                        "group"
                          ? t(
                              "machineDetails.groupBookingLower",
                              "group"
                            )
                          : t(
                              "machineDetails.fastBookingLower",
                              "fast"
                            ),
                    }
                  )}
                </p>

                <button
                  type="button"
                  onClick={closeBooking}
                  className="mt-5 rounded-xl bg-green-700 px-5 py-3 text-sm font-black text-white"
                >
                  {t(
                    "machineDetails.done",
                    "Done"
                  )}
                </button>
              </div>
            ) : (`;

const newLiveStatusBlock = `            {/* LIVE 2-MINUTE STATUS & CONFIRMATION TRACKER */}

            {bookingSubmitted ? (
              <div className="mt-6 space-y-4">
                {activeBooking?.status === "Accepted" ? (
                  <div className="rounded-3xl border border-green-300 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-950/40">
                    <CheckCircle2 className="mx-auto text-green-700 dark:text-lime-400" size={44} />
                    <h3 className="mt-3 text-xl font-black text-green-950 dark:text-white">Driver Confirmed Booking!</h3>
                    <p className="mt-1 text-sm text-green-800/80 dark:text-green-300">
                      The owner accepted your request. Your machinery is reserved.
                    </p>
                    {activeBooking.completionOtp && (
                      <div className="mt-4 rounded-2xl border border-green-200 bg-white p-4 shadow-sm dark:border-green-900 dark:bg-slate-900">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-500">Work Completion OTP</p>
                        <p className="mt-1 text-3xl font-black tracking-widest text-green-700 dark:text-lime-300">
                          {activeBooking.completionOtp}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">Share this OTP with driver only after completion</p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => { closeBooking(); navigate("/bookings"); }}
                      className="mt-5 w-full rounded-2xl bg-green-700 py-3.5 text-sm font-black text-white shadow-lg shadow-green-700/20 hover:bg-green-800"
                    >
                      View in My Bookings
                    </button>
                  </div>
                ) : activeBooking?.status === "Rejected" || activeBooking?.status === "Expired" || countdownSeconds === 0 ? (
                  <div className="rounded-3xl border border-amber-300 bg-amber-50/90 p-6 text-center dark:border-amber-800 dark:bg-amber-950/40">
                    <AlertCircle className="mx-auto text-amber-600 dark:text-amber-400" size={44} />
                    <h3 className="mt-3 text-xl font-black text-amber-950 dark:text-white">Driver Did Not Confirm</h3>
                    <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-300">
                      {activeBooking?.status === "Rejected"
                        ? "The driver was unavailable for this booking time."
                        : "The 2-minute confirmation window expired without a response."}
                    </p>

                    <div className="mt-5">
                      <button
                        type="button"
                        onClick={() => loadAlternatives(activeBooking?._id)}
                        disabled={loadingAlternatives}
                        className="w-full rounded-2xl bg-[#123524] py-3.5 text-sm font-black text-white shadow-lg hover:bg-green-800 transition disabled:opacity-50"
                      >
                        {loadingAlternatives ? "Finding Alternative Machines..." : "🚜 Find Another Available Machine"}
                      </button>
                    </div>

                    {alternativesList.length > 0 && (
                      <div className="mt-5 space-y-3 text-left">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                          Matching Verified Machines Nearby ({alternativesList.length})
                        </p>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                          {alternativesList.map((alt) => (
                            <div
                              key={alt._id}
                              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-slate-900 dark:text-white">{alt.title}</p>
                                <p className="text-xs font-bold text-green-700 dark:text-lime-300">
                                  ₹{alt.price} / {alt.unit} {alt.distanceKm != null ? \`· \${alt.distanceKm} km away\` : ""}
                                </p>
                              </div>
                              <button
                                type="button"
                                disabled={rebookingInProgress}
                                onClick={() => rebookAlternative(alt)}
                                className="shrink-0 rounded-xl bg-green-700 px-3.5 py-2 text-xs font-black text-white hover:bg-green-800 disabled:opacity-50"
                              >
                                {rebookingInProgress ? "Booking..." : "Book Now"}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* LIVE PENDING COUNTDOWN TRACKER */
                  <div className="rounded-3xl border border-green-200 bg-gradient-to-br from-green-50/80 to-white p-6 text-center dark:border-green-900 dark:from-green-950/30 dark:to-slate-900 shadow-sm">
                    <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
                      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-200 dark:text-slate-800"
                          strokeWidth="3"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-green-600 transition-all duration-1000 dark:text-lime-400"
                          strokeDasharray={\`\${(countdownSeconds / 120) * 100}, 100\`}
                          strokeLinecap="round"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-xl font-black text-slate-900 dark:text-white">
                          {\`\${Math.floor(countdownSeconds / 60)}:\${String(countdownSeconds % 60).padStart(2, "0")}\`}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Wait</span>
                      </div>
                    </div>

                    <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
                      Waiting for Machine Owner Response
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      We notified the owner. They have 2 minutes to confirm or decline this request.
                    </p>

                    <div className="mt-4 flex items-center justify-between rounded-2xl bg-white p-3 border border-slate-200 text-xs font-bold dark:border-slate-800 dark:bg-slate-800">
                      <span className="text-slate-500">Service:</span>
                      <span className="text-slate-800 dark:text-slate-200">{machine?.title} ({bookingForm.landArea} Bigha)</span>
                    </div>

                    <button
                      type="button"
                      onClick={closeBooking}
                      className="mt-4 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 underline"
                    >
                      Close and track from My Bookings
                    </button>
                  </div>
                )}
              </div>
            ) : (`;

if (code.includes(oldSuccessBlock)) {
  code = code.replace(oldSuccessBlock, newLiveStatusBlock);
}

fs.writeFileSync(targetPath, code, 'utf8');
console.log('MachineDetails.jsx updated successfully.');

