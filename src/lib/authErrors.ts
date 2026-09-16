function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  return String((error as { code: unknown }).code);
}

export function loginErrorMessage(error: unknown): string {
  switch (getErrorCode(error)) {
    case 'auth/user-not-found':
      return "No account exists with this email. Please check the email or register a new account.";
    case 'auth/wrong-password':
      return "Incorrect password. Please try again or use 'Forgot Password' to reset it.";
    case 'auth/too-many-requests':
      return "Too many failed login attempts. Please try again later or reset your password.";
    case 'auth/user-disabled':
      return "This account has been disabled. Please contact customer support.";
    case 'auth/network-request-failed':
      return "Network error. Please check your internet connection and try again.";
    default:
      return "Invalid email or password.";
  }
}

export function registerErrorMessage(error: unknown): string {
  switch (getErrorCode(error)) {
    case 'auth/email-already-in-use':
      return "This email is already registered. Try logging in instead.";
    case 'auth/invalid-email':
      return "Invalid email format. Please check and try again.";
    case 'auth/operation-not-allowed':
      return "Email/password registration is not enabled. Please contact support.";
    case 'auth/network-request-failed':
      return "Network error. Please check your internet connection and try again.";
    default:
      return (error as Error).message || "Registration failed.";
  }
}

export function passwordResetErrorMessage(error: unknown): string {
  switch (getErrorCode(error)) {
    case 'auth/user-not-found':
      return "No account exists with this email address.";
    case 'auth/invalid-email':
      return "Invalid email format. Please check and try again.";
    case 'auth/too-many-requests':
      return "Too many requests. Please try again later.";
    default:
      return "Could not send password reset email.";
  }
}

export function passwordUpdateErrorMessage(error: unknown): string {
  switch (getErrorCode(error)) {
    case 'auth/wrong-password':
      return "Current password is incorrect. Please try again.";
    case 'auth/weak-password':
      return "New password is too weak. Choose a stronger password.";
    case 'auth/requires-recent-login':
      return "For security reasons, please log out and log back in before changing your password.";
    default:
      return "Failed to update password.";
  }
}

export function reauthenticateErrorMessage(error: unknown): string {
  if (getErrorCode(error) === 'auth/too-many-requests') {
    return "Too many failed attempts. Please try again later.";
  }
  return "Incorrect password. Please try again.";
}

export function deleteAccountErrorMessage(error: unknown): string {
  if (getErrorCode(error) === 'auth/requires-recent-login') {
    return "This operation is sensitive and requires recent authentication. Please log out, log back in, then try again.";
  }
  return "Could not delete account.";
}