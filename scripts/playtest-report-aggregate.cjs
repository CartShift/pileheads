"use strict";

const assert = require("node:assert/strict");
const SCHEMA = "pileheads-voluntary-playtest-v1";
const SCOPE = "one-browser-page-opt-in-observation";
const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
const keysAre = (value, names) => isRecord(value) &&
  Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
const count = n => Number.isSafeInteger(n) && n >= 0 && n <= 100;
const rating = n => n === null || (Number.isInteger(n) && n >= 1 && n <= 5);

function validateReport(report) {
  const validRound = round => keysAre(round, ["started", "completed"]) &&
    count(round.started) && count(round.completed) && round.completed <= round.started;
  if (!keysAre(report, ["schema", "scope", "local", "online", "truncated", "feedback"]) ||
      report.schema !== SCHEMA || report.scope !== SCOPE ||
      !validRound(report.local) || !validRound(report.online) ||
      report.local.started + report.online.started > 100 ||
      typeof report.truncated !== "boolean" ||
      !keysAre(report.feedback, ["fun", "clarity", "wouldReplay"]) ||
      !rating(report.feedback.fun) || !rating(report.feedback.clarity) ||
      ![null, "yes", "no", "unsure"].includes(report.feedback.wouldReplay)) {
    throw new Error("Invalid or unsupported playtest report");
  }
  return report;
}

function aggregateReports(reports) {
  if (!Array.isArray(reports) || reports.length > 10000) throw new Error("Expected at most 10000 reports");
  const totals = { local: {started:0, completed:0}, online: {started:0, completed:0} };
  const ratingBuckets = () => ({ answered:0, sum:0, distribution:[0,0,0,0,0] });
  const fun = ratingBuckets(), clarity = ratingBuckets();
  const wouldReplay = { yes:0, no:0, unsure:0, unanswered:0 };
  let truncated = 0, included = 0;
  for (const raw of reports) {
    const report = validateReport(raw);
    // Truncated observations are reported separately, not silently included.
    if (report.truncated) { truncated++; continue; }
    included++;
    for (const mode of ["local", "online"]) {
      totals[mode].started += report[mode].started;
      totals[mode].completed += report[mode].completed;
    }
    for (const [field,bucket] of [["fun",fun],["clarity",clarity]]) {
      const n = report.feedback[field];
      if (n !== null) { bucket.answered++; bucket.sum += n; bucket.distribution[n-1]++; }
    }
    wouldReplay[report.feedback.wouldReplay ?? "unanswered"]++;
  }
  const ratio = (numerator, denominator) => denominator ? numerator / denominator : null;
  const roundStats = ({started,completed}) => ({
    started, completed, notObservedCompleted:started-completed,
    observedCompletionFraction:ratio(completed,started)
  });
  const ratingStats = ({answered,sum,distribution}) => ({
    answered, unanswered:included-answered, mean:ratio(sum,answered), distribution
  });
  const all = { started:totals.local.started+totals.online.started, completed:totals.local.completed+totals.online.completed };
  assert.equal(included+truncated,reports.length);
  return {
    schema:"pileheads-playtest-aggregate-v1",
    scope:"voluntarily-shared-browser-observations-not-unique-players",
    reports:{received:reports.length,included,excludedTruncated:truncated},
    rounds:{local:roundStats(totals.local),online:roundStats(totals.online),all:roundStats(all)},
    feedback:{fun:ratingStats(fun),clarity:ratingStats(clarity),wouldReplay:{
      ...wouldReplay, statedYesFraction:ratio(wouldReplay.yes,wouldReplay.yes+wouldReplay.no+wouldReplay.unsure)
    }},
    limitations:[
      "One reviewed export per observation; no participant identifiers or cross-file deduplication.",
      "Online rounds may be observed by several clients; counts are not distinct games or players.",
      "Missing completion may reflect interruption, closing the tab or opting out; it is not proven abandonment.",
      "Voluntary feedback is self-selected; stated replay intent is not actual replay or retention."
    ]
  };
}
module.exports = {validateReport,aggregateReports};
