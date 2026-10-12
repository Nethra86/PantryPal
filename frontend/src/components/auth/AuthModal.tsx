import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Leaf, Lock, Mail, ArrowRight, AlertCircle, User as UserIcon } from 'lucide-react';
import { api, UserProfile } from '../../services/api';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated,
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('Chef Rowan');
  const [email, setEmail] = useState('rowan@kitchen.local');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (password.length < 8) {
          setErrorMessage('Password must be at least 8 characters long.');
          setLoading(false);
          return;
        }
        const res = await api.register({
          name: name.trim(),
          email: email.trim(),
          password,
        });
        onAuthenticated(res.user);
        onClose();
      } else {
        const res = await api.login({
          email: email.trim(),
          password,
        });
        onAuthenticated(res.user);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestQuickFill = () => {
    // Fill in default seed credentials for quick demo
    setEmail('rowan@kitchen.local');
    setPassword('Password123!');
    setIsRegister(false);
    setErrorMessage(null);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidth="sm">
      <div className="flex flex-col items-center text-center space-y-4 pt-1">
        {/* Logo Badge */}
        <div className="w-12 h-12 rounded-2xl bg-[#1C3B2B] dark:bg-emerald-500/20 text-[#FAF7F2] dark:text-emerald-300 flex items-center justify-center shadow-sm border border-[#162E21] dark:border-emerald-500/30">
          <Leaf className="w-6 h-6 fill-current" />
        </div>

        <div>
          <h3 className="text-xl font-bold tracking-tight text-[#1D2420] dark:text-[#F2F5F3]">
            {isRegister ? 'Create Kitchen Account' : 'Welcome to PantryPal'}
          </h3>
          <p className="text-xs text-[#56645A] dark:text-[#A3B5AA] mt-1 max-w-xs mx-auto">
            Your serene kitchen companion. All recipes, stock, and plans are securely isolated to your account.
          </p>
        </div>

        {errorMessage && (
          <div className="w-full p-3 rounded-2xl bg-[#FBF0EF] dark:bg-[#2A1515] border border-[#F3C5C3] dark:border-[#522222] text-[#A33A38] dark:text-[#F87171] text-xs flex items-start gap-2 text-left animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-3 pt-1 text-left">
          {isRegister && (
            <Input
              label="Your Name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              leftIcon={<UserIcon className="w-4 h-4" />}
              placeholder="e.g. Chef Rowan"
            />
          )}

          <Input
            label="Email Address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            placeholder="you@kitchen.local"
          />

          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            placeholder="••••••••"
            helperText={isRegister ? 'Must be at least 8 characters.' : undefined}
          />

          <div className="pt-2 space-y-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={loading}
              className="w-full"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {isRegister ? 'Sign Up & Open Kitchen' : 'Sign In'}
            </Button>

            {!isRegister && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGuestQuickFill}
                className="w-full text-xs text-[#56645A] dark:text-[#A3B5AA]"
              >
                Use Seeded Kitchen (Chef Rowan)
              </Button>
            )}
          </div>
        </form>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMessage(null);
            }}
            className="text-xs font-semibold text-[#56735D] dark:text-emerald-400 hover:underline"
          >
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </Dialog>
  );
};
