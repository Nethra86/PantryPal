import React from 'react';

interface RecipeArtProps {
  cuisine?: string;
  mealType?: string;
  title?: string;
  className?: string;
}

export const RecipeArt: React.FC<RecipeArtProps> = ({
  cuisine: _cuisine = 'International',
  mealType: _mealType = 'Dinner',
  title = '',
  className = 'w-full h-full',
}) => {
  const t = title.toLowerCase();

  // Return stylized vector culinary illustrations
  if (t.includes('chicken') || t.includes('tuscan')) {
    return (
      <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="240" fill="#2A3D32" />
        <circle cx="200" cy="120" r="85" fill="#1E2B23" />
        <circle cx="200" cy="120" r="75" stroke="#486352" strokeWidth="2" strokeDasharray="4 4" />
        {/* Pan handle */}
        <path d="M70 120H115" stroke="#8DA695" strokeWidth="12" strokeLinecap="round" />
        {/* Chicken cutlet */}
        <ellipse cx="195" cy="115" rx="45" ry="32" fill="#D98A44" />
        <ellipse cx="190" cy="110" rx="35" ry="24" fill="#E8A86B" />
        {/* Garlic Cream sauce ripples */}
        <path d="M160 115C175 130 220 135 235 118" stroke="#F5ECD7" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
        {/* Spinach leaves */}
        <path d="M220 95C225 85 240 90 235 105C230 110 215 105 220 95Z" fill="#3D6A4D" />
        <path d="M165 135C158 128 170 120 178 130C182 136 172 142 165 135Z" fill="#4B7E5C" />
        {/* Sun-dried tomato slices */}
        <circle cx="215" cy="130" r="7" fill="#B33E32" />
        <circle cx="175" cy="95" r="6" fill="#C44B3F" />
      </svg>
    );
  }

  if (t.includes('carbonara') || t.includes('pasta') || t.includes('spaghetti')) {
    return (
      <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="240" fill="#2E332E" />
        <circle cx="200" cy="120" r="80" fill="#F7F3EB" />
        <circle cx="200" cy="120" r="72" fill="#EDE7DA" />
        {/* Spaghetti swirl */}
        <path d="M160 110C170 90 210 85 230 105C250 125 210 150 180 135C160 125 185 95 215 110C235 120 220 140 195 130" stroke="#E5B25D" strokeWidth="8" strokeLinecap="round" />
        <path d="M170 125C185 140 225 130 230 110" stroke="#F3C87B" strokeWidth="6" strokeLinecap="round" />
        {/* Crispy Guanciale / Bacon bits */}
        <rect x="180" y="100" width="10" height="7" rx="2" fill="#84322C" />
        <rect x="210" y="125" width="12" height="8" rx="2" fill="#752B26" />
        <rect x="195" y="140" width="9" height="6" rx="2" fill="#84322C" />
        {/* Fresh cracked black pepper flecks */}
        <circle cx="170" cy="105" r="1.5" fill="#1C1F1D" />
        <circle cx="225" cy="100" r="1.5" fill="#1C1F1D" />
        <circle cx="190" cy="120" r="1.5" fill="#1C1F1D" />
        <circle cx="205" cy="135" r="1.5" fill="#1C1F1D" />
        {/* Pecorino / Egg yolk gloss */}
        <circle cx="200" cy="115" r="14" fill="#FFA726" fillOpacity="0.85" />
      </svg>
    );
  }

  if (t.includes('dahl') || t.includes('curry') || t.includes('lentil')) {
    return (
      <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="240" fill="#25352B" />
        {/* Ceramic bowl */}
        <circle cx="200" cy="120" r="80" fill="#3A4D40" />
        <circle cx="200" cy="120" r="70" fill="#D9822B" />
        {/* Coconut cream swirl */}
        <path d="M170 115C180 95 210 95 220 110C230 125 210 140 190 135" stroke="#FFF7ED" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
        {/* Herbs */}
        <circle cx="200" cy="110" r="3" fill="#2D5A3A" />
        <circle cx="210" cy="125" r="3" fill="#3D734E" />
        <circle cx="185" cy="130" r="2.5" fill="#2D5A3A" />
        {/* Chili oil ring */}
        <circle cx="200" cy="120" r="55" stroke="#C2410C" strokeWidth="2.5" strokeDasharray="6 8" />
      </svg>
    );
  }

  if (t.includes('shakshuka')) {
    return (
      <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="240" fill="#243329" />
        {/* Cast iron skillet */}
        <circle cx="200" cy="120" r="82" fill="#1A241E" />
        <path d="M280 120H325" stroke="#1A241E" strokeWidth="14" strokeLinecap="round" />
        {/* Spiced Tomato stew */}
        <circle cx="200" cy="120" r="72" fill="#BA3C2A" />
        {/* 3 Poached eggs */}
        <ellipse cx="180" cy="100" rx="16" ry="14" fill="#FAF6EE" />
        <circle cx="180" cy="100" r="7" fill="#F59E0B" />
        <ellipse cx="220" cy="110" rx="16" ry="14" fill="#FAF6EE" />
        <circle cx="220" cy="110" r="7" fill="#F59E0B" />
        <ellipse cx="190" cy="140" rx="16" ry="14" fill="#FAF6EE" />
        <circle cx="190" cy="140" r="7" fill="#F59E0B" />
        {/* Crumbled feta & parsley */}
        <rect x="200" y="90" width="5" height="5" fill="#FFFFFF" />
        <rect x="165" y="125" width="6" height="5" fill="#FFFFFF" />
        <circle cx="205" cy="135" r="3" fill="#2F663E" />
      </svg>
    );
  }

  if (t.includes('salmon')) {
    return (
      <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="240" fill="#1C2B22" />
        <ellipse cx="200" cy="120" rx="90" ry="70" fill="#FAFAF9" />
        <ellipse cx="200" cy="120" rx="82" ry="62" fill="#F0EDE6" />
        {/* Salmon fillet */}
        <path d="M150 110C165 95 235 95 250 110C240 135 160 135 150 110Z" fill="#F87171" />
        <path d="M155 112C165 102 230 102 245 112" stroke="#FEF2F2" strokeWidth="2" strokeDasharray="8 6" />
        <path d="M150 110C165 118 235 118 250 110" stroke="#DC2626" strokeWidth="3" />
        {/* Lemon wheel */}
        <circle cx="240" cy="130" r="14" fill="#FDE047" stroke="#CA8A04" strokeWidth="2" />
        {/* Herb sprig */}
        <path d="M165 130C175 140 195 138 205 130" stroke="#15803D" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (t.includes('pancake')) {
    return (
      <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="240" fill="#2C3830" />
        <ellipse cx="200" cy="140" rx="85" ry="60" fill="#F4EFE6" />
        {/* Stack of 3 golden pancakes */}
        <ellipse cx="200" cy="140" rx="55" ry="24" fill="#D97706" />
        <ellipse cx="200" cy="125" rx="52" ry="22" fill="#EA580C" />
        <ellipse cx="200" cy="120" rx="52" ry="20" fill="#F59E0B" />
        <ellipse cx="200" cy="105" rx="48" ry="18" fill="#FBBF24" />
        {/* Butter square */}
        <rect x="192" y="94" width="16" height="12" rx="2" fill="#FEF08A" stroke="#EAB308" strokeWidth="1.5" />
        {/* Maple syrup drip */}
        <path d="M190 105C190 115 185 125 180 130" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }

  // Default elegant pantry harvest scene
  return (
    <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="240" fill="#1F2D25" />
      <circle cx="200" cy="120" r="75" fill="#2A3D32" />
      <circle cx="200" cy="120" r="65" stroke="#3D5A49" strokeWidth="2" strokeDasharray="6 6" />
      {/* Wooden bowl / cutting board */}
      <ellipse cx="200" cy="130" rx="50" ry="25" fill="#8C5C38" />
      {/* Fresh herbs, olive and tomato */}
      <circle cx="185" cy="115" r="14" fill="#DC2626" />
      <circle cx="215" cy="118" r="11" fill="#4ADE80" />
      <ellipse cx="200" cy="108" rx="8" ry="12" fill="#22C55E" />
      {/* Steam lines */}
      <path d="M190 85C193 80 190 75 194 70" stroke="#A7F3D0" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      <path d="M205 82C208 77 205 72 209 67" stroke="#A7F3D0" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
};
