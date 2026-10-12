import React from 'react';

export const EmptyPantryIllustration: React.FC<{ className?: string }> = ({ className = 'w-36 h-36' }) => (
  <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Shelf */}
    <rect x="25" y="145" width="150" height="8" rx="4" fill="#C2AD93" />
    <path d="M45 153L40 170" stroke="#9E876F" strokeWidth="4" strokeLinecap="round" />
    <path d="M155 153L160 170" stroke="#9E876F" strokeWidth="4" strokeLinecap="round" />
    {/* Glass Jar 1 (Olive Oil / Grains) */}
    <rect x="50" y="85" width="34" height="60" rx="6" fill="#F4EFE6" stroke="#56735D" strokeWidth="2.5" />
    <rect x="58" y="77" width="18" height="8" rx="2" fill="#8C6747" />
    <rect x="55" y="105" width="24" height="35" rx="3" fill="#D98A44" fillOpacity="0.6" />
    {/* Spice Jar 2 */}
    <rect x="95" y="100" width="26" height="45" rx="5" fill="#F4EFE6" stroke="#56735D" strokeWidth="2" />
    <rect x="100" y="93" width="16" height="7" rx="2" fill="#8C6747" />
    <circle cx="108" cy="122" r="7" fill="#B46A1B" fillOpacity="0.7" />
    {/* Herb Sprig */}
    <path d="M138 145C138 120 148 100 155 90" stroke="#56735D" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M142 125C148 122 153 125 154 130" stroke="#56735D" strokeWidth="2" strokeLinecap="round" />
    <path d="M148 105C144 100 138 102 136 107" stroke="#56735D" strokeWidth="2" strokeLinecap="round" />
    {/* Gentle sparkle */}
    <circle cx="130" cy="70" r="3" fill="#6F8F72" />
    <circle cx="80" cy="65" r="2" fill="#6F8F72" />
  </svg>
);

export const EmptyRecipeIllustration: React.FC<{ className?: string }> = ({ className = 'w-36 h-36' }) => (
  <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Open Recipe Book */}
    <path d="M40 75C65 70 95 80 100 90C105 80 135 70 160 75V145C135 140 105 150 100 160C95 150 65 140 40 145V75Z" fill="#FAF6EE" stroke="#1C3B2B" strokeWidth="3" />
    <line x1="100" y1="90" x2="100" y2="160" stroke="#56735D" strokeWidth="2.5" />
    {/* Text lines */}
    <line x1="55" y1="98" x2="85" y2="98" stroke="#87968B" strokeWidth="2" strokeLinecap="round" />
    <line x1="55" y1="112" x2="80" y2="112" stroke="#87968B" strokeWidth="2" strokeLinecap="round" />
    <line x1="55" y1="126" x2="75" y2="126" stroke="#87968B" strokeWidth="2" strokeLinecap="round" />
    {/* Right page small sketch */}
    <circle cx="130" cy="110" r="14" stroke="#56735D" strokeWidth="2" strokeDasharray="3 3" />
    <circle cx="130" cy="110" r="4" fill="#B46A1B" />
    {/* Wooden Spoon resting on top */}
    <ellipse cx="60" cy="45" rx="12" ry="18" transform="rotate(-30 60 45)" fill="#B08968" stroke="#8C6747" strokeWidth="2" />
    <path d="M68 56L115 110" stroke="#8C6747" strokeWidth="5" strokeLinecap="round" />
  </svg>
);

export const EmptyGroceryIllustration: React.FC<{ className?: string }> = ({ className = 'w-36 h-36' }) => (
  <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Canvas Market Tote */}
    <path d="M50 85L60 160C61 166 66 170 72 170H128C134 170 139 166 140 160L150 85H50Z" fill="#ECE5D8" stroke="#1C3B2B" strokeWidth="3" />
    {/* Straps */}
    <path d="M75 85V55C75 45 85 38 100 38C115 38 125 45 125 55V85" stroke="#1C3B2B" strokeWidth="3.5" fill="none" />
    {/* Leek / Greens poking out */}
    <path d="M90 85L80 50C78 45 70 42 65 48" stroke="#3D6A4D" strokeWidth="5" strokeLinecap="round" />
    <path d="M102 85L110 52C112 44 122 45 125 52" stroke="#56735D" strokeWidth="4.5" strokeLinecap="round" />
    {/* Carrot poking out */}
    <path d="M115 85L135 60" stroke="#EA580C" strokeWidth="7" strokeLinecap="round" />
    <path d="M135 60L142 50" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" />
    {/* Clean checkmark badge */}
    <circle cx="145" cy="140" r="16" fill="#1C3B2B" />
    <path d="M138 140L143 145L152 135" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const EmptyPlanIllustration: React.FC<{ className?: string }> = ({ className = 'w-36 h-36' }) => (
  <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Calendar grid board */}
    <rect x="40" y="45" width="120" height="125" rx="10" fill="#FAF6EE" stroke="#1C3B2B" strokeWidth="3" />
    <rect x="40" y="45" width="120" height="28" rx="10" fill="#1C3B2B" />
    {/* Spiral binders */}
    <rect x="60" y="38" width="6" height="14" rx="3" fill="#8C6747" />
    <rect x="97" y="38" width="6" height="14" rx="3" fill="#8C6747" />
    <rect x="134" y="38" width="6" height="14" rx="3" fill="#8C6747" />
    {/* Grid slots */}
    <rect x="52" y="85" width="26" height="22" rx="4" fill="#EBF2EC" stroke="#C8D9CB" strokeWidth="1.5" />
    <rect x="87" y="85" width="26" height="22" rx="4" fill="#EBF2EC" stroke="#C8D9CB" strokeWidth="1.5" />
    <rect x="122" y="85" width="26" height="22" rx="4" fill="#EBF2EC" stroke="#C8D9CB" strokeWidth="1.5" />
    <rect x="52" y="118" width="26" height="22" rx="4" fill="#EBF2EC" stroke="#C8D9CB" strokeWidth="1.5" />
    <rect x="87" y="118" width="26" height="22" rx="4" fill="#FEF7ED" stroke="#F3DCBD" strokeWidth="1.5" />
    <rect x="122" y="118" width="26" height="22" rx="4" fill="#EBF2EC" stroke="#C8D9CB" strokeWidth="1.5" />
    {/* Olive leaf accent */}
    <circle cx="100" cy="129" r="4" fill="#B46A1B" />
  </svg>
);
