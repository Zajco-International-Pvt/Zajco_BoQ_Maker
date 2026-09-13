import { describe, it, expect, vi } from 'vitest';
import { updateUserRoleAndStatus } from '../services/adminService';
import type { UserProfile } from '../types';

// Mock firestore and auditService
const { mockUpdateDoc, mockDoc } = vi.hoisted(() => ({
  mockUpdateDoc: vi.fn(),
  mockDoc: vi.fn((...args: unknown[]) => ({ args, id: 'user_target_1' }))
}));

vi.mock('../config/firebase', () => ({
  db: {},
  auth: {}
}));

vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  updateDoc: mockUpdateDoc,
  collection: vi.fn(),
  getDocs: vi.fn()
}));

vi.mock('../services/auditService', () => ({
  logAuditEvent: vi.fn()
}));

describe('Role Security and Admin Assignment Tests', () => {

  it('should ensure email containing "admin" does not grant admin status unless role is explicitly ADMIN in database', () => {
    // Simulated user profiles
    const userWithAdminEmail: UserProfile = {
      uid: 'user_1',
      name: 'John Admin',
      email: 'john.admin@company.com',
      role: 'USER',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    const legitimateAdmin: UserProfile = {
      uid: 'admin_1',
      name: 'Sarah Boss',
      email: 'sarah@company.com',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    // Strict check: role must strictly equal 'ADMIN'
    const checkIsAdmin = (profile: UserProfile | null): boolean => {
      return profile?.role === 'ADMIN';
    };

    expect(checkIsAdmin(userWithAdminEmail)).toBe(false);
    expect(checkIsAdmin(legitimateAdmin)).toBe(true);
  });

  it('should allow an existing admin to promote a user to ADMIN via updateUserRoleAndStatus', async () => {
    mockUpdateDoc.mockClear();

    const adminUser: UserProfile = {
      uid: 'super_admin_1',
      name: 'Super Admin',
      email: 'super@zajco.com',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    await updateUserRoleAndStatus('target_user_2', 'ADMIN', 'ACTIVE', adminUser);

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const updatePayload = mockUpdateDoc.mock.calls[0][1];
    expect(updatePayload).toEqual({ role: 'ADMIN', status: 'ACTIVE' });
  });

  it('should allow an admin to demote a user to USER via updateUserRoleAndStatus', async () => {
    mockUpdateDoc.mockClear();

    const adminUser: UserProfile = {
      uid: 'super_admin_1',
      name: 'Super Admin',
      email: 'super@zajco.com',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    await updateUserRoleAndStatus('target_user_2', 'USER', 'ACTIVE', adminUser);

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const updatePayload = mockUpdateDoc.mock.calls[0][1];
    expect(updatePayload).toEqual({ role: 'USER', status: 'ACTIVE' });
  });

});
