import { db, auth } from '../config/firebase';
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
    const currentUid = userId || auth.currentUser?.uid || '';
    const currentEmail = userEmail || auth.currentUser?.email || 'user@zajco.com';
    const currentName = userName || auth.currentUser?.displayName || 'User';

    const logData: Omit<AuditLog, 'id'> = {
      userId: currentUid,
      userName: currentName,
      userEmail: currentEmail,
      action,
      details,
      boqId: boqId || '',
      boqNumber: boqNumber || '',
      timestamp: new Date().toISOString()
    };
    await addDoc(collection(db, 'auditLogs'), logData);
  } catch (error) {
    console.warn('Audit log write warning:', error);
  }
};
