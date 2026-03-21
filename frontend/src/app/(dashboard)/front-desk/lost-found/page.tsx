/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback, SyntheticEvent } from 'react';
import toast from 'react-hot-toast';
import { api, reportApiError } from '@/lib/api';
import { LostFoundItem } from '@/lib/types';
import {
  Package,
  MapPin,
  Calendar,
  AlertTriangle,
  ChevronDown,
  X,
} from 'lucide-react';

const INPUT_CLASS =
  'px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe] transition-colors w-full';
const LABEL_CLASS = 'block text-xs font-medium text-slate-600 mb-1';

const itemTypeOptions = [
  { label: 'Water Bottle', value: 'water_bottle' },
  { label: 'Tiffin', value: 'tiffin' },
  { label: 'Bag', value: 'bag' },
  { label: 'Jacket', value: 'jacket' },
  { label: 'Stationery', value: 'stationery' },
  { label: 'Book', value: 'book' },
  { label: 'ID Card', value: 'id_card' },
  { label: 'Electronic', value: 'electronic' },
  { label: 'Jewellery', value: 'jewellery' },
  { label: 'Other', value: 'other' },
];

const locationOptions = [
  { label: 'Playground', value: 'playground' },
  { label: 'Classroom', value: 'classroom' },
  { label: 'Library', value: 'library' },
  { label: 'Cafeteria', value: 'cafeteria' },
  { label: 'Bus', value: 'bus' },
  { label: 'Corridor', value: 'corridor' },
  { label: 'Other', value: 'other' },
];

const statusOptions = [
  { label: 'Found - Unclaimed', value: 'found_unclaimed' },
  { label: 'Lost - Searching', value: 'lost_searching' },
  { label: 'Claimed', value: 'claimed' },
  { label: 'Disposed', value: 'disposed' },
];

function todayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function labelForValue(options: { label: string; value: string }[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

function StatusBadge({ status }: { status: string }) {
  let cls = 'px-2.5 py-0.5 text-xs font-medium rounded-full';
  if (status === 'found_unclaimed') cls += ' bg-amber-50 text-amber-700';
  else if (status === 'claimed') cls += ' bg-emerald-50 text-emerald-700';
  else if (status === 'lost_searching') cls += ' bg-rose-50 text-rose-700';
  else cls += ' bg-slate-100 text-slate-500';

  const label =
    status === 'found_unclaimed'
      ? 'Found'
      : status === 'claimed'
      ? 'Claimed'
      : status === 'lost_searching'
      ? 'Searching'
      : status === 'disposed'
      ? 'Disposed'
      : status;

  return <span className={cls}>{label}</span>;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden animate-pulse">
      <div className="h-32 bg-slate-100" />
      <div className="p-4 space-y-2">
        <div className="flex gap-2">
          <div className="h-5 w-20 bg-slate-100 rounded-full" />
          <div className="h-5 w-16 bg-slate-100 rounded-full" />
        </div>
        <div className="h-4 w-3/4 bg-slate-100 rounded" />
        <div className="h-3 w-1/2 bg-slate-100 rounded" />
        <div className="h-3 w-1/3 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

// ─── Claim Modal ───────────────────────────────────────────────────────────────
interface ClaimModalProps {
  item: LostFoundItem;
  onClose: () => void;
  onClaimed: () => void;
}

function ClaimModal({ item, onClose, onClaimed }: ClaimModalProps) {
  const [claimedBy, setClaimedBy] = useState('');
  const [claimDate, setClaimDate] = useState(todayStr());
  const [verifiedBy, setVerifiedBy] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!claimedBy.trim()) {
      toast.error('Please enter who is claiming the item');
      return;
    }
    setSubmitting(true);
    try {
      await api.claimLostFoundItem(item.id, claimedBy.trim());
      toast.success('Item marked as claimed');
      onClaimed();
      onClose();
    } catch (err) {
      reportApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Mark as Claimed</h3>
            <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Item summary */}
        <div className="bg-[#f1f0ff] rounded-lg px-4 py-3 mb-4 flex items-center gap-3">
          <Package size={20} className="text-[#6c5ce7] shrink-0" />
          <div>
            <p className="text-xs font-medium text-[#6c5ce7]">
              {labelForValue(itemTypeOptions, item.item_type)}
            </p>
            <p className="text-xs text-slate-500">
              Found at {labelForValue(locationOptions, item.location_found)} · {formatDate(item.found_date)}
            </p>
          </div>
          <span className="ml-auto font-mono text-xs text-slate-400">{item.item_number}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={LABEL_CLASS}>
              Claimed By <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={claimedBy}
              onChange={(e) => setClaimedBy(e.target.value)}
              placeholder="Student name / parent name"
              className={INPUT_CLASS}
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS}>
                Claim Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={claimDate}
                onChange={(e) => setClaimDate(e.target.value)}
                className={INPUT_CLASS}
                required
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Verified By</label>
              <input
                type="text"
                value={verifiedBy}
                onChange={(e) => setVerifiedBy(e.target.value)}
                placeholder="Staff name"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : 'Confirm Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LostFoundPage() {
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [claimTarget, setClaimTarget] = useState<LostFoundItem | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Add form state
  const [itemType, setItemType] = useState('water_bottle');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [locationFound, setLocationFound] = useState('playground');
  const [foundDate, setFoundDate] = useState(todayStr());
  const [reportedBy, setReportedBy] = useState('');
  const [addStatus, setAddStatus] = useState('found_unclaimed');

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getLostFoundItems();
      setItems(res.data ?? []);
    } catch (err) {
      reportApiError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const resetForm = () => {
    setItemType('water_bottle');
    setDescription('');
    setColor('');
    setLocationFound('playground');
    setFoundDate(todayStr());
    setReportedBy('');
    setAddStatus('found_unclaimed');
  };

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!description.trim() || !locationFound || !foundDate) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await api.createLostFoundItem({
        item_type: itemType,
        description: description.trim(),
        color: color.trim() || undefined,
        location_found: locationFound,
        found_date: foundDate,
        reported_by: reportedBy.trim() || undefined,
        status: addStatus as LostFoundItem['status'],
      });
      toast.success('Item reported');
      resetForm();
      await loadItems();
    } catch (err) {
      reportApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Stale unclaimed items
  const staleCount = items.filter(
    (i) => i.status === 'found_unclaimed' && daysSince(i.found_date) > 30
  ).length;

  // Filtered items
  const filteredItems = items.filter((i) => {
    if (filterStatus && i.status !== filterStatus) return false;
    if (filterType && i.item_type !== filterType) return false;
    if (filterDate && i.found_date.slice(0, 10) !== filterDate) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Lost & Found</h1>
        <p className="text-sm text-slate-500 mt-1">Track lost and found items across the school</p>
      </div>

      {/* Stale alert banner */}
      {staleCount > 0 && (
        <div className="mb-5 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{staleCount} item{staleCount !== 1 ? 's' : ''}</span>{' '}
            have been unclaimed for over 30 days. Consider disposal or further action.
          </p>
        </div>
      )}

      {/* ── Add Item Form (compact horizontal) ── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#f1f0ff] flex items-center justify-center">
            <Package size={16} className="text-[#6c5ce7]" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">Report Item</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-wrap gap-3 items-end">
            {/* Item Type */}
            <div className="min-w-[140px] flex-1">
              <label className={LABEL_CLASS}>
                Item Type <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value)}
                  className={INPUT_CLASS + ' appearance-none pr-8'}
                  required
                >
                  {itemTypeOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Description */}
            <div className="min-w-[180px] flex-[2]">
              <label className={LABEL_CLASS}>
                Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description"
                className={INPUT_CLASS}
                required
              />
            </div>

            {/* Color */}
            <div className="min-w-[110px] flex-1">
              <label className={LABEL_CLASS}>Color</label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. Red"
                className={INPUT_CLASS}
              />
            </div>

            {/* Location Found */}
            <div className="min-w-[140px] flex-1">
              <label className={LABEL_CLASS}>
                Location Found <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={locationFound}
                  onChange={(e) => setLocationFound(e.target.value)}
                  className={INPUT_CLASS + ' appearance-none pr-8'}
                  required
                >
                  {locationOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Found Date */}
            <div className="min-w-[140px] flex-1">
              <label className={LABEL_CLASS}>
                Found Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={foundDate}
                onChange={(e) => setFoundDate(e.target.value)}
                className={INPUT_CLASS}
                required
              />
            </div>

            {/* Reported By */}
            <div className="min-w-[130px] flex-1">
              <label className={LABEL_CLASS}>Reported By</label>
              <input
                type="text"
                value={reportedBy}
                onChange={(e) => setReportedBy(e.target.value)}
                placeholder="Name"
                className={INPUT_CLASS}
              />
            </div>

            {/* Status */}
            <div className="min-w-[160px] flex-1">
              <label className={LABEL_CLASS}>Status</label>
              <div className="relative">
                <select
                  value={addStatus}
                  onChange={(e) => setAddStatus(e.target.value)}
                  className={INPUT_CLASS + ' appearance-none pr-8'}
                >
                  <option value="found_unclaimed">Found - Unclaimed</option>
                  <option value="lost_searching">Lost - Searching</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Submit */}
            <div className="flex-shrink-0">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-[#6c5ce7] hover:bg-[#5b4dd0] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap h-[38px]"
              >
                {submitting ? 'Saving…' : 'Report Item'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <span className="text-sm font-medium text-slate-600">Filter:</span>

        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe] transition-colors appearance-none pr-7 text-slate-600"
          >
            <option value="">All Statuses</option>
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe] transition-colors appearance-none pr-7 text-slate-600"
          >
            <option value="">All Item Types</option>
            {itemTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe] transition-colors text-slate-600"
        />

        {(filterStatus || filterType || filterDate) && (
          <button
            onClick={() => { setFilterStatus(''); setFilterType(''); setFilterDate(''); }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={13} /> Clear
          </button>
        )}

        <span className="ml-auto text-xs text-slate-400">
          {filteredItems.length} of {items.length} items
        </span>
      </div>

      {/* ── Card Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center">
          <Package size={44} className="mx-auto text-slate-200 mb-3" />
          <p className="text-sm text-slate-400 font-medium">No items reported</p>
          <p className="text-xs text-slate-300 mt-1">Use the form above to report a lost or found item</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Image placeholder */}
              <div className="h-32 bg-slate-100 flex items-center justify-center relative">
                <Package size={32} className="text-slate-300" />
                {/* Item number badge */}
                <span className="absolute top-2 right-2 font-mono text-xs text-slate-400 bg-white/80 px-1.5 py-0.5 rounded">
                  {item.item_number}
                </span>
                {/* Stale indicator */}
                {item.status === 'found_unclaimed' && daysSince(item.found_date) > 30 && (
                  <span className="absolute top-2 left-2 flex items-center gap-1 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                    <AlertTriangle size={10} /> Stale
                  </span>
                )}
              </div>

              {/* Card body */}
              <div className="p-4">
                {/* Type + status badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-[#f1f0ff] text-[#6c5ce7] text-xs font-medium rounded-full">
                    {labelForValue(itemTypeOptions, item.item_type)}
                  </span>
                  <StatusBadge status={item.status} />
                  {item.color && (
                    <span className="px-2 py-0.5 bg-slate-50 text-slate-500 text-xs rounded-full border border-slate-100">
                      {item.color}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm font-medium text-slate-800 mt-2 line-clamp-2">{item.description}</p>

                {/* Location */}
                <p className="flex items-center gap-1 text-xs text-slate-500 mt-1.5">
                  <MapPin size={12} className="text-slate-400 shrink-0" />
                  {labelForValue(locationOptions, item.location_found)}
                  {item.reported_by && (
                    <span className="ml-1 text-slate-400">· by {item.reported_by}</span>
                  )}
                </p>

                {/* Date */}
                <p className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                  <Calendar size={12} className="shrink-0" />
                  {formatDate(item.found_date)}
                  {daysSince(item.found_date) > 0 && (
                    <span className="text-slate-300">
                      · {daysSince(item.found_date)}d ago
                    </span>
                  )}
                </p>

                {/* Claimed by */}
                {item.claimed_by && (
                  <p className="text-xs text-emerald-600 mt-1.5 font-medium">
                    Claimed by {item.claimed_by}
                  </p>
                )}

                {/* Claim button */}
                {item.status === 'found_unclaimed' && (
                  <button
                    onClick={() => setClaimTarget(item)}
                    className="mt-3 w-full py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg transition-colors"
                  >
                    Mark as Claimed
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Claim Modal */}
      {claimTarget && (
        <ClaimModal
          item={claimTarget}
          onClose={() => setClaimTarget(null)}
          onClaimed={loadItems}
        />
      )}
    </div>
  );
}
