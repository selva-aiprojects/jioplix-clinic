import React from 'react';
export interface NotificationToastProps {
    type?: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    onDismiss: () => void;
    autoDismissMs?: number;
}
export declare function NotificationToast({ type, title, message, onDismiss, autoDismissMs, }: NotificationToastProps): React.JSX.Element;
