"use strict";
const fs = require("node:fs");
const {aggregateReports} = require("./playtest-report-aggregate.cjs");

function main(args) {
  if (!args.length || args.length > 10000 || args.includes("--help")) {
    console.error("Usage: node scripts/aggregate-playtest-reports.cjs <report.json> [more-report.json ...]");
    console.error("Use a private local folder with one reviewed export per observation. Do not commit raw exports.");
    return args.includes("--help") ? 0 : 1;
  }
  const seen = new Set(), reports = [];
  for (let i=0;i<args.length;i++) {
    try {
      const file = fs.realpathSync(args[i]);
      if (seen.has(file)) throw new Error("Duplicate input path");
      seen.add(file);
      const stat = fs.statSync(file);
      if (!stat.isFile() || stat.size > 16384) throw new Error("Invalid report file");
      reports.push(JSON.parse(fs.readFileSync(file,"utf8")));
    } catch {
      console.error("Cannot read input report #" + (i+1) + " (invalid, duplicate or oversized input).");
      return 1;
    }
  }
  try {
    console.log(JSON.stringify(aggregateReports(reports),null,2));
    return 0;
  } catch {
    console.error("Aggregation rejected: unsupported or invalid report data. No partial results emitted.");
    return 1;
  }
}
if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = {main};
