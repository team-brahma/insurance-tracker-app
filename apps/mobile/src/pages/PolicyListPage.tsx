import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearch } from '@hooks/useSearch.js';
import {
  Search,
  SlidersHorizontal,
  Phone,
  MessageCircle,
  Pencil,
  ChevronRight,
  AlertTriangle,
  X,
  Calendar,
  Plus,
  UserCheck,
  Users,
  Check,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useHistory, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import AppShellPage from '@components/layout/AppShellPage.js';
import Badge from '@components/ui/Badge.js';
import EmptyState from '@components/ui/EmptyState.js';
import PageLoader from '@components/ui/PageLoader.js';
import SurfaceCard from '@components/ui/SurfaceCard.js';
import Dialog from '@components/ui/Dialog.js';
import Button from '@components/ui/Button.js';
import { useInfinitePoliciesQuery } from '@features/policies/hooks/usePoliciesQuery.js';
import type { PolicyListParams } from '@features/policies/types/index.js';
import { RENEWAL_STATUS_LABELS } from '@repo/constants';
import { usePolicyTypesQuery } from '@features/policyTypes/index.js';
import type { PolicyWithClient, UrgencyBucket } from '@repo/types';
import { daysToExpiry, formatDate, initials, isMotorPolicy, urgencyBucket } from '@repo/utils';
import { cn } from '@utils/Cn.js';
import { IonRefresher, IonRefresherContent } from '@ionic/react';

type ViewMode = 'card' | 'list';

const VIEW_MODE_KEY = 'policy-list-view-mode';

function readStoredViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem(VIEW_MODE_KEY);
    if (stored === 'card' || stored === 'list') return stored;
  } catch {
    // ignore
  }
  return 'card';
}

interface UrgencyCounts {
  overdue: number;
  due7: number;
  due30: number;
  future: number;
  renewed?: number;
  inactive?: number;
  all: number;
}

interface CustomMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  urgencyCounts?: UrgencyCounts;
}

const ALL_STATUSES = Object.keys(RENEWAL_STATUS_LABELS);

function daysLabel(days: number): string {
  if (days < 0) {
    const abs = Math.abs(days);
    return abs === 1 ? '1 day overdue' : `${String(abs)} days overdue`;
  }
  if (days === 0) return 'Due today';
  return days === 1 ? 'Due in 1 day' : `Due in ${String(days)} days`;
}

function statusTone(
  status: string,
): 'pending' | 'reminded' | 'renewed' | 'notRenewed' | 'lapsed' | 'inactive' {
  if (status === 'PENDING') return 'pending';
  if (status === 'REMINDED') return 'reminded';
  if (status === 'RENEWED') return 'renewed';
  if (status === 'NOT_RENEWED') return 'notRenewed';
  if (status === 'INACTIVE') return 'inactive';
  return 'lapsed';
}

const urgencyColors: Record<string, string> = {
  overdue: 'bg-red-edge',
  due7: 'bg-amber-edge',
  due30: 'bg-green-edge',
  future: 'bg-gray-edge',
};

const initialsColors = [
  'bg-sky-100 text-sky-700 dark:bg-sky-950/45 dark:text-sky-300 border-sky-200/40',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-300 border-emerald-200/40',
  'bg-amber-100 text-amber-700 dark:bg-amber-950/45 dark:text-amber-300 border-amber-200/40',
  'bg-rose-100 text-rose-700 dark:bg-rose-950/45 dark:text-rose-300 border-rose-200/40',
  'bg-violet-100 text-violet-700 dark:bg-violet-950/45 dark:text-violet-300 border-violet-200/40',
  'bg-teal-100 text-teal-700 dark:bg-teal-950/45 dark:text-teal-300 border-teal-200/40',
];

function getInitialsColor(name: string) {
  const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return initialsColors[sum % initialsColors.length] ?? initialsColors[0] ?? '';
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 380, damping: 28 } },
};

const listVariant = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 380, damping: 30 } },
};

/** Reusable chip-style filter toggle */
function FilterChips({
  label,
  items,
  selected,
  getLabel,
  onToggle,
  onClear,
}: {
  label: string;
  items: string[];
  selected: string[];
  getLabel: (v: string) => string | undefined;
  onToggle: (v: string) => void;
  onClear?: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint">{label}</p>
        {onClear && selected.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] text-slate font-bold hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              onToggle(item);
            }}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
              selected.includes(item)
                ? 'border-slate bg-slate text-white'
                : 'border-line-strong bg-surface text-ink-soft hover:bg-paper',
            )}
          >
            {getLabel(item)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** View mode toggle — compact pill that sits in the counts row */
function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  return (
    <div
      className="flex items-center rounded-2xl border border-line-strong bg-surface/80 overflow-hidden shadow-sm p-0.5 gap-0.5"
      role="group"
      aria-label="Switch view"
    >
      <button
        id="policy-view-card"
        type="button"
        aria-label="Card view"
        title="Card view"
        onClick={() => { onChange('card'); }}
        className={cn(
          'flex h-8 w-9 items-center justify-center rounded-xl transition-all duration-200',
          mode === 'card'
            ? 'bg-slate text-white shadow-sm'
            : 'text-ink-faint hover:bg-paper hover:text-ink',
        )}
      >
        <LayoutGrid size={15} />
      </button>
      <button
        id="policy-view-list"
        type="button"
        aria-label="List view"
        title="List view"
        onClick={() => { onChange('list'); }}
        className={cn(
          'flex h-8 w-9 items-center justify-center rounded-xl transition-all duration-200',
          mode === 'list'
            ? 'bg-slate text-white shadow-sm'
            : 'text-ink-faint hover:bg-paper hover:text-ink',
        )}
      >
        <List size={15} />
      </button>
    </div>
  );
}

// ─── Enriched policy type ──────────────────────────────────────────────────
type EnrichedPolicy = PolicyWithClient & { daysToExpiry: number; urgency: UrgencyBucket };



// ─── List row ─────────────────────────────────────────────────────────────
function PolicyListRow({
  policy,
  onNavigate,
  onEdit,
  onWhatsApp,
}: {
  policy: EnrichedPolicy;
  onNavigate: () => void;
  onEdit: () => void;
  onWhatsApp: () => void;
}) {
  const isRenewed = policy.renewalStatus === 'RENEWED';

  const daysColor = isRenewed
    ? 'text-cyan-600 dark:text-cyan-400'
    : policy.urgency === 'overdue'
    ? 'text-red-fg'
    : policy.urgency === 'due7'
    ? 'text-amber-fg'
    : policy.urgency === 'due30'
    ? 'text-green-fg'
    : 'text-ink-faint';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onNavigate}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate(); }}
      className={cn(
        'group flex items-stretch w-full rounded-2xl border overflow-hidden transition-all duration-200 cursor-pointer active:scale-[0.995]',
        isRenewed
          ? 'border-cyan-500/40 dark:border-cyan-400/50 bg-gradient-to-r from-cyan-500/[0.03] via-surface to-surface shadow-sm hover:border-cyan-500 hover:shadow-[0_4px_20px_rgba(6,182,212,0.15)]'
          : 'border-line bg-surface hover:border-slate/40 hover:shadow-[0_4px_16px_rgba(15,118,110,0.07)] dark:hover:shadow-[0_4px_16px_rgba(45,212,191,0.04)]',
      )}
    >
      {/* Urgency edge strip */}
      <div
        className={cn(
          'w-1.5 flex-none transition-all duration-200 group-hover:w-2',
          isRenewed
            ? 'bg-gradient-to-b from-cyan-400 via-sky-500 to-blue-600'
            : urgencyColors[policy.urgency] ?? 'bg-gray-edge',
        )}
      />

      {/* Card-like body */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* ── Top section: avatar + name + days + chevron ── */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-2.5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-2xl border text-xs font-bold shadow-sm transition-transform duration-200 group-hover:scale-105',
                isRenewed
                  ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-300/60'
                  : getInitialsColor(policy.insuredPersonName ?? policy.client.insuredName),
              )}
            >
              {initials(policy.insuredPersonName ?? policy.client.insuredName)}
            </div>
            {isRenewed && (
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-white ring-2 ring-surface text-[8px] shadow-sm">
                <Check size={9} strokeWidth={3.5} />
              </span>
            )}
          </div>

          {/* Name + urgency label */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold tracking-tight text-ink group-hover:text-slate transition-colors duration-150 leading-snug truncate">
              {policy.insuredPersonName ?? policy.client.insuredName}
            </p>
            <p className={cn('text-xs font-bold mt-0.5', daysColor)}>
              {daysLabel(policy.daysToExpiry)}
            </p>
          </div>

          {/* Chevron */}
          <div className="shrink-0 flex h-5 w-5 items-center justify-center text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-slate">
            <ChevronRight size={15} />
          </div>
        </div>

        {/* ── Badges row ── */}
        <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3">
          {policy.insuredPersonName && policy.client?.insuredName && (
            <Badge
              tone="neutral"
              className="border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold normal-case tracking-normal flex items-center gap-1"
            >
              <Users size={10} className="text-sky-500 shrink-0" />
              {policy.client.insuredName}
            </Badge>
          )}
          {(policy.isOutsourced || policy.associateAgent) && (
            <Badge
              tone="neutral"
              className="border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold normal-case tracking-normal flex items-center gap-1"
            >
              <UserCheck size={10} className="text-purple-500 shrink-0" />
              {policy.associateAgent ? policy.associateAgent.name : 'Outsourced'}
            </Badge>
          )}
          <Badge tone="neutral">{policy.policyType.name}</Badge>
          {policy.insuranceProvider && (
            <Badge
              tone="neutral"
              className="border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold normal-case tracking-normal"
            >
              {policy.insuranceProvider.name}
            </Badge>
          )}
          {policy.vehicleNumber ? (
            <Badge tone="neutral" className="font-mono normal-case tracking-[0.08em]">
              {policy.vehicleNumber}
            </Badge>
          ) : isMotorPolicy(policy.policyType.name) ? (
            <Badge
              tone="pending"
              className="border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold normal-case tracking-normal"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1" />
              No Vehicle No
            </Badge>
          ) : null}
          <Badge
            tone={statusTone(policy.renewalStatus)}
            dot={!isRenewed}
            className={cn(
              isRenewed && 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 font-extrabold',
            )}
          >
            {RENEWAL_STATUS_LABELS[policy.renewalStatus] ?? policy.renewalStatus}
          </Badge>
          {policy.isClaimed && (
            <Badge
              tone="overdue"
              className="bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-900/50"
            >
              Claimed
            </Badge>
          )}
        </div>

        {/* Reference note */}
        {policy.referenceNote && (
          <div className="mx-4 mb-3 rounded-xl bg-paper/60 border border-line/45 px-3 py-2 text-xs text-ink-soft">
            <span className="text-[9px] font-black tracking-wider text-ink-faint mr-1.5 uppercase">REF:</span>
            <span className="font-semibold text-ink">
              {policy.referenceNote.toLowerCase().startsWith('ref:')
                ? policy.referenceNote.slice(4).trim()
                : policy.referenceNote}
            </span>
          </div>
        )}

        {/* ── Footer: end date + actions ── */}
        <div
          className="flex items-center justify-between border-t border-line/80 px-4 py-2.5 bg-surface/30 group-hover:bg-surface/70 transition-colors duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 text-ink-faint">
            <Calendar size={12} className="shrink-0 text-ink-faint/70" />
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] whitespace-nowrap">
              {`Ends ${formatDate(policy.endDate)}`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {policy.client.mobileNumber && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`tel:${policy.client.mobileNumber}`);
                  }}
                  title="Call client"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-line-strong bg-surface text-ink-soft shadow-sm transition hover:bg-paper hover:text-slate active:scale-95 cursor-pointer"
                >
                  <Phone size={13} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onWhatsApp();
                  }}
                  title="Send WhatsApp"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-green-edge/30 bg-green-bg text-green-fg shadow-sm transition hover:bg-green-edge/20 active:scale-95 cursor-pointer"
                >
                  <MessageCircle size={13} />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title="Edit policy"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-line-strong bg-surface text-ink-soft shadow-sm transition hover:bg-paper hover:text-slate active:scale-95 cursor-pointer"
            >
              <Pencil size={12} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Card row (existing design) ───────────────────────────────────────────
function PolicyCard({
  policy,
  onNavigate,
  onEdit,
  onWhatsApp,
}: {
  policy: EnrichedPolicy;
  onNavigate: () => void;
  onEdit: () => void;
  onWhatsApp: () => void;
}) {
  const isRenewed = policy.renewalStatus === 'RENEWED';

  return (
    <SurfaceCard
      className={cn(
        'group h-full cursor-pointer overflow-hidden p-0 sm:p-0 lg:p-0 backdrop-blur-sm border transition-all duration-300 active:scale-[0.99] relative',
        isRenewed
          ? 'border-cyan-500/40 dark:border-cyan-400/50 bg-gradient-to-r from-cyan-500/[0.03] via-surface to-surface shadow-[0_4px_20px_rgba(6,182,212,0.1)] hover:border-cyan-500 hover:shadow-[0_8px_30px_rgba(6,182,212,0.2)]'
          : 'border-line hover:border-slate/40 dark:hover:border-slate/40 hover:shadow-[0_12px_40px_rgba(15,118,110,0.06)] dark:hover:shadow-[0_12px_40px_rgba(45,212,191,0.04)]',
      )}
      onClick={onNavigate}
    >
      <div className="flex h-full items-stretch">
        {/* Urgency edge */}
        <div
          className={cn(
            'w-2 flex-none transition-all duration-300 group-hover:w-2.5',
            isRenewed
              ? 'bg-gradient-to-b from-cyan-400 via-sky-500 to-blue-600 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
              : urgencyColors[policy.urgency] ?? 'bg-gray-edge',
          )}
        />

        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div className="flex-1 p-4 sm:p-5 flex flex-col gap-3">
            {/* Name + Avatar Block */}
            <div className="flex items-start gap-3">
              <div className="relative">
                <div
                  className={cn(
                    'flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border text-xs font-bold shadow-sm transition-transform duration-300 group-hover:scale-105',
                    isRenewed
                      ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-300/60 shadow-sm'
                      : getInitialsColor(policy.insuredPersonName ?? policy.client.insuredName),
                  )}
                >
                  {initials(policy.insuredPersonName ?? policy.client.insuredName)}
                </div>
                {isRenewed && (
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-white ring-2 ring-surface text-[8px] shadow-sm">
                    <Check size={9} strokeWidth={3.5} />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-ink transition duration-200 group-hover:text-slate break-words leading-snug">
                  {policy.insuredPersonName ?? policy.client.insuredName}
                </h3>
                <p
                  className={cn(
                    'mt-0.5 text-xs font-bold leading-normal flex items-center gap-1.5',
                    isRenewed
                      ? 'text-cyan-600 dark:text-cyan-400 font-extrabold'
                      : policy.urgency === 'overdue'
                      ? 'text-red-fg'
                      : policy.urgency === 'due7'
                      ? 'text-amber-fg'
                      : policy.urgency === 'due30'
                      ? 'text-green-fg'
                      : 'text-ink-faint',
                  )}
                >
                  {daysLabel(policy.daysToExpiry)}
                </p>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              {policy.insuredPersonName && policy.client?.insuredName && (
                <Badge
                  tone="neutral"
                  className="border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold normal-case tracking-normal flex items-center gap-1"
                >
                  <Users size={10} className="text-sky-500 shrink-0" />
                  Client: {policy.client.insuredName}
                </Badge>
              )}
              {(policy.isOutsourced || policy.associateAgent) && (
                <Badge
                  tone="neutral"
                  className="border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold normal-case tracking-normal flex items-center gap-1"
                >
                  <UserCheck size={10} className="text-purple-500 shrink-0" />
                  Outsourced{policy.associateAgent ? `: ${policy.associateAgent.name}` : ''}
                </Badge>
              )}
              <Badge tone="neutral">{policy.policyType.name}</Badge>
              {policy.insuranceProvider && (
                <Badge
                  tone="neutral"
                  className="border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold normal-case tracking-normal"
                >
                  {policy.insuranceProvider.name}
                </Badge>
              )}
              {policy.vehicleNumber ? (
                <Badge
                  tone="neutral"
                  className="font-mono normal-case tracking-[0.08em]"
                >
                  {policy.vehicleNumber}
                </Badge>
              ) : isMotorPolicy(policy.policyType.name) ? (
                <Badge
                  tone="pending"
                  className="border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold normal-case tracking-normal"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1" />
                  Vehicle No : Pending
                </Badge>
              ) : null}
              <Badge
                tone={statusTone(policy.renewalStatus)}
                dot={!isRenewed}
                className={cn(
                  isRenewed &&
                    'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 font-extrabold',
                )}
              >
                {RENEWAL_STATUS_LABELS[policy.renewalStatus] ?? policy.renewalStatus}
              </Badge>

              {policy.isClaimed && (
                <Badge
                  tone="overdue"
                  className="bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-900/50"
                >
                  Claimed
                </Badge>
              )}
            </div>

          {policy.referenceNote && (
            <div className="rounded-xl bg-paper/60 border border-line/45 px-3 py-2 text-xs text-ink-soft transition-colors duration-200 group-hover:bg-paper/85">
              <span className="text-[9px] font-black tracking-wider text-ink-faint mr-1.5 uppercase">
                REF:
              </span>
              <span className="font-semibold text-ink">
                {policy.referenceNote.toLowerCase().startsWith('ref:')
                  ? policy.referenceNote.slice(4).trim()
                  : policy.referenceNote}
              </span>
            </div>
          )}
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between border-t border-line/80 px-4 sm:px-5 py-3 bg-surface/30 group-hover:bg-surface/70 transition-colors duration-300">
          <div className="flex items-center gap-1.5 text-ink-faint">
            <Calendar size={12} className="shrink-0 text-ink-faint/70" />
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.15em]">
              {`Ends ${formatDate(policy.endDate)}`}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {policy.client.mobileNumber && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`tel:${policy.client.mobileNumber}`);
                  }}
                  title="Call client"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-line-strong bg-surface text-ink-soft shadow-sm transition hover:bg-paper hover:text-slate active:scale-95 cursor-pointer"
                >
                  <Phone size={13} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onWhatsApp();
                  }}
                  title="Send WhatsApp"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-green-edge/30 bg-green-bg text-green-fg shadow-sm transition hover:bg-green-edge/20 active:scale-95 cursor-pointer"
                >
                  <MessageCircle size={13} />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title="Edit policy"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-line-strong bg-surface text-ink-soft shadow-sm transition hover:bg-paper hover:text-slate active:scale-95 cursor-pointer"
            >
              <Pencil size={12} />
            </button>
            <div className="flex h-5 w-5 items-center justify-center text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-slate">
              <ChevronRight size={14} />
            </div>
          </div>
        </div>
      </div>
      </div>
    </SurfaceCard>
  );
}

export default function PolicyListPage() {
  const history = useHistory();
  const location = useLocation();

  const { searchText, debouncedSearchText, setSearchText, clearSearch } = useSearch();
  const { data: policyTypesRes } = usePolicyTypesQuery();
  const policyTypes = useMemo(() => policyTypesRes?.data ?? [], [policyTypesRes]);
  const allTypeIds = useMemo(() => policyTypes.map((t) => t.id), [policyTypes]);

  const [viewMode, setViewMode] = useState<ViewMode>(readStoredViewMode);

  const [activeUrgency, setActiveUrgency] = useState<UrgencyBucket | null>(null);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [tempFilterTypes, setTempFilterTypes] = useState<string[]>([]);
  const [tempFilterStatuses, setTempFilterStatuses] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const handleViewModeChange = (m: ViewMode) => {
    setViewMode(m);
    try {
      localStorage.setItem(VIEW_MODE_KEY, m);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const urgency = queryParams.get('urgency');
    if (urgency && ['overdue', 'due7', 'due30', 'future'].includes(urgency)) {
      setActiveUrgency(urgency as UrgencyBucket);
    } else {
      setActiveUrgency(null);
    }

    const renewalStatus = queryParams.get('renewalStatus');
    if (renewalStatus && ALL_STATUSES.includes(renewalStatus)) {
      setFilterStatuses([renewalStatus]);
    } else {
      setFilterStatuses([]);
    }
  }, [location.search]);

  const params: PolicyListParams = {};
  if (debouncedSearchText) params.search = debouncedSearchText;
  if (activeUrgency) params.urgency = activeUrgency;
  if (filterStatuses.length > 0) params.renewalStatus = filterStatuses.join(',');
  if (filterTypes.length > 0) params.policyType = filterTypes.join(',');

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useInfinitePoliciesQuery(params);

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allPolicies = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);

  const firstPageMeta = data?.pages[0]?.meta as CustomMeta | undefined;
  const counts = useMemo(() => {
    return {
      overdue: firstPageMeta?.urgencyCounts?.overdue ?? 0,
      due7: firstPageMeta?.urgencyCounts?.due7 ?? 0,
      due30: firstPageMeta?.urgencyCounts?.due30 ?? 0,
      future: firstPageMeta?.urgencyCounts?.future ?? 0,
      renewed: firstPageMeta?.urgencyCounts?.renewed ?? 0,
      inactive: firstPageMeta?.urgencyCounts?.inactive ?? 0,
    };
  }, [firstPageMeta]);

  const enriched = useMemo<EnrichedPolicy[]>(() => {
    if (allPolicies.length === 0) return [];
    const today = new Date();
    return allPolicies
      .map((policy: PolicyWithClient) => {
        const days = daysToExpiry(policy.endDate, today);
        return { ...policy, daysToExpiry: days, urgency: urgencyBucket(days) };
      })
      .sort((a, b) => {
        if (a.daysToExpiry !== b.daysToExpiry) {
          return a.daysToExpiry - b.daysToExpiry;
        }
        const nameA = (a.insuredPersonName ?? a.client?.insuredName ?? '').toLowerCase();
        const nameB = (b.insuredPersonName ?? b.client?.insuredName ?? '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [allPolicies]);

  const activeFilterCount = filterTypes.length + filterStatuses.length;
  const totalCount = firstPageMeta?.urgencyCounts?.all ?? 0;

  if (isLoading) return <PageLoader variant="list" />;

  const isRenewedSelected =
    filterStatuses.length === 1 && filterStatuses[0] === 'RENEWED' && !activeUrgency;
  const isInactiveSelected =
    filterStatuses.length === 1 && filterStatuses[0] === 'INACTIVE' && !activeUrgency;

  const viewTabs = [
    { type: 'all', key: null, label: 'All', count: totalCount },
    { type: 'urgency', key: 'overdue', label: 'Overdue', count: counts.overdue },
    { type: 'urgency', key: 'due7', label: 'Due ≤7d', count: counts.due7 },
    { type: 'urgency', key: 'due30', label: 'Due ≤30d', count: counts.due30 },
    { type: 'urgency', key: 'future', label: 'Future', count: counts.future },
    { type: 'status', key: 'RENEWED', label: 'Renewed', count: counts.renewed },
    { type: 'status', key: 'INACTIVE', label: 'Inactive', count: counts.inactive },
  ] as const;

  return (
    <AppShellPage
      icon={AlertTriangle}
      title="Renewal Workbench"
      subtitle="Search expiring policies, triage urgency, and move into the next customer action."
      actions={
        <Button
          variant="primary"
          size="sm"
          className="!hidden md:!flex items-center gap-1.5"
          onClick={() => {
            history.push('/policies/new');
          }}
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>Add Renewal</span>
        </Button>
      }
      hero={
        <div className="space-y-3">
          {/* ── Row 1: Search + Filter ── */}
          <div className="flex gap-2 items-center">
            <div className="flex h-11 flex-1 items-center gap-2.5 rounded-2xl border border-line bg-paper/90 px-4 shadow-inner transition-all focus-within:border-line-strong focus-within:shadow-none">
              <Search size={15} className="shrink-0 text-ink-faint" />
              <input
                className="flex-1 border-none bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                placeholder="Search client, vehicle, or policy number"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                }}
              />
              {searchText && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-ink-faint hover:bg-surface hover:text-ink transition"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter button */}
            <button
              type="button"
              onClick={() => {
                if (activeFilterCount > 0) {
                  setFilterTypes([]);
                  setFilterStatuses([]);
                  setTempFilterTypes([]);
                  setTempFilterStatuses([]);
                  history.replace('/policies');
                } else {
                  setTempFilterTypes(filterTypes);
                  setTempFilterStatuses(filterStatuses);
                  setShowFilters(true);
                }
              }}
              className={cn(
                'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all cursor-pointer',
                activeFilterCount > 0
                  ? 'border-slate bg-slate text-white shadow-[0_6px_20px_rgba(15,118,110,0.28)] hover:bg-slate-soft'
                  : 'border-line-strong bg-surface text-ink-soft hover:bg-paper',
              )}
              aria-label={activeFilterCount > 0 ? 'Clear active filters' : 'Open filters'}
              title={activeFilterCount > 0 ? 'Clear active filters' : 'Open filters'}
            >
              {activeFilterCount > 0 ? <X size={18} className="stroke-[2.5]" /> : <SlidersHorizontal size={16} />}
              {activeFilterCount > 0 && (
                <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-surface bg-red-edge" />
              )}
            </button>
          </div>

          {/* ── Row 2: Count badge + filter pill + view toggle (right-aligned) ── */}
          <div className="flex items-center gap-2">
            {/* Left: count + filter clear */}
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <Badge tone="accent">{`${String(totalCount)} policies`}</Badge>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterTypes([]);
                    setFilterStatuses([]);
                    setTempFilterTypes([]);
                    setTempFilterStatuses([]);
                    history.replace('/policies');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate/30 bg-slate/15 px-2.5 py-1 text-xs font-bold text-slate hover:bg-slate/25 dark:bg-slate/25 dark:hover:bg-slate/40 transition cursor-pointer"
                  title="Click to clear active filters"
                >
                  <span>{`${String(activeFilterCount)} filter${activeFilterCount > 1 ? 's' : ''}`}</span>
                  <X size={13} className="stroke-[2.5]" />
                </button>
              )}
            </div>
            {/* Right: view mode toggle */}
            <ViewToggle mode={viewMode} onChange={handleViewModeChange} />
          </div>

          {/* Urgency & Status tab pills */}
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-1.5 pb-0.5">
              {viewTabs.map((tab) => {
                const isActive =
                  tab.type === 'all'
                    ? !activeUrgency && filterStatuses.length === 0
                    : tab.type === 'status'
                      ? tab.key === 'RENEWED'
                        ? isRenewedSelected
                        : isInactiveSelected
                      : tab.key === activeUrgency && filterStatuses.length === 0;

                return (
                  <button
                    key={tab.key ?? 'all'}
                    type="button"
                    onClick={() => {
                      if (tab.type === 'status') {
                        setActiveUrgency(null);
                        setFilterStatuses([tab.key]);
                        history.replace(`/policies?renewalStatus=${tab.key}`);
                      } else if (tab.type === 'urgency') {
                        setFilterStatuses([]);
                        setActiveUrgency(tab.key);
                        history.replace(`/policies?urgency=${tab.key}`);
                      } else {
                        setActiveUrgency(null);
                        setFilterStatuses([]);
                        history.replace('/policies');
                      }
                    }}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-3 sm:px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap',
                      isActive
                        ? tab.key === 'RENEWED'
                          ? 'border-cyan-500 bg-cyan-600 text-white shadow-sm shadow-cyan-500/25'
                          : 'border-slate bg-slate text-white shadow-sm'
                        : 'border-line-strong bg-surface text-ink-soft hover:bg-paper',
                    )}
                  >
                    {tab.label}
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[9px] font-black',
                        isActive ? 'bg-white/20 text-white' : 'bg-paper text-ink-faint',
                      )}
                    >
                      {tab.count ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      }
    >
      <IonRefresher
        slot="fixed"
        onIonRefresh={(event) => {
          void refetch().finally(() => {
            event.detail.complete();
          });
        }}
      >
        <IonRefresherContent />
      </IonRefresher>

      <div className="min-w-0 space-y-6">
        {enriched.length === 0 && !isFetchingNextPage && !hasNextPage ? (
          <EmptyState
            icon={AlertTriangle}
            variant={activeFilterCount > 0 ? 'filter' : 'search'}
            title="No renewals matched this view"
            description="Try a broader search, clear your active filters, or switch urgency buckets."
            tip={
              activeFilterCount > 0
                ? 'You have active filters applied. Clearing them will show all renewals.'
                : 'Renewals appear here once a client has a policy with an upcoming expiry date.'
            }
            action={
              activeFilterCount > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterTypes([]);
                    setFilterStatuses([]);
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : null}

        {enriched.length > 0 && (
          <>
            {/* ── CARD VIEW ── */}
            {viewMode === 'card' && (
              <motion.div
                key={`card-${String(activeUrgency)}-${debouncedSearchText}`}
                variants={stagger}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 min-w-0"
              >
                {enriched.map((policy) => (
                  <motion.div key={policy.id} variants={cardVariant} layout className="h-full">
                    <PolicyCard
                      policy={policy}
                      onNavigate={() => { history.push(`/policies/${policy.id}`); }}
                      onEdit={() => { history.push(`/policies/${policy.id}/edit`, { from: location.pathname }); }}
                      onWhatsApp={() => { history.push(`/policies/${policy.id}?wa=true`); }}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* ── LIST VIEW ── */}
            {viewMode === 'list' && (
              <motion.div
                key={`list-${String(activeUrgency)}-${debouncedSearchText}`}
                variants={stagger}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-2"
              >
                {enriched.map((policy) => (
                  <motion.div key={policy.id} variants={listVariant} layout>
                    <PolicyListRow
                      policy={policy}
                      onNavigate={() => { history.push(`/policies/${policy.id}`); }}
                      onEdit={() => { history.push(`/policies/${policy.id}/edit`, { from: location.pathname }); }}
                      onWhatsApp={() => { history.push(`/policies/${policy.id}?wa=true`); }}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </>
        )}

        {/* Infinite scroll sentinel */}
        {hasNextPage && <div ref={sentinelRef} className="h-4" />}

        {/* Loading more indicator */}
        {isFetchingNextPage && (
          <div className="flex items-center justify-center py-8">
            <div className="w-4 h-4 rounded-full border-2 border-slate/30 border-t-slate animate-spin" />
            <span className="ml-2 text-sm text-ink-faint">Loading more...</span>
          </div>
        )}
      </div>

      {/* Filter Sheet Dialog — mobile/tablet only */}
      <Dialog
        open={showFilters}
        onClose={() => {
          setShowFilters(false);
        }}
        title="Filter renewals"
        description="Narrow the workbench to the segment you need right now."
        sheet
      >
        <div className="space-y-6">
          <FilterChips
            label="Policy type"
            items={allTypeIds}
            selected={tempFilterTypes}
            getLabel={(v) => policyTypes.find((t) => t.id === v)?.name ?? v}
            onToggle={(v) => {
              setTempFilterTypes((prev) =>
                prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
              );
            }}
          />

          <FilterChips
            label="Renewal status"
            items={ALL_STATUSES}
            selected={tempFilterStatuses}
            getLabel={(v) => RENEWAL_STATUS_LABELS[v]}
            onToggle={(v) => {
              setTempFilterStatuses((prev) =>
                prev.filter((x) => x !== v).concat(prev.includes(v) ? [] : [v]),
              );
            }}
          />

          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => {
                setTempFilterTypes([]);
                setTempFilterStatuses([]);
                setFilterTypes([]);
                setFilterStatuses([]);
                setShowFilters(false);
                history.replace('/policies');
              }}
            >
              Clear all
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={() => {
                setFilterTypes(tempFilterTypes);
                setFilterStatuses(tempFilterStatuses);
                setShowFilters(false);
              }}
            >
              Apply filters
            </Button>
          </div>
        </div>
      </Dialog>
    </AppShellPage>
  );
}
