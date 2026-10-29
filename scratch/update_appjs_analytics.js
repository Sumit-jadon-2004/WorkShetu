const fs = require('fs');
const filePath = 'c:/CODING.FILES/Project-WorkShetu/Backend/App.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import
if (!content.includes('adminAnalyticsRoutes')) {
  const targetImport = 'const adminComplaintsRoutes =\r\n    require("./routes/adminComplaints.js");';
  const newImport = 'const adminComplaintsRoutes =\r\n    require("./routes/adminComplaints.js");\r\n\r\nconst adminAnalyticsRoutes =\r\n    require("./routes/adminAnalytics.js");';
  
  if (content.includes(targetImport)) {
    content = content.replace(targetImport, newImport);
  } else {
    // try with \n
    content = content.replace(
      'const adminComplaintsRoutes =\n    require("./routes/adminComplaints.js");',
      'const adminComplaintsRoutes =\n    require("./routes/adminComplaints.js");\n\nconst adminAnalyticsRoutes =\n    require("./routes/adminAnalytics.js");'
    );
  }
}

// 2. Add route mount
if (!content.includes('adminAnalyticsRoutes\r\n);') && !content.includes('adminAnalyticsRoutes\n);')) {
  const targetMount = 'app.use(\r\n    "/api/admin",\r\n    adminComplaintsRoutes\r\n);';
  const newMount = 'app.use(\r\n    "/api/admin",\r\n    adminComplaintsRoutes\r\n);\r\n\r\napp.use(\r\n    "/api/admin",\r\n    adminAnalyticsRoutes\r\n);';
  
  if (content.includes(targetMount)) {
    content = content.replace(targetMount, newMount);
  } else {
    content = content.replace(
      'app.use(\n    "/api/admin",\n    adminComplaintsRoutes\n);',
      'app.use(\n    "/api/admin",\n    adminComplaintsRoutes\n);\n\napp.use(\n    "/api/admin",\n    adminAnalyticsRoutes\n);'
    );
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('App.js updated successfully with adminAnalyticsRoutes');

