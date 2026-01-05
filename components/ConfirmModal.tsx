'use client';

import { X, AlertCircle, AlertTriangle, Info, HelpCircle } from 'lucide-react';
import { useEffect, useCallback } from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info' | 'question';
    confirmButtonClass?: string;
}

const icons = {
    danger: AlertCircle,
    warning: AlertTriangle,
    info: Info,
    question: HelpCircle,
};

const colors = {
    danger: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: 'text-red-600',
        title: 'text-red-900',
        confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: 'text-amber-600',
        title: 'text-amber-900',
        confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    info: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        title: 'text-blue-900',
        confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    question: {
        bg: 'bg-neutral-50',
        border: 'border-neutral-200',
        icon: 'text-neutral-600',
        title: 'text-neutral-900',
        confirmBtn: 'bg-neutral-900 hover:bg-black text-white',
    },
};

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'question',
    confirmButtonClass,
}: ConfirmModalProps) {
    const Icon = icons[type];
    const colorScheme = colors[type];

    // Handle escape key to close
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
            return () => {
                document.removeEventListener('keydown', handleKeyDown);
                document.body.style.overflow = '';
            };
        }
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className={`${colorScheme.bg} ${colorScheme.border} border rounded-2xl p-6 max-w-md w-full shadow-xl animate-in zoom-in-95 duration-200`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-modal-title"
            >
                <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 ${colorScheme.icon}`}>
                        <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3
                            id="confirm-modal-title"
                            className={`text-lg font-semibold ${colorScheme.title} mb-1`}
                        >
                            {title}
                        </h3>
                        <p className="text-neutral-700 text-sm leading-relaxed">
                            {message}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5 text-neutral-500" />
                    </button>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-neutral-300 text-neutral-700 rounded-xl hover:bg-neutral-50 font-medium text-sm transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors ${confirmButtonClass || colorScheme.confirmBtn}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
