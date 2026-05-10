import React, { useState } from 'react';

/* ─── shadcn-inspired Design Tokens ─── */
const t = {
  background: '#09090b',
  foreground: '#fafafa',
  card: '#09090b',
  cardForeground: '#fafafa',
  popover: '#09090b',
  popoverForeground: '#fafafa',
  primary: '#fafafa',
  primaryForeground: '#18181b',
  secondary: '#27272a',
  secondaryForeground: '#fafafa',
  muted: '#27272a',
  mutedForeground: '#a1a1aa',
  accent: '#27272a',
  accentForeground: '#fafafa',
  destructive: '#ef4444',
  destructiveForeground: '#fafafa',
  border: '#27272a',
  input: '#27272a',
  ring: '#d4d4d8',
  radius: '0.5rem',
  radiusLg: '0.75rem',
  fontSans: "'Inter', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', monospace",
};

/* ─── Helpers ─── */
function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/* ─── Sub-components ─── */

function Card({ children, style = {} }) {
  return (
    <div
      style={{
        background: t.card,
        color: t.cardForeground,
        border: `1px solid ${t.border}`,
        borderRadius: t.radiusLg,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CardHeader({ children, style = {} }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '24px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CardTitle({ children }) {
  return (
    <h3
      style={{
        fontSize: '16px',
        fontWeight: 600,
        letterSpacing: '-0.2px',
        lineHeight: 1.3,
        margin: 0,
      }}
    >
      {children}
    </h3>
  );
}

function CardDescription({ children }) {
  return (
    <p
      style={{
        fontSize: '14px',
        color: t.mutedForeground,
        lineHeight: 1.5,
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function CardContent({ children, style = {} }) {
  return (
    <div style={{ padding: '0 24px 24px', ...style }}>{children}</div>
  );
}

function CardFooter({ children, style = {} }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px 24px',
        gap: '8px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Button({ children, variant = 'default', size = 'default', onClick, style = {}, disabled }) {
  const variants = {
    default: {
      background: t.primary,
      color: t.primaryForeground,
      border: 'none',
    },
    destructive: {
      background: t.destructive,
      color: t.destructiveForeground,
      border: 'none',
    },
    outline: {
      background: 'transparent',
      color: t.foreground,
      border: `1px solid ${t.border}`,
    },
    secondary: {
      background: t.secondary,
      color: t.secondaryForeground,
      border: 'none',
    },
    ghost: {
      background: 'transparent',
      color: t.foreground,
      border: 'none',
    },
    link: {
      background: 'transparent',
      color: t.primary,
      border: 'none',
      textDecoration: 'underline',
      textUnderlineOffset: '4px',
    },
  };

  const sizes = {
    default: { height: '36px', padding: '0 16px', fontSize: '14px' },
    sm: { height: '32px', padding: '0 12px', fontSize: '13px' },
    lg: { height: '40px', padding: '0 24px', fontSize: '14px' },
    icon: { height: '36px', width: '36px', padding: 0, fontSize: '14px' },
  };

  const [hovered, setHovered] = useState(false);

  const hoverBg =
    variant === 'default'
      ? '#e4e4e7'
      : variant === 'destructive'
      ? '#dc2626'
      : variant === 'outline'
      ? 'rgba(255,255,255,0.05)'
      : variant === 'secondary'
      ? '#3f3f46'
      : variant === 'ghost'
      ? 'rgba(255,255,255,0.05)'
      : 'transparent';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        borderRadius: t.radius,
        fontWeight: 500,
        fontFamily: t.fontSans,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        outline: 'none',
        whiteSpace: 'nowrap',
        transition: 'all 0.15s ease',
        ...variants[variant],
        ...sizes[size],
        ...(hovered && !disabled ? { background: hoverBg } : {}),
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Input({ placeholder, type = 'text', style = {} }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        display: 'flex',
        height: '36px',
        width: '100%',
        padding: '0 12px',
        borderRadius: t.radius,
        border: `1px solid ${focused ? t.ring : t.border}`,
        background: t.background,
        color: t.foreground,
        fontSize: '14px',
        fontFamily: t.fontSans,
        outline: 'none',
        transition: 'all 0.15s ease',
        boxShadow: focused ? `0 0 0 2px rgba(212,212,216,0.15)` : 'none',
        ...style,
      }}
    />
  );
}

function Label({ children, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        fontSize: '14px',
        fontWeight: 500,
        color: t.foreground,
        marginBottom: '6px',
        display: 'block',
      }}
    >
      {children}
    </label>
  );
}

function Checkbox({ checked, onChange, label }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        color: t.foreground,
      }}
    >
      <div
        onClick={() => onChange?.(!checked)}
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '4px',
          border: `1px solid ${checked ? t.primary : t.border}`,
          background: checked ? t.primary : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
          flexShrink: 0,
        }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M2 5L4 7L8 3"
              stroke={t.primaryForeground}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      {label}
    </label>
  );
}

function Select({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '36px',
          padding: '0 12px',
          borderRadius: t.radius,
          border: `1px solid ${t.border}`,
          background: t.background,
          color: selected ? t.foreground : t.mutedForeground,
          fontSize: '14px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <span style={{ fontSize: '10px', opacity: 0.5 }}>▼</span>
      </div>
      {open && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 40,
            }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              zIndex: 50,
              background: t.popover,
              border: `1px solid ${t.border}`,
              borderRadius: t.radius,
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              overflow: 'hidden',
            }}
          >
            {options.map((opt) => (
              <div
                key={opt.value}
                onClick={() => {
                  onChange?.(opt.value);
                  setOpen(false);
                }}
                style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  color: t.popoverForeground,
                  transition: 'background 0.1s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = t.accent)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Badge({ children, variant = 'default' }) {
  const variants = {
    default: { bg: t.primary, color: t.primaryForeground },
    secondary: { bg: t.secondary, color: t.secondaryForeground },
    destructive: { bg: t.destructive, color: t.destructiveForeground },
    outline: { bg: 'transparent', color: t.foreground, border: `1px solid ${t.border}` },
  };
  const v = variants[variant];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 600,
        fontFamily: t.fontSans,
        border: v.border || 'none',
        background: v.bg,
        color: v.color,
        transition: 'all 0.15s ease',
      }}
    >
      {children}
    </span>
  );
}

function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: t.muted,
        borderRadius: t.radius,
        padding: '4px',
        gap: '2px',
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          style={{
            padding: '4px 12px',
            fontSize: '13px',
            fontWeight: 500,
            borderRadius: 'calc(0.5rem - 4px)',
            border: 'none',
            cursor: 'pointer',
            background: activeTab === tab ? t.background : 'transparent',
            color: activeTab === tab ? t.foreground : t.mutedForeground,
            boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

function Switch({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange?.(!checked)}
      style={{
        width: '40px',
        height: '22px',
        borderRadius: '9999px',
        background: checked ? t.primary : t.muted,
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s ease',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '2px',
          left: checked ? 'calc(100% - 20px)' : '2px',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: checked ? t.primaryForeground : t.foreground,
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}
      />
    </div>
  );
}

function Separator({ style = {} }) {
  return (
    <div
      style={{
        height: '1px',
        background: t.border,
        width: '100%',
        ...style,
      }}
    />
  );
}

/* ─── Main Showcase ─── */

export default function DesignTrial2() {
  const [checkbox1, setCheckbox1] = useState(true);
  const [checkbox2, setCheckbox2] = useState(false);
  const [tab, setTab] = useState('Account');
  const [switch1, setSwitch1] = useState(true);
  const [month, setMonth] = useState('');

  return (
    <div
      style={{
        minHeight: '100vh',
        background: t.background,
        color: t.foreground,
        fontFamily: t.fontSans,
        padding: '48px',
        lineHeight: 1.5,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '48px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.3px' }}>
          shadcn/ui Direction Trial
        </h1>
        <p style={{ color: t.mutedForeground, fontSize: '15px', margin: 0, maxWidth: '560px' }}>
          Rounded, structured, accessible components. Dark zinc palette. Form-heavy layout.
          Think Vercel, Resend, Linear settings pages.
        </p>
      </div>

      {/* ─── Grid of Cards ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px',
          maxWidth: '1100px',
        }}
      >
        {/* Card 1: Payment Form */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>All transactions are secure and encrypted.</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <Label>Name on Card</Label>
                <Input placeholder="John Doe" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <Label>Card Number</Label>
                  <Input placeholder="1234 5678 9012 3456" />
                </div>
                <div>
                  <Label>CVV</Label>
                  <Input placeholder="123" style={{ width: '100%' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <Label>Month</Label>
                  <Select
                    placeholder="MM"
                    value={month}
                    onChange={setMonth}
                    options={[
                      { value: '01', label: 'January' },
                      { value: '02', label: 'February' },
                      { value: '03', label: 'March' },
                    ]}
                  />
                </div>
                <div>
                  <Label>Year</Label>
                  <Select
                    placeholder="YYYY"
                    value=""
                    onChange={() => {}}
                    options={[
                      { value: '2025', label: '2025' },
                      { value: '2026', label: '2026' },
                    ]}
                  />
                </div>
              </div>
              <Checkbox
                checked={checkbox1}
                onChange={setCheckbox1}
                label="Save card for future payments"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button>Submit</Button>
            <Button variant="outline">Cancel</Button>
          </CardFooter>
        </Card>

        {/* Card 2: Team & Status */}
        <Card>
          <CardHeader style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: t.muted,
                margin: '0 auto 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
              }}
            >
              👥
            </div>
            <CardTitle>No Team Members</CardTitle>
            <CardDescription>Invite your team to collaborate on this project.</CardDescription>
          </CardHeader>
          <CardContent style={{ textAlign: 'center' }}>
            <Button variant="outline">+ Invite Members</Button>
          </CardContent>
          <Separator style={{ margin: '0 24px' }} />
          <CardContent style={{ paddingTop: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Badge variant="secondary">● Syncing</Badge>
              <Badge variant="secondary">● Updating</Badge>
              <Badge variant="secondary">● Loading</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Compute Environment */}
        <Card>
          <CardHeader>
            <CardTitle>Compute Environment</CardTitle>
            <CardDescription>Select the compute environment for your cluster.</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <RadioCard
                title="Kubernetes"
                description="Run GPU workloads on a K8s configured cluster. This is the default."
                selected
              />
              <RadioCard
                title="Virtual Machine"
                description="Access a VM configured cluster to run workloads. (Coming soon)"
              />
            </div>
          </CardContent>
          <Separator style={{ margin: '0 24px 16px' }} />
          <CardContent>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>Number of GPUs</div>
                <div style={{ fontSize: '13px', color: t.mutedForeground }}>You can add more later.</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button variant="outline" size="icon" style={{ borderRadius: '6px' }}>−</Button>
                <span style={{ fontFamily: t.fontMono, fontSize: '14px', minWidth: '20px', textAlign: 'center' }}>
                  8
                </span>
                <Button variant="outline" size="icon" style={{ borderRadius: '6px' }}>+</Button>
              </div>
            </div>
          </CardContent>
          <Separator style={{ margin: '0 24px 16px' }} />
          <CardContent>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>Wallpaper Tinting</div>
                <div style={{ fontSize: '13px', color: t.mutedForeground }}>Allow the wallpaper to be tinted.</div>
              </div>
              <Switch checked={switch1} onChange={setSwitch1} />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Settings & Tabs */}
        <Card>
          <CardHeader>
            <div style={{ marginBottom: '12px' }}>
              <Tabs
                tabs={['Account', 'Security', 'Notifications']}
                activeTab={tab}
                onChange={setTab}
              />
            </div>
          </CardHeader>
          <CardContent>
            {tab === 'Account' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <Label>Display Name</Label>
                  <Input placeholder="@shadcn" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input placeholder="you@example.com" type="email" />
                </div>
                <Checkbox
                  checked={checkbox2}
                  onChange={setCheckbox2}
                  label="I agree to the terms and conditions"
                />
              </div>
            )}
            {tab === 'Security' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderRadius: t.radius,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>Two-factor authentication</div>
                    <div style={{ fontSize: '13px', color: t.mutedForeground }}>Verify via email or phone number.</div>
                  </div>
                  <Button size="sm">Enable</Button>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderRadius: t.radius,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '16px' }}>✓</span>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>Your profile has been verified.</span>
                  </div>
                  <span style={{ color: t.mutedForeground, fontSize: '13px' }}>→</span>
                </div>
              </div>
            )}
            {tab === 'Notifications' && (
              <div style={{ color: t.mutedForeground, fontSize: '14px' }}>
                Notification preferences would appear here.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 5: Button Showcase */}
        <Card>
          <CardHeader>
            <CardTitle>Button Variants</CardTitle>
            <CardDescription>All available button styles.</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="link">Link</Button>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon">+</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 6: Appearance */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how GeoWatch looks on your device.</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <Label>Font Size</Label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <Button variant="outline" size="sm">Small</Button>
                  <Button variant="secondary" size="sm">Medium</Button>
                  <Button variant="outline" size="sm">Large</Button>
                </div>
              </div>
              <Separator />
              <div>
                <Label>Theme</Label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: t.radius,
                      background: '#09090b',
                      border: `2px solid ${t.primary}`,
                      cursor: 'pointer',
                    }}
                  />
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: t.radius,
                      background: '#ffffff',
                      border: `2px solid ${t.border}`,
                      cursor: 'pointer',
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: `1px solid ${t.border}` }}>
        <p style={{ fontSize: '13px', color: t.mutedForeground }}>
          shadcn/ui direction trial. Note: this aesthetic uses rounded corners (8–12px),
          structured cards, and form-heavy layouts. Compare with /trial for the Linear direction.
        </p>
      </div>
    </div>
  );
}

/* ─── Radio Card Component ─── */
function RadioCard({ title, description, selected = false }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '14px',
        borderRadius: t.radius,
        border: `1px solid ${selected ? t.foreground : hovered ? 'rgba(255,255,255,0.15)' : t.border}`,
        background: selected ? 'rgba(255,255,255,0.03)' : 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '12px',
        transition: 'all 0.15s ease',
      }}
    >
      <div>
        <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>{title}</div>
        <div style={{ fontSize: '13px', color: t.mutedForeground, lineHeight: 1.4 }}>{description}</div>
      </div>
      <div
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          border: `2px solid ${selected ? t.foreground : t.border}`,
          flexShrink: 0,
          marginTop: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected && (
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: t.foreground,
            }}
          />
        )}
      </div>
    </div>
  );
}
