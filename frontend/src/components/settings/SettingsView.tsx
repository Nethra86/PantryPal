import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Laptop,
  ShieldCheck,
  Download,
  Check,
  Database,
  User,
  KeyRound,
  Server,
  WifiOff,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Dialog } from '../ui/Dialog';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { PantryItem } from '../../types';
import { api, UserProfileUpdateRequest } from '../../services/api';

export interface SettingsViewProps {
  user: {
    id?: number;
    name: string;
    email: string;
    theme_preference?: 'light' | 'dark' | 'system';
    dietary_preferences?: string;
    preferred_unit?: 'metric' | 'imperial';
  };
  onUpdateUser: (updated: {
    name: string;
    email: string;
    theme_preference?: 'light' | 'dark' | 'system';
    dietary_preferences?: string;
    preferred_unit?: 'metric' | 'imperial';
  }) => void;
  themePreference: 'light' | 'dark' | 'system';
  onChangeThemePreference: (pref: 'light' | 'dark' | 'system') => void;
  pantryItems: PantryItem[];
  onResetData?: () => Promise<void>;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', message: string) => void;
}

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'High-Protein',
  'Low-Carb',
  'Nut-Free',
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  onUpdateUser,
  themePreference,
  onChangeThemePreference,
  pantryItems,
  onResetData,
  onShowToast,
}) => {
  // Parse user dietary preferences
  const initialDiets = user.dietary_preferences
    ? user.dietary_preferences.split(',').map((s) => s.trim()).filter(Boolean)
    : ['Vegetarian', 'High-Protein'];

  const [selectedDiets, setSelectedDiets] = useState<string[]>(initialDiets);
  const [preferredUnit, setPreferredUnit] = useState<'metric' | 'imperial'>(
    user.preferred_unit === 'imperial' ? 'imperial' : 'metric'
  );

  // Profile Edit Modal State
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editEmail, setEditEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Export State
  const [exporting, setExporting] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const toggleDiet = async (diet: string) => {
    let updated: string[];
    if (selectedDiets.includes(diet)) {
      updated = selectedDiets.filter((d) => d !== diet);
      onShowToast('info', `Removed ${diet} dietary preference.`);
    } else {
      updated = [...selectedDiets, diet];
      onShowToast('success', `Added ${diet} dietary filter preference.`);
    }
    setSelectedDiets(updated);
    const joined = updated.join(',');
    try {
      await api.updateProfile({ dietary_preferences: joined });
      onUpdateUser({ ...user, dietary_preferences: joined });
    } catch {
      // Background save failed, keep local state
    }
  };

  const handleUnitChange = async (unit: 'metric' | 'imperial') => {
    setPreferredUnit(unit);
    onShowToast('info', `Set units to ${unit === 'metric' ? 'Metric (g, ml)' : 'Imperial (oz, cups)'}.`);
    try {
      await api.updateProfile({ preferred_unit: unit });
      onUpdateUser({ ...user, preferred_unit: unit });
    } catch {
      // Local state updated
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    if (!editName.trim()) {
      setProfileError('Name cannot be empty.');
      return;
    }
    if (!editEmail.trim() || !editEmail.includes('@')) {
      setProfileError('Please enter a valid email address.');
      return;
    }
    if (newPassword && newPassword.length < 8) {
      setProfileError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword && !currentPassword) {
      setProfileError('Please enter your current password to authorize password change.');
      return;
    }

    setSavingProfile(true);
    try {
      const payload: UserProfileUpdateRequest = {
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
      };
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }

      const updated = await api.updateProfile(payload);
      onUpdateUser({
        ...user,
        name: updated.name,
        email: updated.email,
      });

      setCurrentPassword('');
      setNewPassword('');
      setEditProfileOpen(false);
      onShowToast('success', 'Profile updated successfully!');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      await api.exportUserData();
      onShowToast('success', 'Authenticated JSON backup exported! Passwords & sessions strictly excluded.');
    } catch (err: any) {
      onShowToast('error', `Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto pb-12 text-left">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#1D2420] dark:text-[#F2F5F3]">
          Kitchen Settings & Preferences
        </h2>
        <p className="text-xs text-[#56645A] dark:text-[#A3B5AA] mt-1">
          Manage your account profile, visual theme, dietary filters, and data export.
        </p>
      </div>

      {/* 1. Account Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Account Profile</CardTitle>
          <CardDescription>
            Your chef profile credentials and authenticated account settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#FAF7F2] dark:bg-[#141C16] border border-[#E8E1D3] dark:border-[#23332A]">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#EBF2EC] dark:bg-[#1A2E21] text-[#1C3B2B] dark:text-emerald-300 flex items-center justify-center font-bold text-lg shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#1D2420] dark:text-[#F2F5F3]">
                  {user.name}
                </h3>
                <p className="text-xs text-[#56645A] dark:text-[#A3B5AA]">
                  {user.email}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="ready" size="sm">
                    Verified Account
                  </Badge>
                  <span className="text-[11px] text-[#56645A] dark:text-[#87968B]">
                    HttpOnly Session Active
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<KeyRound className="w-3.5 h-3.5" />}
              onClick={() => {
                setEditName(user.name);
                setEditEmail(user.email);
                setCurrentPassword('');
                setNewPassword('');
                setProfileError(null);
                setEditProfileOpen(true);
              }}
            >
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Theme & Appearance (Light / Dark / System) */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance & Ambience</CardTitle>
          <CardDescription>
            Choose your preferred theme. Your choice is persistently saved to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Warm Ivory */}
            <button
              onClick={() => onChangeThemePreference('light')}
              className={`p-4 rounded-2xl border text-left flex items-start justify-between transition-all ${
                themePreference === 'light'
                  ? 'border-[#1C3B2B] bg-[#FAF7F2] ring-2 ring-[#1C3B2B]/20 shadow-sm'
                  : 'border-[#E8E1D3] dark:border-[#23332A] hover:bg-[#F2ECE2] dark:hover:bg-[#1C2720]'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-sm text-[#1D2420] dark:text-[#F2F5F3]">
                  <Sun className="w-4 h-4 text-[#B46A1B]" />
                  <span>Warm Ivory</span>
                </div>
                <p className="text-xs text-[#56645A] dark:text-[#A3B5AA] leading-relaxed">
                  Linen light backgrounds and deep forest pine text.
                </p>
              </div>
              {themePreference === 'light' && (
                <div className="w-5 h-5 rounded-full bg-[#1C3B2B] text-white flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </button>

            {/* Midnight Forest */}
            <button
              onClick={() => onChangeThemePreference('dark')}
              className={`p-4 rounded-2xl border text-left flex items-start justify-between transition-all ${
                themePreference === 'dark'
                  ? 'border-emerald-500 bg-[#16211B] ring-2 ring-emerald-500/20 shadow-sm'
                  : 'border-[#E8E1D3] dark:border-[#23332A] hover:bg-[#F2ECE2] dark:hover:bg-[#1C2720]'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-sm text-[#1D2420] dark:text-[#F2F5F3]">
                  <Moon className="w-4 h-4 text-[#8DB896]" />
                  <span>Midnight Forest</span>
                </div>
                <p className="text-xs text-[#56645A] dark:text-[#A3B5AA] leading-relaxed">
                  Deep charcoal-pine palette with gentle herbal accents.
                </p>
              </div>
              {themePreference === 'dark' && (
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-[#062415] flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </button>

            {/* System Default */}
            <button
              onClick={() => onChangeThemePreference('system')}
              className={`p-4 rounded-2xl border text-left flex items-start justify-between transition-all ${
                themePreference === 'system'
                  ? 'border-[#56735D] bg-[#EBF2EC] dark:bg-[#18261D] ring-2 ring-[#56735D]/20 shadow-sm'
                  : 'border-[#E8E1D3] dark:border-[#23332A] hover:bg-[#F2ECE2] dark:hover:bg-[#1C2720]'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-sm text-[#1D2420] dark:text-[#F2F5F3]">
                  <Laptop className="w-4 h-4 text-[#56735D] dark:text-emerald-400" />
                  <span>System Default</span>
                </div>
                <p className="text-xs text-[#56645A] dark:text-[#A3B5AA] leading-relaxed">
                  Automatically syncs with your device operating system theme.
                </p>
              </div>
              {themePreference === 'system' && (
                <div className="w-5 h-5 rounded-full bg-[#56735D] text-white flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Dietary Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Dietary Preferences</CardTitle>
          <CardDescription>
            Highlight recipes matching your dietary choices during discovery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((diet) => {
              const active = selectedDiets.includes(diet);
              return (
                <button
                  key={diet}
                  onClick={() => toggleDiet(diet)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    active
                      ? 'bg-[#1C3B2B] text-white border-[#1C3B2B] dark:bg-emerald-500 dark:text-[#062415] dark:border-emerald-500 shadow-sm'
                      : 'bg-white dark:bg-[#16201A] text-[#56645A] dark:text-[#A3B5AA] border-[#E2DBD0] dark:border-[#25362C] hover:border-[#1C3B2B]'
                  }`}
                >
                  {active && <span className="mr-1.5">✓</span>}
                  {diet}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 4. Units of Measurement */}
      <Card>
        <CardHeader>
          <CardTitle>Units of Measurement</CardTitle>
          <CardDescription>
            Choose your preferred recipe and pantry ingredient unit system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleUnitChange('metric')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                preferredUnit === 'metric'
                  ? 'bg-[#EBF2EC] text-[#1C3B2B] border-[#C8D9CB] dark:bg-[#182B1E] dark:text-emerald-400'
                  : 'bg-white dark:bg-[#16201A] text-[#56645A] dark:text-[#A3B5AA] border-[#E2DBD0] dark:border-[#25362C]'
              }`}
            >
              Metric (g, kg, ml)
            </button>
            <button
              onClick={() => handleUnitChange('imperial')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                preferredUnit === 'imperial'
                  ? 'bg-[#EBF2EC] text-[#1C3B2B] border-[#C8D9CB] dark:bg-[#182B1E] dark:text-emerald-400'
                  : 'bg-white dark:bg-[#16201A] text-[#56645A] dark:text-[#A3B5AA] border-[#E2DBD0] dark:border-[#25362C]'
              }`}
            >
              Imperial (cups, oz, lbs)
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 5. Authenticated Data Export & Privacy Guard */}
      <Card>
        <CardHeader>
          <CardTitle>Data Backup & Privacy</CardTitle>
          <CardDescription>
            Download your full kitchen records. Data exports strictly exclude passwords and active session tokens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#FAF7F2] dark:bg-[#141C16] border border-[#E8E1D3] dark:border-[#23332A]">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1D2420] dark:text-[#F2F5F3]">
                <Database className="w-4 h-4 text-[#56735D] dark:text-emerald-400" />
                <span>Export Authenticated JSON Backup</span>
              </div>
              <p className="text-xs text-[#56645A] dark:text-[#A3B5AA]">
                Includes your pantry inventory ({pantryItems.length} items), shopping lists, meal plans, and saved favorites.
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-[#56735D] dark:text-emerald-400 font-semibold pt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Security Guarantee: Password hashes & session tokens are NEVER exported.</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={handleExportData}
              disabled={exporting}
            >
              {exporting ? 'Generating...' : 'Export JSON'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 6. Offline vs. Live Backend Architecture Card */}
      <Card>
        <CardHeader>
          <CardTitle>Architecture & Offline Capabilities</CardTitle>
          <CardDescription>
            Transparent guide to which features work offline versus those requiring the running FastAPI backend.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Offline capabilities */}
            <div className="p-4 rounded-2xl bg-[#FAF7F2] dark:bg-[#141C16] border border-[#E8E1D3] dark:border-[#23332A] space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1C3B2B] dark:text-emerald-400">
                <WifiOff className="w-4 h-4" />
                <span>Offline PWA Shell (Service Worker)</span>
              </div>
              <ul className="text-xs text-[#56645A] dark:text-[#A3B5AA] space-y-1.5 list-disc list-inside leading-relaxed">
                <li>Instant shell loading via cached HTML, CSS, JS, and fonts.</li>
                <li>Responsive mobile layout, navigation, and theme switches.</li>
                <li>Installed standalone web app icon and display mode.</li>
                <li>Zero-data exposure: API requests are NEVER cached offline.</li>
              </ul>
            </div>

            {/* Backend capabilities */}
            <div className="p-4 rounded-2xl bg-[#FAF7F2] dark:bg-[#141C16] border border-[#E8E1D3] dark:border-[#23332A] space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#B46A1B] dark:text-[#F59E0B]">
                <Server className="w-4 h-4" />
                <span>Live Backend Required (FastAPI & SQLite)</span>
              </div>
              <ul className="text-xs text-[#56645A] dark:text-[#A3B5AA] space-y-1.5 list-disc list-inside leading-relaxed">
                <li>HttpOnly cookie session authentication & CSRF validation.</li>
                <li>Real-time recipe matching engine & pantry deduction.</li>
                <li>Intelligent ingredient alias normalization & unit conversions.</li>
                <li>Cross-user data isolation and secure JSON data export.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 7. Reset Inventory to Starter Stock */}
      <Card>
        <CardHeader>
          <CardTitle>Reset Kitchen Data</CardTitle>
          <CardDescription>
            Restore fresh sample recipes and starter staples into your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/30">
            <div>
              <p className="text-xs font-bold text-[#1D2420] dark:text-[#F2F5F3]">
                Restore Starter Stock
              </p>
              <p className="text-xs text-[#56645A] dark:text-[#A3B5AA] mt-0.5">
                Pre-populate 10 classic kitchen staples without overwriting your custom items.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetConfirmOpen(true)}
            >
              Load Sample Staples
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={async () => {
          if (onResetData) await onResetData();
        }}
        title="Load Starter Kitchen Staples?"
        description="This will add standard pantry staples (olive oil, eggs, garlic, pasta...) to your pantry."
        confirmText="Load Staples"
      />

      {/* Profile Edit Dialog */}
      <Dialog
        isOpen={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        title="Edit Chef Profile"
        description="Update your account name, email address, or update your password."
        maxWidth="md"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {profileError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1D2420] dark:text-[#F2F5F3]">
              Full Name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-sm bg-white dark:bg-[#16201A] border border-[#E2DBD0] dark:border-[#25362C] text-[#1D2420] dark:text-[#F2F5F3] focus:outline-none focus:ring-2 focus:ring-[#1C3B2B]/20"
              placeholder="Your name"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1D2420] dark:text-[#F2F5F3]">
              Email Address
            </label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-sm bg-white dark:bg-[#16201A] border border-[#E2DBD0] dark:border-[#25362C] text-[#1D2420] dark:text-[#F2F5F3] focus:outline-none focus:ring-2 focus:ring-[#1C3B2B]/20"
              placeholder="name@kitchen.local"
              required
            />
          </div>

          <div className="pt-2 border-t border-[#EAE3D6] dark:border-[#223026] space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1D2420] dark:text-[#F2F5F3]">
              <Lock className="w-3.5 h-3.5 text-[#56735D]" />
              <span>Change Password (Optional)</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#56645A] dark:text-[#A3B5AA]">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl text-sm bg-white dark:bg-[#16201A] border border-[#E2DBD0] dark:border-[#25362C] text-[#1D2420] dark:text-[#F2F5F3] focus:outline-none focus:ring-2 focus:ring-[#1C3B2B]/20"
                placeholder="Enter current password to authorize change"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#56645A] dark:text-[#A3B5AA]">
                New Password (minimum 8 characters)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl text-sm bg-white dark:bg-[#16201A] border border-[#E2DBD0] dark:border-[#25362C] text-[#1D2420] dark:text-[#F2F5F3] focus:outline-none focus:ring-2 focus:ring-[#1C3B2B]/20"
                placeholder="New secure password"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditProfileOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={savingProfile}
            >
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
