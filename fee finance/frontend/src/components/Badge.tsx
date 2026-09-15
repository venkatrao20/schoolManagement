import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | 'default'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'purple'
    | 'amber'
    | 'emerald'
    | 'sky'
    | 'indigo'
    | 'teal';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
}) => {
  const variantStyles = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    sky: 'bg-sky-50 text-sky-700 border-sky-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
  };

  const dotStyles = {
    default: 'bg-slate-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-blue-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    sky: 'bg-sky-500',
    indigo: 'bg-indigo-500',
    teal: 'bg-teal-500',
  };

  const sizeStyles = {
    sm: 'px-2.5 py-0.5 text-xs font-semibold',
    md: 'px-3 py-1 text-sm font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-sm ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[variant]}`} />}
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status?.toUpperCase()) {
    case 'ENROLLED':
      return <Badge variant="success" dot>Enrolled</Badge>;
    case 'ADMITTED':
      return <Badge variant="sky" dot>Admitted</Badge>;
    case 'APPLIED':
      return <Badge variant="info" dot>Applied</Badge>;
    case 'ENQUIRY':
      return <Badge variant="purple" dot>Enquiry</Badge>;
    case 'WITHDRAWN':
      return <Badge variant="danger" dot>Withdrawn</Badge>;
    case 'ALUMNI':
      return <Badge variant="default" dot>Alumni</Badge>;
    case 'APPROVED':
      return <Badge variant="success" dot>Approved</Badge>;
    case 'PENDING':
      return <Badge variant="warning" dot>Pending</Badge>;
    case 'UNDER_REVIEW':
      return <Badge variant="amber" dot>Under Review</Badge>;
    case 'WAITLISTED':
      return <Badge variant="purple" dot>Waitlisted</Badge>;
    case 'REJECTED':
      return <Badge variant="danger" dot>Rejected</Badge>;
    case 'EXPIRED':
      return <Badge variant="default" dot>Expired</Badge>;
    case 'ACTIVE':
      return <Badge variant="success" dot>Active</Badge>;
    case 'SUPERSEDED':
      return <Badge variant="default" dot>Superseded</Badge>;
    case 'CANCELLED':
      return <Badge variant="danger" dot>Cancelled</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
};

export const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  switch (role) {
    case 'SUPER_ADMIN':
      return <Badge variant="purple">SuperAdmin</Badge>;
    case 'ADMIN':
      return <Badge variant="info">Admin</Badge>;
    case 'FINANCE':
      return <Badge variant="emerald">Finance</Badge>;
    case 'STAFF':
      return <Badge variant="default">Staff</Badge>;
    default:
      return <Badge variant="default">{role}</Badge>;
  }
};

export const FrequencyBadge: React.FC<{ frequency: string }> = ({ frequency }) => {
  if (frequency === 'QUARTERLY') {
    return <Badge variant="indigo">Quarterly (4 Splits)</Badge>;
  }
  return <Badge variant="teal">Full-Year (Single)</Badge>;
};

export const DiscountTypeBadge: React.FC<{ type: string; value: number | string }> = ({
  type,
  value,
}) => {
  if (type === 'PERCENTAGE') {
    return <Badge variant="purple">{value}% Off</Badge>;
  }
  return <Badge variant="emerald">₹{Number(value).toLocaleString()} Flat Off</Badge>;
};
