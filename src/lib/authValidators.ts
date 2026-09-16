export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePasswordStrength(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" };
  }

  if (!/\d/.test(password)) {
    return { valid: false, message: "Password must contain at least one number" };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter" };
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one special character" };
  }

  return { valid: true, message: "Password is strong" };
}

export function validateUsername(username: string): { valid: boolean; message: string } {
  if (username.length < 3) {
    return { valid: false, message: "Username must be at least 3 characters long" };
  }

  if (username.length > 20) {
    return { valid: false, message: "Username must be less than 20 characters" };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, message: "Username can only contain letters, numbers, and underscores" };
  }

  return { valid: true, message: "Username is valid" };
}