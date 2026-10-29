const fs = require('fs');
const filePath = 'c:/CODING.FILES/Project-WorkShetu/Backend/App.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import
if (!content.includes('publicOffersRoutes')) {
  const targetImport = 'const adminOffersRoutes =\r\n    require("./routes/adminOffers.js");';
  const newImport = 'const adminOffersRoutes =\r\n    require("./routes/adminOffers.js");\r\n\r\nconst publicOffersRoutes =\r\n    require("./routes/publicOffers.js");';
  
  if (content.includes(targetImport)) {
    content = content.replace(targetImport, newImport);
  } else {
    content = content.replace(
      'const adminOffersRoutes =\n    require("./routes/adminOffers.js");',
      'const adminOffersRoutes =\n    require("./routes/adminOffers.js");\n\nconst publicOffersRoutes =\n    require("./routes/publicOffers.js");'
    );
  }
}

// 2. Add route mount
if (!content.includes('publicOffersRoutes\r\n);') && !content.includes('publicOffersRoutes\n);')) {
  const targetMount = 'app.use(\r\n    "/api/admin",\r\n    adminOffersRoutes\r\n);';
  const newMount = 'app.use(\r\n    "/api/admin",\r\n    adminOffersRoutes\r\n);\r\n\r\napp.use(\r\n    "/api/offers",\r\n    publicOffersRoutes\r\n);';
  
  if (content.includes(targetMount)) {
    content = content.replace(targetMount, newMount);
  } else {
    content = content.replace(
      'app.use(\n    "/api/admin",\n    adminOffersRoutes\n);',
      'app.use(\n    "/api/admin",\n    adminOffersRoutes\n);\n\napp.use(\n    "/api/offers",\n    publicOffersRoutes\n);'
    );
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('App.js updated successfully with publicOffersRoutes');

