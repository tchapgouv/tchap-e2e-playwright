import path from 'node:path';
import type {
  FullConfig,
  FullResult,
  Location,
  Reporter,
  Suite,
  TestCase,
  TestError,
  TestResult,
} from '@playwright/test/reporter';

// CI logs are public: print only test titles, statuses and failure locations, never test
// output or error messages (they can contain Authorization headers).

const OUTCOME_LABELS = {
  expected: 'passed',
  unexpected: 'failed',
  flaky: 'flaky',
  skipped: 'skipped',
};

function at(location?: Location): string {
  return location ? ` at ${path.relative(process.cwd(), location.file)}:${location.line}` : '';
}

export default class CiSafeReporter implements Reporter {
  private suite?: Suite;

  // Without a reporter printing to stdio, Playwright adds the 'dot' reporter, which prints error messages
  printsToStdio() {
    return true;
  }

  onBegin(_config: FullConfig, suite: Suite) {
    this.suite = suite;
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const retry = result.retry ? ` (retry #${result.retry})` : '';
    console.log(`${result.status}: ${test.titlePath().filter(Boolean).join(' › ')}${retry}`);
    for (const error of result.errors)
      console.log(`  failed${at(error.location ?? test.location)}`);
  }

  onError(error: TestError) {
    console.log(`error outside of any test${at(error.location)} (details hidden on CI)`);
  }

  onEnd(result: FullResult) {
    const counts = new Map<string, number>();
    for (const test of this.suite?.allTests() ?? []) {
      const label = OUTCOME_LABELS[test.outcome()];
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    const summary = [...counts].map(([label, count]) => `${count} ${label}`).join(', ');
    console.log(`\nresult: ${result.status} (${summary || 'no tests'})`);
  }
}
