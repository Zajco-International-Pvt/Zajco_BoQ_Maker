import { describe, it, expect, vi } from 'vitest';
import { updateBOQ, createBOQ } from '../services/boqService';
import type { BOQ } from '../types';

// Hoisted mock variables
const { mockUpdateDoc, mockSetDoc, mockDoc, mockCollection } = vi.hoisted(() => ({
  mockUpdateDoc: vi.fn(),
  mockSetDoc: vi.fn(),
  mockDoc: vi.fn((...args: unknown[]) => ({ args, id: (args[2] as string) || 'mock_doc_id' })),
  mockCollection: vi.fn((...args: unknown[]) => ({ args }))
}));

vi.mock('../config/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'admin_123', email: 'admin@zajco.com' } }
}));

vi.mock('firebase/firestore', () => ({
  collection: mockCollection,
  doc: mockDoc,
  setDoc: mockSetDoc,
  updateDoc: mockUpdateDoc,
  deleteDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn()
}));

vi.mock('../services/auditService', () => ({
  logAuditEvent: vi.fn()
}));

describe('BOQ Creator Ownership Preservation Tests', () => {

  it('updateBOQ must never overwrite original createdBy, createdByName, createdByEmail, or createdAt even if passed in updates payload', async () => {
    mockUpdateDoc.mockClear();

    const updatesAttemptedByAdmin: Partial<BOQ> = {
      status: 'DRAFT',
      projectName: 'Updated Project by Admin',
      // Simulating when an admin saves draft and inadvertently passes their own credentials
      createdBy: 'admin_123',
      createdByName: 'System Admin',
      createdByEmail: 'admin@zajco.com',
      createdAt: '2026-08-26T12:00:00.000Z'
    };

    await updateBOQ('boq_test_1', updatesAttemptedByAdmin, 'admin_123', 'System Admin', 'admin@zajco.com');

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const passedPayload = mockUpdateDoc.mock.calls[0][1];

    // Verify that createdBy, createdByName, createdByEmail, createdAt are omitted from update payload
    expect(passedPayload).not.toHaveProperty('createdBy');
    expect(passedPayload).not.toHaveProperty('createdByName');
    expect(passedPayload).not.toHaveProperty('createdByEmail');
    expect(passedPayload).not.toHaveProperty('createdAt');

    // Verify other updates are properly retained
    expect(passedPayload.status).toBe('DRAFT');
    expect(passedPayload.projectName).toBe('Updated Project by Admin');
    expect(passedPayload).toHaveProperty('updatedAt');
  });

  it('createBOQ should preserve creator fields when passed or use provided userId', async () => {
    mockSetDoc.mockClear();

    const newBOQData: Omit<BOQ, 'id'> = {
      boqNumber: 'BOQ-ZJO-26-08-26-001',
      projectName: 'Test Project',
      client: 'Client A',
      contractor: 'Contractor A',
      consultant: 'Consultant A',
      location: 'Riyadh',
      system: 'Nurse Call',
      brand: 'Tunstall',
      preparedBy: 'Eng. User',
      checkedBy: 'Director',
      date: '2026-08-26',
      revision: 0,
      status: 'DRAFT',
      currency: 'SAR',
      conversionRate: 5,
      totalEUR: 0,
      totalSAR: 0,
      totalProfit: 0,
      totalFinalValue: 0,
      items: [],
      createdBy: 'user_orig_789',
      createdByName: 'Original User',
      createdByEmail: 'user@zajco.com',
      createdAt: '2026-08-20T08:00:00.000Z',
      updatedAt: '2026-08-26T12:00:00.000Z'
    };

    await createBOQ(newBOQData, 'admin_123', 'System Admin', 'admin@zajco.com');

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const createdDoc = mockSetDoc.mock.calls[0][1];

    expect(createdDoc.createdBy).toBe('user_orig_789');
    expect(createdDoc.createdByName).toBe('Original User');
    expect(createdDoc.createdByEmail).toBe('user@zajco.com');
    expect(createdDoc.createdAt).toBe('2026-08-20T08:00:00.000Z');
  });

});
