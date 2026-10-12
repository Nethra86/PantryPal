import React from 'react';
import { Dialog } from './Dialog';
import { Button } from './Button';
import { AlertTriangle, HelpCircle } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'destructive' | 'amber';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  isLoading = false,
}) => {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidth="sm">
      <div className="flex flex-col items-center text-center p-2 pt-1 space-y-3">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            variant === 'destructive'
              ? 'bg-[#FBF0EF] text-[#A33A38] dark:bg-[#2F1717] dark:text-[#F87171]'
              : variant === 'amber'
              ? 'bg-[#FDF6EC] text-[#B46A1B] dark:bg-[#2A1D0B] dark:text-[#F59E0B]'
              : 'bg-[#EBF2EC] text-[#1C3B2B] dark:bg-[#182B1E] dark:text-emerald-400'
          }`}
        >
          {variant === 'destructive' || variant === 'amber' ? (
            <AlertTriangle className="w-6 h-6" />
          ) : (
            <HelpCircle className="w-6 h-6" />
          )}
        </div>

        <div>
          <h4 className="text-lg font-bold tracking-tight text-[#1D2420] dark:text-[#F2F5F3]">
            {title}
          </h4>
          <p className="text-xs text-[#56645A] dark:text-[#A3B5AA] mt-1.5 leading-relaxed">
            {description}
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant}
            onClick={async () => {
              await onConfirm();
              onClose();
            }}
            isLoading={isLoading}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
