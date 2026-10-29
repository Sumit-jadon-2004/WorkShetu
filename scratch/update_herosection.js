const fs = require('fs');
const filePath = 'c:/CODING.FILES/Project-WorkShetu/Frontend/src/Pages/Public/HeroSection.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = '<div className="mx-auto max-w-[1250px]">';
const replacement = '<div className="mx-auto max-w-[1250px]">\r\n          <PromotionsBanner service="All" title="🌾 Exclusive Platform Offers & Seasonal Discounts" />';

if (!content.includes('PromotionsBanner service="All"')) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('HeroSection.jsx updated with PromotionsBanner');
} else {
  console.log('HeroSection.jsx already contains PromotionsBanner');
}

