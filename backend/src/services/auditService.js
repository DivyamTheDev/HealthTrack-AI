import AuditLog from '../models/AuditLog.js';

export const logAction = async (user, action, details) => {
  try {
    const log = new AuditLog({
      userId: user ? user.id : null,
      username: user ? user.username : 'SYSTEM',
      role: user ? user.role : 'SYSTEM',
      action,
      details
    });
    await log.save();
    console.log(`[AUDIT LOG] ${log.username} (${log.role}): ${action} - ${details}`);
  } catch (error) {
    console.error('Failed to save audit log:', error);
  }
};
