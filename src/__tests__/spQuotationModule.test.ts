import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('SP Quotation Maker Standalone Module Tests', () => {
  const publicDir = path.resolve(__dirname, '../../public');
  const htmlFilePath = path.join(publicDir, 'sp-quotation-maker.html');
  const xlsxFilePath = path.join(publicDir, 'xlsx.full.min.js');

  it('should verify standalone HTML module file exists in public directory', () => {
    expect(fs.existsSync(htmlFilePath)).toBe(true);
    const stats = fs.statSync(htmlFilePath);
    expect(stats.size).toBeGreaterThan(100000); // Verify it contains the full module with templates & assets
  });

  it('should verify standalone xlsx.full.min.js exists in public directory for offline support', () => {
    expect(fs.existsSync(xlsxFilePath)).toBe(true);
    const stats = fs.statSync(xlsxFilePath);
    expect(stats.size).toBeGreaterThan(500000);
  });

  it('should contain the admin auth guard in sp-quotation-maker.html', () => {
    const content = fs.readFileSync(htmlFilePath, 'utf-8');
    expect(content).toContain('admin-auth-guard');
    expect(content).toContain('Admin Access Required');
    expect(content).toContain('checkAdminAccess');
    expect(content).toContain('zajco_admin_access');
  });

  it('should verify all four quotation templates are present in the standalone module', () => {
    const content = fs.readFileSync(htmlFilePath, 'utf-8');
    // Arabian Alligator
    expect(content).toContain('Arabian Alligator');
    // Qamra
    expect(content).toContain('Qamra');
    // Sundial
    expect(content).toContain('Sundial');
    // SP Payment
    expect(content).toContain('SP Payment');
  });

  it('should verify PDF and Excel export features are present in sp-quotation-maker.html', () => {
    const content = fs.readFileSync(htmlFilePath, 'utf-8');
    expect(content).toContain('html2pdf');
    expect(content).toContain('xlsx.full.min.js');
    expect(content).toContain('XLSX');
  });

  it('should verify downloadDirectPDF resets minHeight to auto to avoid extra blank page', () => {
    const content = fs.readFileSync(htmlFilePath, 'utf-8');
    expect(content).toContain("element.style.minHeight = 'auto'");
    expect(content).toContain("element.style.boxShadow = 'none'");
    expect(content).toContain('pagebreak');
  });
});
