const fs = require("fs");
const file = "Frontend/src/Pages/Admin/Offers/OfferManagement.jsx";
let content = fs.readFileSync(file, "utf8");

// 1. Clear error/success in handleOpenCreate and handleOpenEdit
const openCreateTarget = `  const handleOpenCreate = () => {
    setEditingOfferId(null);
    const today = new Date();
    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    setFormData({
      ...INITIAL_FORM,
      startDate: today.toISOString().slice(0, 10),
      endDate: nextMonth.toISOString().slice(0, 10),
    });
    setShowCreateModal(true);
  };`;

const openCreateReplacement = `  const handleOpenCreate = () => {
    setEditingOfferId(null);
    setError("");
    setSuccess("");
    const today = new Date();
    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    setFormData({
      ...INITIAL_FORM,
      startDate: today.toISOString().slice(0, 10),
      startTime: "00:00",
      endDate: nextMonth.toISOString().slice(0, 10),
      endTime: "23:59",
    });
    setShowCreateModal(true);
  };`;

content = content.replace(openCreateTarget, openCreateReplacement);

// 2. In handleOpenEdit, clear error/success
const openEditTarget = `  const handleOpenEdit = (offer) => {
    setEditingOfferId(offer._id);
    const start = new Date(offer.startDate);`;

const openEditReplacement = `  const handleOpenEdit = (offer) => {
    setEditingOfferId(offer._id);
    setError("");
    setSuccess("");
    const start = new Date(offer.startDate);`;

content = content.replace(openEditTarget, openEditReplacement);

// 3. Improve error extraction in handleSubmitForm
const submitCatchTarget = `    } catch (err) {
      console.error("Save offer error:", err);
      setError(err.response?.data?.message || "Error saving offer.");
    } finally {`;

const submitCatchReplacement = `    } catch (err) {
      console.error("Save offer error:", err);
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Error saving offer.";
      setError(errorMsg);
    } finally {`;

content = content.replace(submitCatchTarget, submitCatchReplacement);

// 4. Add error banner at the top of the modal form
const modalFormTarget = `            {/* Modal Body Form */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-6">
              {/* SECTION 1: Basic Information */}`;

const modalFormReplacement = `            {/* Modal Body Form */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-6">
              {/* Error banner inside modal */}
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span className="font-semibold">{error}</span>
                </div>
              )}

              {/* SECTION 1: Basic Information */}`;

content = content.replace(modalFormTarget, modalFormReplacement);

fs.writeFileSync(file, content, "utf8");
console.log("Successfully updated OfferManagement.jsx with in-modal error display!");

