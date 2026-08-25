import { db } from '../config/firebase';
import { collection, addDoc } from 'firebase/firestore';
import type { AuditLog } from '../types';

export const logAuditEvent = async (
  userId: string,
  userName: string,
  userEmail: string,
  action: string,
  details: string,
  boqId?: string,
  boqNumber?: string
): Promise<void> => {
  try {
    const logData: Omit<AuditLog, 'id'> = {
      userId,
      userName: userName || 'Unknown User',
      userEmail: userEmail || 'unknown@zajco.com',
      action,
      details,
      boqId: boqId || '',
      boqNumber: boqNumber || '',
      timestamp: new Date().toISOString()
    };
    await addDoc(collection(db, 'auditLogs'), logData);
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
};
