import React from 'react';
export interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}
export declare function ConfirmationModal({ isOpen, title, message, confirmLabel, cancelLabel, isDestructive, onConfirm, onCancel, }: ConfirmationModalProps): React.JSX.Element | null;
