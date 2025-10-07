import type { UiRole } from './roles';

export const roleColors = {
  admin: {
    bg: 'bg-blue-600',
    bgHover: 'hover:bg-blue-700',
    bgLight: 'bg-blue-50',
    bgLightHover: 'hover:bg-blue-100',
    gradient: 'from-blue-600 to-blue-700',
    gradientHover: 'hover:from-blue-700 hover:to-blue-800',
    gradientLight: 'from-blue-100 to-blue-200',
    border: 'border-blue-400',
    borderHover: 'hover:border-blue-300',
    text: 'text-blue-900',
    textLight: 'text-blue-700',
    textDark: 'text-blue-800',
    ring: 'focus:ring-blue-500',
  },
  tech: {
    bg: 'bg-orange-600',
    bgHover: 'hover:bg-orange-700',
    bgLight: 'bg-orange-50',
    bgLightHover: 'hover:bg-orange-100',
    gradient: 'from-orange-600 to-orange-700',
    gradientHover: 'hover:from-orange-700 hover:to-orange-800',
    gradientLight: 'from-orange-100 to-orange-200',
    border: 'border-orange-400',
    borderHover: 'hover:border-orange-300',
    text: 'text-orange-900',
    textLight: 'text-orange-700',
    textDark: 'text-orange-800',
    ring: 'focus:ring-orange-500',
  },
  st: {
    bg: 'bg-green-600',
    bgHover: 'hover:bg-green-700',
    bgLight: 'bg-green-50',
    bgLightHover: 'hover:bg-green-100',
    gradient: 'from-green-600 to-green-700',
    gradientHover: 'hover:from-green-700 hover:to-green-800',
    gradientLight: 'from-green-100 to-green-200',
    border: 'border-green-400',
    borderHover: 'hover:border-green-300',
    text: 'text-green-900',
    textLight: 'text-green-700',
    textDark: 'text-green-800',
    ring: 'focus:ring-green-500',
  },
  sal: {
    bg: 'bg-teal-600',
    bgHover: 'hover:bg-teal-700',
    bgLight: 'bg-teal-50',
    bgLightHover: 'hover:bg-teal-100',
    gradient: 'from-teal-600 to-teal-700',
    gradientHover: 'hover:from-teal-700 hover:to-teal-800',
    gradientLight: 'from-teal-100 to-teal-200',
    border: 'border-teal-400',
    borderHover: 'hover:border-teal-300',
    text: 'text-teal-900',
    textLight: 'text-teal-700',
    textDark: 'text-teal-800',
    ring: 'focus:ring-teal-500',
  },
  client: {
    bg: 'bg-blue-600',
    bgHover: 'hover:bg-blue-700',
    bgLight: 'bg-blue-50',
    bgLightHover: 'hover:bg-blue-100',
    gradient: 'from-blue-600 to-blue-700',
    gradientHover: 'hover:from-blue-700 hover:to-blue-800',
    gradientLight: 'from-blue-100 to-blue-200',
    border: 'border-blue-400',
    borderHover: 'hover:border-blue-300',
    text: 'text-blue-900',
    textLight: 'text-blue-700',
    textDark: 'text-blue-800',
    ring: 'focus:ring-blue-500',
  },
} as const;

export function getRoleColors(role: UiRole) {
  return roleColors[role];
}

export function getRoleColorClasses(role: UiRole, variant: 'solid' | 'light' | 'border' = 'solid') {
  const colors = roleColors[role];

  if (variant === 'solid') {
    return {
      bg: colors.gradient,
      hover: colors.gradientHover,
      text: 'text-white',
    };
  }

  if (variant === 'light') {
    return {
      bg: colors.gradientLight,
      border: colors.border,
      text: colors.text,
    };
  }

  if (variant === 'border') {
    return {
      bg: 'bg-white',
      border: colors.border,
      hover: colors.borderHover,
      text: colors.textDark,
    };
  }

  return colors;
}
