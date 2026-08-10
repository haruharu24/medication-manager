// Middleware gating the paid family-sharing feature. Mirrors auth.js's
// requireAuth pattern: nothing is cached in the JWT, every check re-reads
// fresh state from accountStore on each request, so a status change from a
// RevenueCat webhook takes effect on the very next call.
import { findUserById, getHouseholdById } from './accountStore.js';

// grace_period counts as entitled: Apple is still retrying the charge, and
// locking a family out mid-retry would be a needlessly harsh failure mode.
const ACTIVE_STATUSES = new Set(['active', 'grace_period']);

const isEntitled = (userId) => {
  const user = findUserById(userId);
  return !!user && ACTIVE_STATUSES.has(user.subscriptionStatus);
};

const subscriptionRequiredResponse = (res) =>
  res.status(402).json({ error: '家族共有には月額サブスクリプションが必要です', code: 'SUBSCRIPTION_REQUIRED' });

// For the two entry points into the feature (create/join a household) — the
// acting user themselves must be subscribed.
export const requireActiveSubscription = (req, res, next) => {
  if (!isEntitled(req.user.id)) return subscriptionRequiredResponse(res);
  next();
};

// For writes to an existing household's shared data — gates on the
// household OWNER's subscription, not the caller's, so editor/viewer members
// ride on the owner's plan (matches the "one person in the family pays"
// mental model). Assumes requireMembership already ran (so a non-member gets
// 403 from that, not a subscription-status information leak from this).
export const requireHouseholdOwnerActiveSubscription = (req, res, next) => {
  const household = getHouseholdById(req.params.id);
  if (!household) return res.status(404).json({ error: '世帯が見つかりません' });
  if (!isEntitled(household.ownerId)) return subscriptionRequiredResponse(res);
  next();
};
