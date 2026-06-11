import { query } from '../config/database.js';

// ─── Read Queries (existing) ───

export async function getDomains() {
  const sql = `
    SELECT d.id, d.name, d.slug, d.description, d.color, d.icon, d.sort_order, d.is_active
    FROM domains d
    ORDER BY d.sort_order, d.name
  `;
  const result = await query(sql);
  return result.rows;
}

export async function getDomainWithCategories(slug) {
  const domainSql = `
    SELECT id, name, slug, description, color, icon, sort_order, is_active
    FROM domains
    WHERE slug = $1
  `;
  const domainResult = await query(domainSql, [slug]);
  if (domainResult.rows.length === 0) return null;

  const domain = domainResult.rows[0];

  const catSql = `
    SELECT id, name, slug, description, severity_schema, default_severity,
           requires_location, requires_casualties AS requires_photo,
           requires_property_damage AS requires_video,
           sort_order, is_active
    FROM categories
    WHERE domain_id = $1
    ORDER BY sort_order, name
  `;
  const catResult = await query(catSql, [domain.id]);
  domain.categories = catResult.rows;

  return domain;
}

export async function getAllCategories() {
  const sql = `
    SELECT c.id, c.name, c.slug, c.description, c.severity_schema, c.default_severity,
           c.requires_location, c.requires_casualties AS requires_photo,
           c.requires_property_damage AS requires_video,
           c.sort_order, c.is_active,
           d.id AS domain_id, d.name AS domain_name, d.slug AS domain_slug,
           d.color AS domain_color, d.icon AS domain_icon
    FROM categories c
    JOIN domains d ON c.domain_id = d.id
    ORDER BY d.sort_order, c.sort_order, c.name
  `;
  const result = await query(sql);
  return result.rows;
}

// ─── Domain CRUD ───

export async function createDomain({ name, slug, description, color, icon, sortOrder }) {
  const result = await query(
    `INSERT INTO domains (name, slug, description, color, icon, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name, slug, description || null, color, icon || null, sortOrder]
  );
  return result.rows[0];
}

export async function updateDomain(id, fields) {
  const allowed = ['name', 'slug', 'description', 'color', 'icon', 'sort_order', 'is_active'];
  const dbFields = [];
  const values = [];
  let idx = 1;

  for (const [key, val] of Object.entries(fields)) {
    const dbKey = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
    if (allowed.includes(dbKey) && val !== undefined) {
      dbFields.push(`${dbKey} = $${idx++}`);
      values.push(val);
    }
  }

  if (dbFields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(id);
  const result = await query(
    `UPDATE domains SET ${dbFields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function getDomainById(id) {
  const result = await query('SELECT * FROM domains WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function deleteDomain(id) {
  const result = await query('DELETE FROM domains WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
}

export async function getDomainCategoryCount(id) {
  const result = await query('SELECT COUNT(*) as c FROM categories WHERE domain_id = $1', [id]);
  return parseInt(result.rows[0].c, 10);
}

// ─── Category CRUD ───

export async function createCategory({
  domainId,
  name,
  slug,
  description,
  severitySchema,
  defaultSeverity,
  requiresLocation,
  requiresPhoto,
  requiresVideo,
  sortOrder,
}) {
  const result = await query(
    `INSERT INTO categories (
      domain_id, name, slug, description, severity_schema, default_severity,
      requires_location, requires_casualties, requires_property_damage, sort_order
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *, requires_casualties AS requires_photo, requires_property_damage AS requires_video`,
    [
      domainId, name, slug, description || null,
      JSON.stringify(severitySchema || { type: 'scale', levels: [] }),
      defaultSeverity || null,
      requiresLocation ?? false,
      requiresPhoto ?? false,
      requiresVideo ?? false,
      sortOrder,
    ]
  );
  return result.rows[0];
}

export async function updateCategory(id, fields) {
  const keyMap = {
    domainId: 'domain_id',
    name: 'name',
    slug: 'slug',
    description: 'description',
    severitySchema: 'severity_schema',
    defaultSeverity: 'default_severity',
    requiresLocation: 'requires_location',
    requiresPhoto: 'requires_casualties',
    requiresVideo: 'requires_property_damage',
    sortOrder: 'sort_order',
    isActive: 'is_active',
  };
  const dbFields = [];
  const values = [];
  let idx = 1;

  for (const [key, val] of Object.entries(fields)) {
    const dbKey = keyMap[key];
    if (dbKey && val !== undefined) {
      dbFields.push(`${dbKey} = $${idx++}`);
      if (dbKey === 'severity_schema') {
        values.push(JSON.stringify(val));
      } else {
        values.push(val);
      }
    }
  }

  if (dbFields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(id);
  const result = await query(
    `UPDATE categories SET ${dbFields.join(', ')} WHERE id = $${idx} RETURNING *, requires_casualties AS requires_photo, requires_property_damage AS requires_video`,
    values
  );
  return result.rows[0] || null;
}

export async function getCategoryById(id) {
  const result = await query('SELECT * FROM categories WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function deleteCategory(id) {
  const result = await query('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
}

export async function getCategoryIncidentCount(id) {
  const result = await query('SELECT COUNT(*) as c FROM incidents WHERE category_id = $1', [id]);
  return parseInt(result.rows[0].c, 10);
}

