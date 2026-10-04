import React from 'react';
import { useAuth } from '../../auth';
import { Modal, Button } from '../ui';
import {
  User as UserIcon,
  Globe,
  Mail,
  Smartphone,
  Key,
  AtSign,
  LogOut,
  Download,
  Upload,
  Cloud,
  CheckCircle2,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

interface AccountProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountProfileModal: React.FC<AccountProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, logout, openAuthModal } = useAuth();

  if (!user) return null;

  const getProviderIcon = () => {
    switch (user.provider) {
      case 'google':
        return <Globe className="w-4 h-4 text-blue-500" />;
      case 'gmail':
        return <Mail className="w-4 h-4 text-rose-500" />;
      case 'apple':
        return <span className="font-bold text-sm"></span>;
      case 'litera_id':
        return <AtSign className="w-4 h-4 text-amber-500" />;
      case 'phone':
        return <Smartphone className="w-4 h-4 text-emerald-500" />;
      case 'secret_code':
        return <Key className="w-4 h-4 text-purple-500" />;
      default:
        return <UserIcon className="w-4 h-4 text-stone-400" />;
    }
  };

  const handleExportPortableBackup = () => {
    const backupData = {
      user,
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `literia-backup-${user.displayName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Portable Author Account" size="md">
      <div className="space-y-4">
        {/* User Identity Card */}
        <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-soft"
              style={{ backgroundColor: user.avatarColor || '#D97706' }}
            >
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-serif font-bold text-stone-900 dark:text-stone-100 text-base">
                {user.displayName}
              </div>
              <div className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                {getProviderIcon()}
                <span className="capitalize font-medium">{user.provider.replace('_', ' ')}</span>
                {user.literaHandle && (
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                    {user.literaHandle}
                  </span>
                )}
                {user.email && !user.literaHandle && <span>• {user.email}</span>}
              </div>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/30">
            <Cloud className="w-3.5 h-3.5" />
            <span>Active</span>
          </span>
        </div>

        {/* Cloud Sync & Portability Controls */}
        <div className="p-3.5 rounded-xl border border-stone-200/60 dark:border-stone-800 space-y-2.5 bg-white dark:bg-stone-900">
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-500 font-medium">Cloud Sync Status:</span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Synced across devices</span>
            </span>
          </div>

          {user.secretCode && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500 font-medium">Vault Secret Code:</span>
              <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                {user.secretCode}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-stone-400 pt-1 border-t border-stone-100 dark:border-stone-800">
            <span>Last Logged In:</span>
            <span>{formatDate(user.lastLoginAt)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportPortableBackup}
            className="flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span>Export Portable Backup</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              openAuthModal('signin');
            }}
            className="flex items-center justify-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-amber-500" />
            <span>Switch Account</span>
          </Button>
        </div>

        {/* Sign Out Button */}
        <div className="pt-3 border-t border-stone-200/60 dark:border-stone-800 flex justify-between items-center">
          <button
            type="button"
            onClick={logout}
            className="text-xs font-medium text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1.5 px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>

          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
