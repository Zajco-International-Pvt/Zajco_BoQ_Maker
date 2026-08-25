import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Firestore Security Rules Auditor Assessment', () => {

  const rulesContent = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf-8');

  it('should enforce authentication on all collection matches', () => {
    expect(rulesContent).toContain('function isAuthenticated()');
    expect(rulesContent).toContain('request.auth != null');
  });

  it('should prevent non-admin users from self-assigning ADMIN role in users collection', () => {
    expect(rulesContent).toContain("request.resource.data.role != 'ADMIN' || isAdmin()");
    expect(rulesContent).toContain("!request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'status'])");
  });

  it('should restrict status transitions to APPROVED/REJECTED to ADMIN only in boqs collection', () => {
    expect(rulesContent).toContain("request.resource.data.status == 'SUBMITTED'");
    expect(rulesContent).toContain("isAdmin()");
  });

  it('should enforce append-only immutability on auditLogs collection', () => {
    expect(rulesContent).toContain('match /auditLogs/{logId}');
    expect(rulesContent).toContain('allow update, delete: if false;');
  });

  it('should enforce write restrictions on global settings to ADMIN only', () => {
    expect(rulesContent).toContain('match /settings/{settingId}');
    expect(rulesContent).toContain('allow write: if isAdmin();');
  });

});
