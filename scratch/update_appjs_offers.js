const fs = require('fs');
const filePath = 'c:/CODING.FILES/Project-WorkShetu/Backend/App.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import
if (!content.includes('adminOffersRoutes')) {
  const targetImport = 'const adminSettingsRoutes =\r\n    require("./routes/adminSettings.js");';
  const newImport = 'const adminSettingsRoutes =\r\n    require("./routes/adminSettings.js");\r\n\r\nconst adminOffersRoutes =\r\n    require("./routes/adminOffers.js");';
  
  if (content.includes(targetImport)) {
    content = content.replace(targetImport, newImport);
  } else {
    content = content.replace(
      'const adminSettingsRoutes =\n    require("./routes/adminSettings.js");',
      'const adminSettingsRoutes =\n    require("./routes/adminSettings.js");\n\nconst adminOffersRoutes =\n    require("./routes/adminOffers.js");'
    );
  }
}

// 2. Add route mount
if (!content.includes('adminOffersRoutes\r\n);') && !content.includes('adminOffersRoutes\n);')) {
  const targetMount = 'app.use(\r\n    "/api/admin",\r\n    adminSettingsRoutes\r\n);';
  const newMount = 'app.use(\r\n    "/api/admin",\r\n    adminSettingsRoutes\r\n);\r\n\r\napp.use(\r\n    "/api/admin",\r\n    adminOffersRoutes\r\n);';
  
  if (content.includes(targetMount)) {
    content = content.replace(targetMount, newMount);
  } else {
    content = content.replace(
      'app.use(\n    "/api/admin",\n    adminSettingsRoutes\n);',
      'app.use(\n    "/api/admin",\n    adminSettingsRoutes\n);\n\napp.use(\n    "/api/admin",\n    adminOffersRoutes\n);'
    );
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('App.js updated successfully with adminOffersRoutes');

