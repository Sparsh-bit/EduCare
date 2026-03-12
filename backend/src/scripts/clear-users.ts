/**
 * One-time script: clears all users, staff, and audit_logs from the database.
 * Run with: npx ts-node -r tsconfig-paths/register src/scripts/clear-users.ts
 */
import db from '../config/database';

async function clearUsers() {
    try {
        const al = await db('audit_logs').delete();
        console.log(`Deleted ${al} audit_log rows`);
        const st = await db('staff').delete();
        console.log(`Deleted ${st} staff rows`);
        const us = await db('users').delete();
        console.log(`Deleted ${us} user rows`);
        console.log('Done. Run the /api/auth/setup endpoint to create the new admin.');
    } catch (err: any) {
        console.error('Error:', err.message);
    } finally {
        await db.destroy();
    }
}

clearUsers();
