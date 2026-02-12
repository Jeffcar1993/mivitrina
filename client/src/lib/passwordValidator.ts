/**
 * Validación de contraseña segura
 * Requisitos:
 * - Mínimo 8 caracteres
 * - Al menos una mayúscula
 * - Al menos una minúscula
 * - Al menos un número
 * - Al menos un carácter especial
 */

export interface PasswordStrength {
  isValid: boolean;
  score: number; // 0-5
  errors: string[];
}

export const validatePassword = (password: string): PasswordStrength => {
  const errors: string[] = [];
  let score = 0;

  // Verificar longitud mínima
  if (password.length >= 8) {
    score++;
  } else {
    errors.push("Mínimo 8 caracteres");
  }

  // Verificar mayúsculas
  if (/[A-Z]/.test(password)) {
    score++;
  } else {
    errors.push("Al menos una mayúscula (A-Z)");
  }

  // Verificar minúsculas
  if (/[a-z]/.test(password)) {
    score++;
  } else {
    errors.push("Al menos una minúscula (a-z)");
  }

  // Verificar números
  if (/[0-9]/.test(password)) {
    score++;
  } else {
    errors.push("Al menos un número (0-9)");
  }

  // Verificar caracteres especiales
  const specialChars = '!@#$%^&*()_+=-[]{};\':"`\\|,.<>/?';
  if ([...specialChars].some(char => password.includes(char))) {
    score++;
  } else {
    errors.push("Al menos un carácter especial (!@#$%^&* etc)");
  }

  return {
    isValid: errors.length === 0,
    score,
    errors
  };
};

export const getPasswordStrengthLabel = (score: number): string => {
  switch (score) {
    case 0: return "Muy débil";
    case 1: return "Débil";
    case 2: return "Regular";
    case 3: return "Buena";
    case 4: return "Muy buena";
    case 5: return "Excelente";
    default: return "Desconocida";
  }
};

export const getPasswordStrengthColor = (score: number): string => {
  switch (score) {
    case 0: return "bg-red-200";
    case 1: return "bg-orange-200";
    case 2: return "bg-yellow-200";
    case 3: return "bg-lime-200";
    case 4: return "bg-green-200";
    case 5: return "bg-emerald-200";
    default: return "bg-gray-200";
  }
};
