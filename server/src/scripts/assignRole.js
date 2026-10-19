require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');
const AuditLog = require('../models/auditLog');

/**
 * Safe administrative script to assign a role ('user', 'moderator', 'admin') to an existing account.
 * Usage:
 *   node server/src/scripts/assignRole.js <email_or_username> <role> [reason]
 */
async function assignRole() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node server/src/scripts/assignRole.js <email_or_username> <user|moderator|admin> [reason]');
    process.exit(1);
  }

  const [identifier, role, ...reasonParts] = args;
  const reason = reasonParts.join(' ') || 'Assigned via CLI administrator tool';

  if (!['user', 'moderator', 'admin'].includes(role)) {
    console.error(`Invalid role: "${role}". Must be one of: user, moderator, admin.`);
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/miniproject';
  await mongoose.connect(mongoUri);

  try {
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase().trim() },
        { username: identifier.toLowerCase().trim() }
      ]
    });

    if (!user) {
      console.error(`User "${identifier}" not found.`);
      process.exit(1);
    }

    const previousRole = user.role || 'user';
    user.role = role;
    await user.save();

    await AuditLog.create({
      actor: user._id, // CLI-level bootstrap
      action: 'assign_role',
      targetType: 'user',
      targetId: user._id,
      reason,
      details: { previousRole, newRole: role }
    });

    console.log(`[SUCCESS]: User ${user.username} (${user.email}) updated from role "${previousRole}" to "${role}".`);
  } catch (err) {
    console.error('[ERROR]: Failed to assign role:', err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

if (require.main === module) {
  assignRole();
}

module.exports = assignRole;
