import AxeBuilder from '@axe-core/playwright';
import { Page } from '@playwright/test';
import { AxeResults } from 'axe-core';

/**
 * Check accessibility on a page using Axe
 * @param page - The Playwright page to check
 * @param options - Optional configuration
 * @param options.logViolations - Whether to log the number of violations (default: true)
 * @returns The Axe accessibility scan results
 */
export async function checkAccessibility(
  page: Page,
  options?: { logViolations?: boolean }
): Promise<AxeResults> {
  const { logViolations = true } = options || {};

  const accessibilityScanResults = await new AxeBuilder({ page })
    //.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  if (logViolations) {
    console.log(`\n======================================`);
    console.log(`Accessibility violations: ${accessibilityScanResults.violations.length} - ${page.url()}`);
    
    if (accessibilityScanResults.violations.length > 0) {
      accessibilityScanResults.violations.forEach((violation, index) => {
        console.log(`\n[${index + 1}] ${violation.impact?.toUpperCase()} - ${violation.id}`);
        console.log(`    Description: ${violation.description}`);
        console.log(`    Help: ${violation.help}`);
        console.log(`    More info: ${violation.helpUrl}`);
        console.log(`    Affected elements: ${violation.nodes.length}`);
      });
    }
    console.log(`======================================\n`);
  }

  return accessibilityScanResults;
}
