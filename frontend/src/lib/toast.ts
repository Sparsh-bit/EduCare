import toast from 'react-hot-toast';

export const showToast = {
    success: (message: string, title?: string) =>
        toast.success(title ? `${title}: ${message}` : message),
    error: (message: string, title?: string) =>
        toast.error(title ? `${title}: ${message}` : message),
    warning: (message: string) =>
        toast(message, { icon: '⚠️' }),
    info: (message: string) =>
        toast(message, { icon: 'ℹ️' }),
    loading: (message: string) =>
        toast.loading(message),
    dismiss: (id?: string) =>
        toast.dismiss(id),
};

export default showToast;
