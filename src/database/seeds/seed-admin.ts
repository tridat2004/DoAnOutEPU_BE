import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import dataSource from '../datasource';
import { User } from '../../modules/users/entities/user.entity';
import { SystemRole } from '../../modules/auth/constants/system-role.constant';

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function seedAdmin() {
  const email = requiredEnv('ADMIN_EMAIL').toLowerCase();
  const username = requiredEnv('ADMIN_USERNAME');
  const fullName = requiredEnv('ADMIN_FULL_NAME');
  const password = requiredEnv('ADMIN_PASSWORD');

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must contain at least 8 characters');
  }

  await dataSource.initialize();
  const users = dataSource.getRepository(User);
  const existing = await users.findOne({ where: [{ email }, { username }] });

  if (existing) {
    if (existing.email !== email || existing.username !== username) {
      throw new Error('ADMIN_EMAIL or ADMIN_USERNAME is already used by another account');
    }

    existing.fullName = fullName;
    existing.isActive = true;
    existing.systemRole = SystemRole.ADMIN;
    existing.passwordHash = await bcrypt.hash(password, 10);
    await users.save(existing);
    process.stdout.write(`Updated admin account ${email}\n`);
    return;
  }

  const admin = users.create({
    email,
    username,
    fullName,
    passwordHash: await bcrypt.hash(password, 10),
    isActive: true,
    systemRole: SystemRole.ADMIN,
  });
  await users.save(admin);
  process.stdout.write(`Created admin account ${email}\n`);
}

seedAdmin()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Admin seed failed: ${message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });
