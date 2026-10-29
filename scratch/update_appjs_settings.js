const fs = require('fs');
const filePath = 'c:/CODING.FILES/Project-WorkShetu/Backend/App.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import
if (!content.includes('adminSettingsRoutes')) {
  const targetImport = 'const adminAnalyticsRoutes =\r\n    require("./routes/adminAnalytics.js");';
  const newImport = 'const adminAnalyticsRoutes =\r\n    require("./routes/adminAnalytics.js");\r\n\r\nconst adminSettingsRoutes =\r\n    require("./routes/adminSettings.js");';
  
  if (content.includes(targetImport)) {
    content = content.replace(targetImport, newImport);
  } else {
    content = content.replace(
      'const adminAnalyticsRoutes =\n    require("./routes/adminAnalytics.js");',
      'const adminAnalyticsRoutes =\n    require("./routes/adminAnalytics.js");\n\nconst adminSettingsRoutes =\n    require("./routes/adminSettings.js");'
    );
  }
}

// 2. Add route mount
if (!content.includes('adminSettingsRoutes\r\n);') && !content.includes('adminSettingsRoutes\n);')) {
  const targetMount = 'app.use(\r\n    "/api/admin",\r\n    adminAnalyticsRoutes\r\n);';
  const newMount = 'app.use(\r\n    "/api/admin",\r\n    adminAnalyticsRoutes\r\n);\r\n\r\napp.use(\r\n    "/api/admin",\r\n    adminSettingsRoutes\r\n);';
  
  if (content.includes(targetMount)) {
    content = content.replace(targetMount, newMount);
  } else {
    content = content.replace(
      'app.use(\n    "/api/admin",\n    adminAnalyticsRoutes\n);',
      'app.use(\n    "/api/admin",\n    adminAnalyticsRoutes\n);\n\napp.use(\n    "/api/admin",\n    adminSettingsRoutes\n);'
    );
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('App.js updated successfully with adminSettingsRoutes');

