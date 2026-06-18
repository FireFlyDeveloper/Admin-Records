import {
  validateAndNormalizeCreateItem,
  validateAndNormalizeUpdateItem,
  ITEM_NAME_MAX,
  ITEM_SKU_MAX,
} from '../itemValidation';
import { ValidationError } from '../errors';

describe('validateAndNormalizeCreateItem', () => {
  it('rejects when item_type or name is missing', () => {
    expect(() => validateAndNormalizeCreateItem({ item_type: 'quantifiable' } as any)).toThrow(ValidationError);
    expect(() => validateAndNormalizeCreateItem({ name: 'X' } as any)).toThrow(ValidationError);
  });

  it('rejects unknown item_type values', () => {
    expect(() =>
      validateAndNormalizeCreateItem({ item_type: 'weird', name: 'X' } as any)
    ).toThrow(/item_type must be trackable or quantifiable/);
  });

  it('trims surrounding whitespace on name', () => {
    const out = validateAndNormalizeCreateItem({
      item_type: 'quantifiable',
      name: '   Microscope   ',
    } as any);
    expect(out.name).toBe('Microscope');
  });

  it('rejects a whitespace-only name', () => {
    expect(() =>
      validateAndNormalizeCreateItem({ item_type: 'quantifiable', name: '     ' } as any)
    ).toThrow(/cannot be blank/);
  });

  it('rejects a name longer than ITEM_NAME_MAX chars', () => {
    const longName = 'A'.repeat(ITEM_NAME_MAX + 1);
    expect(() =>
      validateAndNormalizeCreateItem({ item_type: 'quantifiable', name: longName } as any)
    ).toThrow(/name must be \d+ characters or fewer/);
  });

  it('rejects a name that is a single character repeated 10+ times (the X*1000 bug)', () => {
    const x1000 = 'X'.repeat(1000);
    expect(() =>
      validateAndNormalizeCreateItem({ item_type: 'quantifiable', name: x1000 } as any)
    ).toThrow(/looks like a test value/);
  });

  it('rejects other single-char repeats (e.g. "----------")', () => {
    expect(() =>
      validateAndNormalizeCreateItem({ item_type: 'quantifiable', name: '-'.repeat(20) } as any)
    ).toThrow(/looks like a test value/);
  });

  it('accepts a normal item name with a few repeated chars (e.g. "Microscope OOZE 1000")', () => {
    const out = validateAndNormalizeCreateItem({
      item_type: 'quantifiable',
      name: 'Microscope OOZE 1000',
    } as any);
    expect(out.name).toBe('Microscope OOZE 1000');
  });

  it('rejects an oversized sku but trims a normal one', () => {
    const huge = 'S'.repeat(ITEM_SKU_MAX + 1);
    expect(() =>
      validateAndNormalizeCreateItem({
        item_type: 'quantifiable',
        name: 'X',
        sku: huge,
      } as any)
    ).toThrow(/sku must be \d+ characters or fewer/);

    const out = validateAndNormalizeCreateItem({
      item_type: 'quantifiable',
      name: 'X',
      sku: '  SKU-100  ',
    } as any);
    expect(out.sku).toBe('SKU-100');
  });

  it('drops empty optional fields rather than passing empty strings', () => {
    const out = validateAndNormalizeCreateItem({
      item_type: 'quantifiable',
      name: 'Test',
      sku: '',
      item_model: '   ',
      category: '   ',
      description: '',
    } as any);
    expect(out.sku).toBeNull();
    expect(out.item_model).toBeNull();
    expect(out.category).toBeUndefined();
    expect(out.description).toBeUndefined();
  });
});

describe('validateAndNormalizeUpdateItem', () => {
  it('returns an empty object when no fields are provided', () => {
    expect(validateAndNormalizeUpdateItem({})).toEqual({});
  });

  it('skips unchanged fields entirely', () => {
    const out = validateAndNormalizeUpdateItem({ status: 'inactive' });
    expect(out).toEqual({ status: 'inactive' });
  });

  it('rejects an invalid name update (length / junk / blank)', () => {
    expect(() => validateAndNormalizeUpdateItem({ name: 'X'.repeat(1000) })).toThrow(/looks like a test value/);
    expect(() => validateAndNormalizeUpdateItem({ name: '   ' })).toThrow(/cannot be blank/);
    expect(() => validateAndNormalizeUpdateItem({ name: 'A'.repeat(ITEM_NAME_MAX + 1) })).toThrow(/characters or fewer/);
  });

  it('preserves a null sku (user is explicitly clearing it)', () => {
    const out = validateAndNormalizeUpdateItem({ sku: null });
    expect(out.sku).toBeNull();
  });
});
