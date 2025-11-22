import { toast as reactToast } from 'react-toastify';

// Custom toast configurations for better UX
const toastConfig = {
  position: "top-center",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  closeButton: true,
};

export const toast = {
  success: (message, options = {}) => {
    reactToast.dismiss(); // Dismiss any existing toasts
    return reactToast.success(message, {
      ...toastConfig,
      ...options,
      className: 'custom-toast-success',
    });
  },

  error: (message, options = {}) => {
    reactToast.dismiss(); // Dismiss any existing toasts
    return reactToast.error(message, {
      ...toastConfig,
      ...options,
      className: 'custom-toast-error',
    });
  },

  info: (message, options = {}) => {
    reactToast.dismiss(); // Dismiss any existing toasts
    return reactToast.info(message, {
      ...toastConfig,
      ...options,
      className: 'custom-toast-info',
    });
  },

  warning: (message, options = {}) => {
    reactToast.dismiss(); // Dismiss any existing toasts
    return reactToast.warning(message, {
      ...toastConfig,
      ...options,
      className: 'custom-toast-warning',
    });
  },

  // Dismiss a specific toast
  dismiss: (toastId) => {
    reactToast.dismiss(toastId);
  },

  // Dismiss all toasts
  dismissAll: () => {
    reactToast.dismiss();
  },

  // Specific toast types for common scenarios
  clockIn: () => {
    reactToast.dismiss();
    return reactToast.success('✅ Clocked in successfully! Have a productive day!', {
      ...toastConfig,
      className: 'custom-toast-success',
      toastId: 'clock-in',
    });
  },

  clockOut: () => {
    reactToast.dismiss();
    return reactToast.success('👋 Clocked out successfully! Have a great evening!', {
      ...toastConfig,
      className: 'custom-toast-success',
      toastId: 'clock-out',
    });
  },

  alreadyClockedIn: (time) => {
    reactToast.dismiss();
    return reactToast.info(`ℹ️ You've already clocked in today${time ? ` at ${time}` : ''}`, {
      ...toastConfig,
      className: 'custom-toast-info',
      toastId: 'already-clocked-in',
    });
  },

  alreadyClockedOut: (time) => {
    reactToast.dismiss();
    return reactToast.info(`ℹ️ You've already clocked out today${time ? ` at ${time}` : ''}. See you tomorrow!`, {
      ...toastConfig,
      className: 'custom-toast-info',
      toastId: 'already-clocked-out',
    });
  },

  notClockedIn: () => {
    reactToast.dismiss();
    return reactToast.warning('⚠️ You haven\'t clocked in yet today. Please clock in first.', {
      ...toastConfig,
      className: 'custom-toast-warning',
      toastId: 'not-clocked-in',
    });
  },

  loginSuccess: (name) => {
    reactToast.dismiss();
    return reactToast.success(`👋 Welcome back, ${name}!`, {
      ...toastConfig,
      className: 'custom-toast-success',
      toastId: 'login-success',
    });
  },

  logoutSuccess: () => {
    reactToast.dismiss();
    return reactToast.info('👋 Logged out successfully. See you soon!', {
      ...toastConfig,
      className: 'custom-toast-info',
      toastId: 'logout-success',
    });
  },
};

export default toast;
