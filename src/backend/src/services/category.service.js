import { query } from '../config/database.js';

export async function getDomains() {
  const sql = `
    SELECT d.id, d.name, d.slug, d.description, d.color, d.icon, d.sort_order, d.is_active
    FROM domains d
    WHERE d.is_active = true
    ORDER BY d.sort_order, d.name
  `;
  const result = await query(sql);
  return result.rows;
}

export async function getDomainWithCategories(slug) {
  const domainSql = `
    SELECT id, name, slug, description, color, icon, sort_order, is_active
    FROM domains
    WHERE slug = $1 AND is_active = true
  `;
  const domainResult = await query(domainSql, [slug]);
  if (domainResult.rows.length === 0) return null;

  const domain = domainResult.rows[0];

  const catSql = `
    SELECT id, name, slug, description, severity_schema, default_severity,
           requires_location, requires_casualties, requires_property_damage,
           sort_order, is_active
    FROM categories
    WHERE domain_id = $1 AND is_active = true
    ORDER BY sort_order, name
  `;
  const catResult = await query(catSql, [domain.id]);
  domain.categories = catResult.rows;

  return domain;
}

export async function getAllCategories() {
  const sql = `
    SELECT c.id, c.name, c.slug, c.description, c.severity_schema, c.default_severity,
           c.requires_location, c.requires_casualties, c.requires_property_damage,
           c.sort_order, c.is_active,
           d.id AS domain_id, d.name AS domain_name, d.slug AS domain_slug,
           d.color AS domain_color, d.icon AS domain_icon
    FROM categories c
    JOIN domains d ON c.domain_id = d.id
    WHERE c.is_active = true AND d.is_active = true
    ORDER BY d.sort_order, c.sort_order, c.name
  `;
  const result = await query(sql);
  return result.rows;
}
