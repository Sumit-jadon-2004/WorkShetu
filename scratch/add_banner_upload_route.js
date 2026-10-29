const fs = require("fs");
const file = "Backend/routes/adminOffers.js";
let content = fs.readFileSync(file, "utf8");

// 1. Add upload import
const importTarget = 'const { isLoggedIn, isAdmin } = require("../middleware/auth.js");';
const importReplacement = `const { isLoggedIn, isAdmin } = require("../middleware/auth.js");
const { upload } = require("../middleware/upload.js");`;

content = content.replace(importTarget, importReplacement);

// 2. Add upload route before /offers/:id
const routeTarget = `// ==========================================
// 2. GET SINGLE OFFER BY ID
// ==========================================
router.get("/offers/:id", isLoggedIn, isAdmin, async (req, res) => {`;

const routeReplacement = `// ==========================================
// 1.8. UPLOAD OFFER BANNER / THUMBNAIL IMAGE
// ==========================================
router.post("/offers/upload-image", isLoggedIn, isAdmin, (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      console.error("BANNER UPLOAD ERROR:", err);
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to upload image file.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file was provided for upload.",
      });
    }

    const imageUrl = req.file.path || req.file.url || req.file.secure_url;
    return res.json({
      success: true,
      message: "Banner photo uploaded successfully.",
      url: imageUrl,
      filename: req.file.filename,
    });
  });
});

// ==========================================
// 2. GET SINGLE OFFER BY ID
// ==========================================
router.get("/offers/:id", isLoggedIn, isAdmin, async (req, res) => {`;

content = content.replace(/\r\n/g, "\n");
const normTarget = routeTarget.replace(/\r\n/g, "\n");

if (!content.includes(normTarget)) {
  console.error("Route target not found in adminOffers.js!");
  process.exit(1);
}

content = content.replace(normTarget, routeReplacement);
fs.writeFileSync(file, content, "utf8");
console.log("Successfully added /offers/upload-image route to adminOffers.js");

