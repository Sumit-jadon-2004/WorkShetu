const fs = require("fs");
const file = "Frontend/src/Pages/Common/PromotionsBanner.jsx";
let content = fs.readFileSync(file, "utf8");

const cardTarget = `              <div>
                {/* Header Tag */}
                <div className="flex items-center gap-2 mb-2">`;

const cardReplacement = `              {/* Uploaded Banner / Thumbnail Photo */}
              {offer.bannerUrl && (
                <div className="relative -mx-5 -mt-5 mb-3.5 h-36 w-[calc(100%+2.5rem)] overflow-hidden bg-slate-100">
                  <img
                    src={offer.bannerUrl}
                    alt={offer.title}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                </div>
              )}

              <div>
                {/* Header Tag */}
                <div className="flex items-center gap-2 mb-2">`;

content = content.replace(/\r\n/g, "\n");
const normTarget = cardTarget.replace(/\r\n/g, "\n");

if (!content.includes(normTarget)) {
  console.error("Card target not found in PromotionsBanner.jsx!");
  process.exit(1);
}

content = content.replace(normTarget, cardReplacement);
fs.writeFileSync(file, content, "utf8");
console.log("Updated PromotionsBanner.jsx with banner photo rendering!");

