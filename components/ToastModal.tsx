'use client';

import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

interface ToastModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: 'error' | 'success' | 'info' | 'warning';
    autoCloseMs?: number;
}

const icons = {
    error: AlertCircle,
    success: CheckCircle,
    info: Info,
    warning: AlertTriangle,
};

const colors = {
    error: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: 'text-red-600',
        title: 'text-red-900',
    },
    success: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: 'text-green-600',
        title: 'text-green-900',
    },
    info: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        title: 'text-blue-900',
    },
    warning: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: 'text-amber-600',
        title: 'text-amber-900',
    },
};

export default function ToastModal({
    isOpen,
    onClose,
    title,
    message,
    type = 'error',
    autoCloseMs,
}: ToastModalProps) {
    const Icon = icons[type];
    const colorScheme = colors[type];

    useEffect(() => {
        if (isOpen && autoCloseMs) {
            const timer = setTimeout(onClose, autoCloseMs);
            return () => clearTimeout(timer);
        }
    }, [isOpen, autoCloseMs, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
            <div
                className={`${colorScheme.bg} ${colorScheme.border} border rounded-2xl p-6 max-w-md w-full shadow-xl animate-in zoom-in-95 duration-200`}
            >
                <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 ${colorScheme.icon}`}>
                        <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className={`text-lg font-semibold ${colorScheme.title} mb-1`}>
                            {title}
                        </h3>
                        <p className="text-neutral-700 text-sm leading-relaxed">
                            {message}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors"
                    >
                        <X className="h-5 w-5 text-neutral-500" />
                    </button>
                </div>
                <div className="mt-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-black font-medium text-sm transition-colors"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
