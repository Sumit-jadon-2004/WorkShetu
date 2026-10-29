const fs = require("fs");
const file = "Frontend/src/Pages/Admin/Offers/OfferManagement.jsx";
let content = fs.readFileSync(file, "utf8");

// 1. In Table: show thumbnail image if item.bannerUrl exists
const tableImgTarget = `<div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
                            <Tag className="w-4 h-4" />
                          </div>`;

const tableImgReplacement = `{item.bannerUrl ? (
                            <img
                              src={item.bannerUrl}
                              alt={item.title}
                              className="w-10 h-10 rounded-lg object-cover border border-gray-200 bg-white flex-shrink-0 shadow-xs"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
                              <Tag className="w-5 h-5" />
                            </div>
                          )}`;

content = content.replace(/\r\n/g, "\n");
const normTableImgTarget = tableImgTarget.replace(/\r\n/g, "\n");

if (!content.includes(normTableImgTarget)) {
  console.error("Table img target not found!");
  process.exit(1);
}
content = content.replace(normTableImgTarget, tableImgReplacement);

// 2. In Dossier View Modal: show full banner image if viewingOffer.bannerUrl exists
const dossierTarget = `            <div className="space-y-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl space-y-1">`;

const dossierReplacement = `            {viewingOffer.bannerUrl && (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 max-h-48">
                <img
                  src={viewingOffer.bannerUrl}
                  alt={viewingOffer.title}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl space-y-1">`;

const normDossierTarget = dossierTarget.replace(/\r\n/g, "\n");
if (!content.includes(normDossierTarget)) {
  console.error("Dossier target not found!");
  process.exit(1);
}
content = content.replace(normDossierTarget, dossierReplacement);

fs.writeFileSync(file, content, "utf8");
console.log("Updated OfferManagement.jsx with table thumbnail and dossier photo!");

