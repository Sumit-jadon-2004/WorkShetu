const fs = require('fs');
const filePath = 'c:/CODING.FILES/Project-WorkShetu/Frontend/src/Pages/Farmer/TractorList.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import
if (!content.includes('import PromotionsBanner')) {
  const targetImport = 'import { useTheme } from "../../context/ThemeContext.jsx";';
  const newImport = 'import { useTheme } from "../../context/ThemeContext.jsx";\r\nimport PromotionsBanner from "../Common/PromotionsBanner.jsx";';
  content = content.replace(targetImport, newImport);
}

// 2. Add component
if (!content.includes('<PromotionsBanner service="Machine"')) {
  const targetSection = '<section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">';
  const newSection = '<section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">\r\n        <PromotionsBanner service="Machine" title="🚜 Special Tractor & Machinery Discounts" />';
  content = content.replace(targetSection, newSection);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('TractorList.jsx updated with PromotionsBanner');

