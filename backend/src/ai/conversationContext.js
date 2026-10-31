import { routeIntent } from './intentRouter.js';

const FOLLOW_UP = /\byesterday\b|গতকাল|बीता कल|कल की|कल का|\bonly\b|\bjust\b|department|विभाग|বিভাগ/i;

/**
 * Attach a short follow-up to the previous user question.
 * Assistant text is ignored so a reply cannot change the next tool.
 * @param {string} message
 * @param {Array<{ role?: string, text?: string }>|undefined} history
 * @returns {string}
 */
export function expandFollowUp(message, history) {
  const current = String(message || '').trim();
  const prior = [...(history || [])].reverse().find((item) => (
    item?.role === 'user' && typeof item.text === 'string' && item.text.trim()
  ));
  if (!prior) return current;

  const direct = routeIntent(current);
  if (direct?.name || direct?.refused) return current;
  if (current.length > 160 || !FOLLOW_UP.test(current)) return current;

  return `${prior.text.trim()}. ${current}`.slice(0, 500);
}
