const fs = require('fs');

function verifyImports(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const lucideMatches = code.match(/import\s*\{([^}]+)\}\s*from\s*["']lucide-react["']/);
  if (!lucideMatches) {
    console.log(filePath, 'No lucide-react import found');
    return;
  }
  const imported = new Set(lucideMatches[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]).filter(Boolean));
  const tags = [...code.matchAll(/<([A-Z][a-zA-Z0-9]*)/g)].map(m => m[1]);
  const missing = [];
  tags.forEach(t => {
    if (['Link', 'Navbar', 'UnifiedBadge', 'CardSkeleton', 'TableSkeleton', 'EmptyState', 'PaginationBar'].includes(t)) return;
    if (!imported.has(t)) missing.push(t);
  });
  console.log(filePath, 'Missing Lucide icons:', missing);
}

verifyImports('Frontend/src/Pages/Farmer/MachineDetails.jsx');
verifyImports('Frontend/src/Pages/Common/PromotionsBanner.jsx');
verifyImports('Frontend/src/Pages/Admin/Offers/OfferManagement.jsx');

