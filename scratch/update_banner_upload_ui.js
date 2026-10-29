const fs = require("fs");
const file = "Frontend/src/Pages/Admin/Offers/OfferManagement.jsx";
let content = fs.readFileSync(file, "utf8");

// 1. Add useRef to react import
content = content.replace(
  'import { useEffect, useState } from "react";',
  'import { useEffect, useRef, useState } from "react";'
);

// 2. Add Upload and Image as ImageIcon to lucide-react import
content = content.replace(
  "  Trash2,\n  Users,",
  "  Trash2,\n  Upload,\n  Image as ImageIcon,\n  Users,"
);

// 3. Add fileInputRef, uploadingImage, and uploadError states + handleImageFileUpload
const stateTarget = "  const [analyticsLoading, setAnalyticsLoading] = useState(false);";
const stateReplacement = `  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const fileInputRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleImageFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image file size exceeds 5MB limit. Please choose a smaller file.");
      return;
    }

    try {
      setUploadingImage(true);
      setUploadError("");

      const uploadData = new FormData();
      uploadData.append("image", file);

      const response = await axios.post("/api/admin/offers/upload-image", uploadData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      if (response.data.success && response.data.url) {
        setFormData((prev) => ({ ...prev, bannerUrl: response.data.url }));
        setSuccess("Banner photo uploaded successfully!");
      } else {
        setUploadError(response.data.message || "Failed to upload image.");
      }
    } catch (err) {
      console.error("Banner upload error:", err);
      setUploadError(err.response?.data?.message || "Failed to upload image to server.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };`;

content = content.replace(stateTarget, stateReplacement);

// 4. Replace banner input section with dual Photo Upload + URL input and live preview
const bannerFieldTarget = `                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Banner / Thumbnail Image URL
                    </label>
                    <input
                      type="url"
                      value={formData.bannerUrl}
                      onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                      placeholder="https://... (Optional banner for homepage showcase)"
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>`;

const bannerFieldReplacement = `                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                      <span>Banner / Thumbnail Photo</span>
                      <span className="text-[11px] text-gray-400 font-normal">Upload photo OR enter image URL</span>
                    </label>

                    {/* Image Preview if bannerUrl is present */}
                    {formData.bannerUrl ? (
                      <div className="relative rounded-xl border border-gray-200 bg-gray-50 p-2.5 overflow-hidden mb-2.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={formData.bannerUrl}
                            alt="Banner Preview"
                            className="w-24 h-16 rounded-lg object-cover border border-gray-200 bg-white"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-800">Banner photo selected</p>
                            <p className="text-[11px] text-gray-400 truncate font-mono mt-0.5">{formData.bannerUrl}</p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingImage}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
                              >
                                <Upload className="w-3 h-3" /> Change Photo
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, bannerUrl: "" })}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700"
                              >
                                <Trash2 className="w-3 h-3" /> Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Drag & drop or click upload area */
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className={\`cursor-pointer border-2 border-dashed rounded-xl p-4 text-center transition mb-2.5 \${
                          uploadingImage
                            ? "border-emerald-400 bg-emerald-50/50"
                            : "border-gray-200 hover:border-emerald-400 hover:bg-gray-50/70"
                        }\`}
                      >
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                            {uploadingImage ? (
                              <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                              <Upload className="w-5 h-5" />
                            )}
                          </div>
                          <p className="text-xs font-bold text-gray-800">
                            {uploadingImage ? "Uploading photo to Cloudinary..." : "Click to upload banner photo from device"}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            Supports JPG, PNG, WEBP (Max 5MB)
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Hidden file input for photo upload */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />

                    {/* Direct Image URL input + Upload button */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <ImageIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="url"
                          value={formData.bannerUrl}
                          onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                          placeholder="Or paste direct image URL (https://...)"
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 whitespace-nowrap"
                      >
                        <Upload className="w-3.5 h-3.5 text-gray-500" />
                        <span>Upload Photo</span>
                      </button>
                    </div>

                    {uploadError && (
                      <p className="text-xs font-semibold text-rose-600 mt-1.5">{uploadError}</p>
                    )}
                  </div>`;

content = content.replace(/\r\n/g, "\n");
const normBannerTarget = bannerFieldTarget.replace(/\r\n/g, "\n");

if (!content.includes(normBannerTarget)) {
  console.error("Banner field target not found!");
  process.exit(1);
}

content = content.replace(normBannerTarget, bannerFieldReplacement);
fs.writeFileSync(file, content, "utf8");
console.log("Successfully added Banner Photo Upload to OfferManagement.jsx!");

