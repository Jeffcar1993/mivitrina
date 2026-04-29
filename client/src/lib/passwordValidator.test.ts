import { describe, expect, it } from 'vitest';
import { validatePassword } from './passwordValidator';

describe('validatePassword', () => {
  it('accepts a strong password', () => {
    const result = validatePassword('Aa123456@');

    expect(result.isValid).toBe(true);
    expect(result.score).toBe(5);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects weak password with detailed errors', () => {
    const result = validatePassword('abc');

    expect(result.isValid).toBe(false);
    expect(result.score).toBeLessThan(5);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Mínimo 8 caracteres'),
        expect.stringContaining('mayúscula'),
        expect.stringContaining('número'),
        expect.stringContaining('carácter especial'),
      ])
    );
  });
});
