const fs = require("fs");
const file = "Frontend/src/Pages/Admin/Offers/OfferManagement.jsx";
let content = fs.readFileSync(file, "utf8");

const oldSubmitStart = `  // Save (Create or Update)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const startDateTime = new Date(\`\${formData.startDate}T\${formData.startTime || "00:00"}:00\`);
      const endDateTime = new Date(\`\${formData.endDate}T\${formData.endTime || "23:59"}:59\`);`;

const newSubmitStart = `  // Save (Create or Update)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");

      if (!formData.title || !formData.title.trim()) {
        setError("Please enter an offer title.");
        return;
      }

      if (!formData.isAutomatic && (!formData.code || !formData.code.trim())) {
        setError("Please enter a coupon code (or check 'Automatic Offer').");
        return;
      }

      if (formData.discountValue === "" || isNaN(Number(formData.discountValue)) || Number(formData.discountValue) <= 0) {
        setError("Please enter a valid discount value greater than 0.");
        return;
      }

      if (formData.discountType === "Percentage" && Number(formData.discountValue) > 100) {
        setError("Percentage discount cannot exceed 100%.");
        return;
      }

      if (!formData.startDate || !formData.endDate) {
        setError("Please select both start date and end date.");
        return;
      }

      const startDateTime = new Date(\`\${formData.startDate}T\${formData.startTime || "00:00"}:00\`);
      const endDateTime = new Date(\`\${formData.endDate}T\${formData.endTime || "23:59"}:59\`);

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        setError("Invalid date or time format.");
        return;
      }

      if (endDateTime <= startDateTime) {
        setError("End date and time must be after start date and time.");
        return;
      }

      setActionLoading(true);`;

content = content.replace(/\r\n/g, "\n");
const normOld = oldSubmitStart.replace(/\r\n/g, "\n");

if (!content.includes(normOld)) {
  console.error("Target not found!");
  process.exit(1);
}

content = content.replace(normOld, newSubmitStart);
fs.writeFileSync(file, content, "utf8");
console.log("Added client-side validation to OfferManagement.jsx successfully!");

