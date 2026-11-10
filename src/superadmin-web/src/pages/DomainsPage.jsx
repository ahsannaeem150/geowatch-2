import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, AlertTriangle, ChevronDown, ChevronRight,
  Edit3, Trash2, MapPin, Camera, Video, Shield, Archive, RotateCcw, GitMerge,
} from 'lucide-react';
import {
  listAllDomains, listAllCategoriesAdmin, deleteDomain, deleteCategory,
  updateDomain, updateCategory, getDomainDependencies, getCategoryDependencies,
  mergeDomain, mergeCategory,
} from '../services/api.js';
import { getIconComponent } from '../components/Domains/IconPicker.jsx';
import DomainModal from '../components/Domains/DomainModal.jsx';
import CategoryModal from '../components/Domains/CategoryModal.jsx';
import { ListSkeleton } from '@shared/components/LoadingStates.jsx';

export default function DomainsPage() {
  const [domains, setDomains] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedDomains, setExpandedDomains] = useState(new Set());

  const [domainModal, setDomainModal] = useState(null); // null | { mode:'create' } | { mode:'edit', domain }
  const [categoryModal, setCategoryModal] = useState(null); // null | { mode:'create', domainId? } | { mode:'edit', category }
  const [deleteConfirm, setDeleteConfirm] = useState(null); // null | { type:'domain'|'category', item }

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [d, c] = await Promise.all([listAllDomains(), listAllCategoriesAdmin()]);
      setDomains(d);
      setCategories(c);
    } catch (err) {
      setError(err.message || 'Failed to load taxonomy');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const categoriesByDomain = useMemo(() => {
    const map = new Map();
    for (const d of domains) map.set(d.id, []);
    for (const c of categories) {
      const arr = map.get(c.domain_id);
      if (arr) arr.push(c);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }
    return map;
  }, [domains, categories]);

  const toggleExpand = (id) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openDeleteConfirm = async (type, item) => {
    try {
      const dependencies = type === 'domain'
        ? await getDomainDependencies(item.id)
        : await getCategoryDependencies(item.id);
      setDeleteConfirm({ type, item, dependencies });
    } catch (err) {
      setError(err.message || 'Failed to load dependencies');
    }
  };

  const handleToggleActive = async (type, item, isActive) => {
    try {
      if (type === 'domain') {
        await updateDomain(item.id, { isActive });
      } else {
        await updateCategory(item.id, { isActive });
      }
      await fetchData();
    } catch (err) {
      setError(err.message || `Failed to ${isActive ? 'restore' : 'archive'} ${type}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const { type, item } = deleteConfirm;
    try {
      if (type === 'domain') {
        await deleteDomain(item.id);
      } else {
        await deleteCategory(item.id);
      }
      await fetchData();
    } catch (err) {
      setError(err.message || `Failed to delete ${type}`);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleMerge = async (targetId) => {
    if (!deleteConfirm) return;
    const { type, item } = deleteConfirm;
    try {
      if (type === 'domain') {
        await mergeDomain(item.id, targetId);
      } else {
        await mergeCategory(item.id, targetId);
      }
      await fetchData();
    } catch (err) {
      setError(err.message || `Failed to merge ${type}`);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const activeDomains = domains.filter((d) => d.is_active !== false);
  const archivedDomains = domains.filter((d) => d.is_active === false);

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Domains & Categories</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Configure incident taxonomy</p>
        </div>
        <button
          onClick={() => setDomainModal({ mode: 'create' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'var(--sa-accent)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            boxShadow: '0 4px 14px var(--sa-accent-glow)',
          }}
        >
          <Plus size={16} /> New Domain
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--alert-error-bg)', border: '1px solid var(--alert-error-border)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: 14, marginBottom: 20 }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading && domains.length === 0 ? (
        <ListSkeleton rows={8} />
      ) : activeDomains.length === 0 ? (
        <div className="console-card" style={{ padding: '48px', textAlign: 'center', borderStyle: 'dashed' }}>
          <Shield size={40} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>No domains yet</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto 20px' }}>
            Create your first incident domain to start organizing categories.
          </p>
          <button
            onClick={() => setDomainModal({ mode: 'create' })}
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--sa-accent)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Create Domain
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {activeDomains.map((domain) => (
            <DomainCard
              key={domain.id}
              domain={domain}
              categories={categoriesByDomain.get(domain.id) || []}
              isExpanded={expandedDomains.has(domain.id)}
              onToggle={() => toggleExpand(domain.id)}
              onEditDomain={() => setDomainModal({ mode: 'edit', domain })}
              onDeleteDomain={() => openDeleteConfirm('domain', domain)}
              onToggleDomainActive={() => handleToggleActive('domain', domain, false)}
              onEditCategory={(cat) => setCategoryModal({ mode: 'edit', category: cat })}
              onDeleteCategory={(cat) => openDeleteConfirm('category', cat)}
              onToggleCategoryActive={(cat) => handleToggleActive('category', cat, false)}
              onAddCategory={() => setCategoryModal({ mode: 'create', domainId: domain.id })}
            />
          ))}
        </div>
      )}

      {archivedDomains.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>
            Archived domains
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {archivedDomains.map((domain) => (
              <DomainCard
                key={domain.id}
                domain={domain}
                categories={categoriesByDomain.get(domain.id) || []}
                isExpanded={expandedDomains.has(domain.id)}
                onToggle={() => toggleExpand(domain.id)}
                onEditDomain={() => setDomainModal({ mode: 'edit', domain })}
                onDeleteDomain={() => openDeleteConfirm('domain', domain)}
                onToggleDomainActive={() => handleToggleActive('domain', domain, true)}
                onEditCategory={(cat) => setCategoryModal({ mode: 'edit', category: cat })}
                onDeleteCategory={(cat) => openDeleteConfirm('category', cat)}
                onToggleCategoryActive={(cat) => handleToggleActive('category', cat, true)}
                onAddCategory={() => setCategoryModal({ mode: 'create', domainId: domain.id })}
                archived
              />
            ))}
          </div>
        </div>
      )}

      {/* Domain Modal */}
      {domainModal && (
        <DomainModal
          domain={domainModal.mode === 'edit' ? domainModal.domain : null}
          onClose={() => setDomainModal(null)}
          onSaved={fetchData}
        />
      )}

      {/* Category Modal */}
      {categoryModal && (
        <CategoryModal
          category={categoryModal.mode === 'edit' ? categoryModal.category : null}
          domains={activeDomains}
          onClose={() => setCategoryModal(null)}
          onSaved={fetchData}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <DeleteConfirmModal
          type={deleteConfirm.type}
          name={deleteConfirm.item.name}
          itemId={deleteConfirm.item.id}
          dependencies={deleteConfirm.dependencies}
          domains={activeDomains}
          categories={categories}
          onConfirm={handleDelete}
          onArchive={() => handleToggleActive(deleteConfirm.type, deleteConfirm.item, false)}
          onMerge={handleMerge}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

function DomainCard({
  domain, categories, isExpanded, onToggle,
  onEditDomain, onDeleteDomain, onToggleDomainActive,
  onEditCategory, onDeleteCategory, onToggleCategoryActive, onAddCategory, archived = false,
}) {
  const Icon = getIconComponent(domain.icon);
  const catCount = categories.length;

  return (
    <div className="console-card" style={{ overflow: 'hidden' }}>
      {/* Domain Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '16px 20px',
          cursor: 'pointer',
          transition: 'background var(--transition-fast)',
        }}
        onClick={onToggle}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        {/* Expand Chevron */}
        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </span>

        {/* Color Swatch */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-md)',
            background: domain.color || '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 0 12px ${(domain.color || '#3b82f6') + '40'}`,
          }}
        >
          {Icon ? <Icon size={20} color="#fff" /> : <Shield size={20} color="#fff" />}
        </div>

        {/* Domain Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              {domain.name}
            </h3>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                background: 'var(--bg-hover)',
                padding: '2px 8px',
                borderRadius: 4,
                fontFamily: 'var(--font-mono)',
                textTransform: 'lowercase',
              }}
            >
              {domain.slug}
            </span>
            {catCount > 0 && (
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--navy-400)',
                  background: 'var(--badge-blue-bg)',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontWeight: 600,
                }}
              >
                {catCount} {catCount === 1 ? 'category' : 'categories'}
              </span>
            )}
            {archived && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 4 }}>
                Archived
              </span>
            )}
          </div>
          {domain.description && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {domain.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <ActionBtn onClick={(e) => { e.stopPropagation(); onAddCategory(); }} title="Add category">
            <Plus size={15} />
          </ActionBtn>
          <ActionBtn onClick={(e) => { e.stopPropagation(); onEditDomain(); }} title="Edit domain">
            <Edit3 size={15} />
          </ActionBtn>
          <ActionBtn onClick={(e) => { e.stopPropagation(); onToggleDomainActive(); }} title={archived ? 'Restore domain' : 'Archive domain'}>
            {archived ? <RotateCcw size={15} /> : <Archive size={15} />}
          </ActionBtn>
          <ActionBtn onClick={(e) => { e.stopPropagation(); onDeleteDomain(); }} title="Delete domain" danger>
            <Trash2 size={15} />
          </ActionBtn>
        </div>
      </div>

      {/* Categories List */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {categories.length === 0 ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No categories in this domain yet.
              <button
                onClick={onAddCategory}
                style={{
                  marginLeft: 8,
                  background: 'none',
                  border: 'none',
                  color: 'var(--navy-600)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Create one
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {categories.map((cat) => (
                <CategoryRow
                  key={cat.id}
                  category={cat}
                  domainColor={domain.color}
                  onEdit={() => onEditCategory(cat)}
                  onDelete={() => onDeleteCategory(cat)}
                  onToggleActive={() => onToggleCategoryActive(cat)}
                  archived={archived || cat.is_active === false}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategoryRow({ category, domainColor, onEdit, onDelete, onToggleActive, archived = false }) {
  const severitySchema = useMemo(() => {
    if (!category.severity_schema) return null;
    try {
      return typeof category.severity_schema === 'string'
        ? JSON.parse(category.severity_schema)
        : category.severity_schema;
    } catch {
      return null;
    }
  }, [category.severity_schema]);

  const severityLevel = useMemo(() => {
    if (!severitySchema?.levels) return null;
    const val = category.default_severity;
    return severitySchema.levels.find((l) => String(l.value) === String(val)) || severitySchema.levels[0];
  }, [severitySchema, category.default_severity]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 20px 12px 74px',
        borderBottom: '1px solid var(--border-subtle)',
        transition: 'background var(--transition-fast)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Dot connector */}
      <div style={{ position: 'relative', width: 16, flexShrink: 0 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: domainColor || '#3b82f6',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>

      {/* Category info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
            {category.name}
          </span>
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              background: 'var(--bg-hover)',
              padding: '2px 6px',
              borderRadius: 4,
              fontFamily: 'var(--font-mono)',
            }}
          >
            {category.slug}
          </span>
          {severityLevel && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 4,
                background: (severityLevel.color || '#3b82f6') + '20',
                color: severityLevel.color || '#3b82f6',
              }}
            >
              {severityLevel.label}
            </span>
          )}
          {archived && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4 }}>
              Archived
            </span>
          )}
        </div>
        {category.description && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {category.description}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          {category.requires_location && <ReqBadge icon={<MapPin size={11} />} label="Location" />}
          {category.requires_photo && <ReqBadge icon={<Camera size={11} />} label="Photo" />}
          {category.requires_video && <ReqBadge icon={<Video size={11} />} label="Video" />}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <ActionBtn onClick={onEdit} title="Edit category">
          <Edit3 size={14} />
        </ActionBtn>
        <ActionBtn onClick={onToggleActive} title={archived ? 'Restore category' : 'Archive category'}>
          {archived ? <RotateCcw size={14} /> : <Archive size={14} />}
        </ActionBtn>
        <ActionBtn onClick={onDelete} title="Delete category" danger>
          <Trash2 size={14} />
        </ActionBtn>
      </div>
    </div>
  );
}

function ReqBadge({ icon, label }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        color: 'var(--text-muted)',
        background: 'var(--bg-hover)',
        padding: '2px 7px',
        borderRadius: 4,
        border: '1px solid var(--border-subtle)',
      }}
    >
      {icon} {label}
    </span>
  );
}

function ActionBtn({ children, onClick, title, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 30,
        borderRadius: 6,
        border: 'none',
        background: 'transparent',
        color: danger ? 'var(--danger)' : 'var(--text-muted)',
        cursor: 'pointer',
        transition: 'background var(--transition-fast), color var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? 'rgba(244, 63, 94, 0.1)' : 'var(--bg-active)';
        e.currentTarget.style.color = danger ? 'var(--danger)' : 'var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = danger ? 'var(--danger)' : 'var(--text-muted)';
      }}
    >
      {children}
    </button>
  );
}

function DeleteConfirmModal({
  type, name, itemId, dependencies, domains, categories,
  onConfirm, onArchive, onMerge, onCancel,
}) {
  const [loading, setLoading] = useState(false);
  const [targetId, setTargetId] = useState('');
  const hasDependencies = type === 'domain'
    ? dependencies.categoryCount > 0
    : dependencies.incidentCount > 0;
  const targets = type === 'domain'
    ? domains.filter((domain) => domain.id !== itemId && domain.is_active !== false)
    : categories.filter((category) => category.id !== itemId && category.is_active !== false);
  const affected = type === 'domain'
    ? `${dependencies.categoryCount} categories · ${dependencies.incidentCount} incidents`
    : `${dependencies.incidentCount} incidents`;

  const run = async (action) => {
    setLoading(true);
    await action();
    setLoading(false);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--backdrop)', backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 460, padding: '24px',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <AlertTriangle size={22} color="var(--danger)" />
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Manage {type}</h3>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text-primary)' }}>{name}</strong> — {affected}
        </p>
        {hasDependencies ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Archive hides this {type} from new selections while preserving history, or merge its references into an active target before deleting it.
            </p>
            <select
              aria-label={`Merge ${type} into`}
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
              style={{
                width: '100%', marginTop: 12, padding: '11px 12px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)',
              }}
            >
              <option value="">Select merge target…</option>
              {targets.map((target) => (
                <option key={target.id} value={target.id}>{target.name}</option>
              ))}
            </select>
          </>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            No dependent records were found. This {type} can be deleted safely.
          </p>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 20 }}>
          <button onClick={onCancel} disabled={loading} style={{ padding: '10px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>
            Cancel
          </button>
          {hasDependencies ? (
            <>
              <button
                onClick={() => run(async () => { await onArchive(); onCancel(); })}
                disabled={loading}
                style={{ padding: '10px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Archive size={14} /> Archive
              </button>
              <button
                onClick={() => run(() => onMerge(Number(targetId)))}
                disabled={loading || !targetId}
                style={{ padding: '10px 16px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--sa-accent)', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: !targetId ? 0.5 : 1 }}
              >
                <GitMerge size={14} /> Merge & delete
              </button>
            </>
          ) : (
            <button
              onClick={() => run(onConfirm)}
              disabled={loading}
              style={{ padding: '10px 16px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--danger)', color: '#fff', cursor: 'pointer' }}
            >
              {loading ? 'Deleting…' : 'Delete'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
