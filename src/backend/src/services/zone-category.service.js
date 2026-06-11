import { query } from '../config/database.js';

const ZONE_CATEGORY_COLUMNS = `
  id, name, slug, description, color, icon, sort_order, is_active, created_at, updated_at
`;

export async function listActiveZoneCategories() {
  const result = await query(
    `SELECT ${ZONE_CATEGORY_COLUMNS}
     FROM zone_categories
     WHERE is_active = true
     ORDER BY sort_order ASC, name ASC`,
    []
  );
  return result.rows;
}

export async function listAllZoneCategories() {
  const result = await query(
    `SELECT ${ZONE_CATEGORY_COLUMNS}
     FROM zone_categories
     ORDER BY sort_order ASC, name ASC`,
    []
  );
  return result.rows;
}

export async function getZoneCategoryById(id) {
  const result = await query(
    `SELECT ${ZONE_CATEGORY_COLUMNS} FROM zone_categories WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function getZoneCategoryBySlug(slug) {
  const result = await query(
    `SELECT ${ZONE_CATEGORY_COLUMNS} FROM zone_categories WHERE slug = $1`,
    [slug]
  );
  return result.rows[0] || null;
}

export async function createZoneCategory(data) {
  const {
    name,
    slug,
    description,
    color,
    icon,
    sortOrder,
    isActive,
  } = data;

  const result = await query(
    `INSERT INTO zone_categories (name, slug, description, color, icon, sort_order, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${ZONE_CATEGORY_COLUMNS}`,
    [name, slug, description || null, color, icon || 'shield', sortOrder ?? 0, isActive ?? true]
  );
  return result.rows[0];
}

export async function updateZoneCategory(id, data) {
  const fields = [];
  const values = [];
  let idx = 1;

  const addField = (key, val) => {
    if (val !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(val);
    }
  };

  addField('name', data.name);
  addField('slug', data.slug);
  addField('description', data.description);
  addField('color', data.color);
  addField('icon', data.icon);
  addField('sort_order', data.sortOrder);
  addField('is_active', data.isActive);

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(id);
  const result = await query(
    `UPDATE zone_categories SET ${fields.join(', ')} WHERE id = $${idx} RETURNING ${ZONE_CATEGORY_COLUMNS}`,
    values
  );
  return result.rows[0] || null;
}

export async function getZoneCategoryIncidentCount(id) {
  const result = await query(
    `SELECT COUNT(*) as c FROM incidents WHERE zone_category_id = $1 AND status != 'hidden'`,
    [id]
  );
  return parseInt(result.rows[0].c, 10);
}

export async function deleteZoneCategory(id) {
  const result = await query(
    `DELETE FROM zone_categories WHERE id = $1 RETURNING id`,
    [id]
  );
  return result.rows[0] || null;
}
