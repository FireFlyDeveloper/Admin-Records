/**
 * @file Item input validation
 * @description Pure helpers used by both POST /items and PATCH /items/:id
 * controllers. Extracted so the rules can be unit-tested without a database.
 */

import { ValidationError } from './errors';

export const ITEM_NAME_MAX = 200;
export const ITEM_SKU_MAX = 100;
export const ITEM_MODEL_MAX = 200;
export const ITEM_CATEGORY_MAX = 100;
export const ITEM_DESCRIPTION_MAX = 2000;

/**
 * Pattern: a single character repeated 10+ times (e.g. "XXXXXXXXXX",
 * "----------"). Used to reject obvious test / scanner-wedge junk values
 * like the "1000×X" item that leaked into the production catalog.
 */
const JUNK_REPEAT_RE = /^(.)\1{9,}$/;

export interface ItemFieldInput {
  item_type?: string;
  name?: string;
  sku?: string | null;
  item_model?: string | null;
  category?: string | null;
  description?: string | null;
  status?: string;
}

/**
 * Validate and normalise the fields for a brand-new item (POST /items).
 * Trims strings, drops empty optional fields, and rejects obvious garbage.
 *
 * @throws {ValidationError} on any invalid value
 * @returns A normalised object with the same shape as {@link ItemFieldInput}
 */
export function validateAndNormalizeCreateItem(input: ItemFieldInput): {
  item_type: 'trackable' | 'quantifiable';
  name: string;
  sku: string | null;
  item_model: string | null;
  category?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'maintenance';
} {
  const { item_type, name, sku, item_model, category, description, status } = input;

  if (!item_type || !name) {
    throw new ValidationError('item_type and name are required');
  }
  if (!['trackable', 'quantifiable'].includes(item_type)) {
    throw new ValidationError('item_type must be trackable or quantifiable');
  }

  const cleanName = String(name).trim();
  if (!cleanName) {
    throw new ValidationError('name cannot be blank or whitespace only');
  }
  if (cleanName.length > ITEM_NAME_MAX) {
    throw new ValidationError(`name must be ${ITEM_NAME_MAX} characters or fewer`);
  }
  if (JUNK_REPEAT_RE.test(cleanName)) {
    throw new ValidationError('name looks like a test value, please enter a real item name');
  }

  if (sku != null) {
    const cleanSku = String(sku).trim();
    if (cleanSku.length > ITEM_SKU_MAX) {
      throw new ValidationError(`sku must be ${ITEM_SKU_MAX} characters or fewer`);
    }
  }
  if (item_model != null) {
    const cleanModel = String(item_model).trim();
    if (cleanModel.length > ITEM_MODEL_MAX) {
      throw new ValidationError(`item_model must be ${ITEM_MODEL_MAX} characters or fewer`);
    }
  }
  if (category != null && String(category).trim().length > ITEM_CATEGORY_MAX) {
    throw new ValidationError(`category must be ${ITEM_CATEGORY_MAX} characters or fewer`);
  }
  if (description != null && String(description).length > ITEM_DESCRIPTION_MAX) {
    throw new ValidationError(`description must be ${ITEM_DESCRIPTION_MAX} characters or fewer`);
  }

  return {
    item_type: item_type as 'trackable' | 'quantifiable',
    name: cleanName,
    sku: sku != null ? String(sku).trim() || null : null,
    item_model: item_model != null ? String(item_model).trim() || null : null,
    category: category != null ? String(category).trim() || undefined : undefined,
    description: description != null ? String(description).trim() || undefined : undefined,
    status: status as 'active' | 'inactive' | 'maintenance' | undefined,
  };
}

/**
 * Validate and normalise the fields for an item update (PATCH /items/:id).
 * Every field is optional; only the provided ones are checked.
 *
 * @throws {ValidationError} on any invalid value
 * @returns A normalised partial object that includes only the fields
 *   the caller actually supplied (so `updateItem` can skip undefined keys).
 */
export function validateAndNormalizeUpdateItem(input: ItemFieldInput): {
  name?: string;
  sku?: string | null;
  item_model?: string | null;
  category?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'maintenance';
} {
  const { name, sku, item_model, category, description, status } = input;
  const out: ReturnType<typeof validateAndNormalizeUpdateItem> = {};

  if (name !== undefined) {
    const cleanName = String(name).trim();
    if (!cleanName) {
      throw new ValidationError('name cannot be blank or whitespace only');
    }
    if (cleanName.length > ITEM_NAME_MAX) {
      throw new ValidationError(`name must be ${ITEM_NAME_MAX} characters or fewer`);
    }
    if (JUNK_REPEAT_RE.test(cleanName)) {
      throw new ValidationError('name looks like a test value, please enter a real item name');
    }
    out.name = cleanName;
  }

  if (sku !== undefined) {
    if (sku != null) {
      const cleanSku = String(sku).trim();
      if (cleanSku.length > ITEM_SKU_MAX) {
        throw new ValidationError(`sku must be ${ITEM_SKU_MAX} characters or fewer`);
      }
    }
    out.sku = sku != null ? String(sku).trim() || null : null;
  }

  if (item_model !== undefined) {
    if (item_model != null) {
      const cleanModel = String(item_model).trim();
      if (cleanModel.length > ITEM_MODEL_MAX) {
        throw new ValidationError(`item_model must be ${ITEM_MODEL_MAX} characters or fewer`);
      }
    }
    out.item_model = item_model != null ? String(item_model).trim() || null : null;
  }

  if (category !== undefined) {
    if (category != null && String(category).trim().length > ITEM_CATEGORY_MAX) {
      throw new ValidationError(`category must be ${ITEM_CATEGORY_MAX} characters or fewer`);
    }
    out.category = category != null ? String(category).trim() || undefined : undefined;
  }

  if (description !== undefined) {
    if (description != null && String(description).length > ITEM_DESCRIPTION_MAX) {
      throw new ValidationError(`description must be ${ITEM_DESCRIPTION_MAX} characters or fewer`);
    }
    out.description = description != null ? String(description).trim() || undefined : undefined;
  }

  if (status !== undefined) {
    out.status = status as 'active' | 'inactive' | 'maintenance';
  }

  return out;
}
