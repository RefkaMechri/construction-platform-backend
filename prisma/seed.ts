import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@test.com';
  const plainPassword = process.env.SUPER_ADMIN_PASSWORD || '123456';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log(` Super Admin already exists: ${email}`);
    return;
  }

  const superAdmin = await prisma.user.create({
    data: {
      name: 'Super Admin',
      email,
      password: hashedPassword,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      role: Role.SUPER_ADMIN,
      tenantId: null, // global platform user
    },
  });

  console.log(' Super Admin created:', {
    id: superAdmin.id,
    email: superAdmin.email,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    role: superAdmin.role,
  });
}

main()
  .catch((e) => {
    console.error(' Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
