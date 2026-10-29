import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { and, asc, count, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { categories, households, invites, memberships, users } from '@/lib/db/schema';
import { DEFAULT_CATEGORIES, MAX_HOUSEHOLD_MEMBERS } from '@/lib/constants';
import { hashPassword, normaliseInviteCode, sha256, validateDisplayName, validatePassword, validateUsername } from '@/lib/server/credentials';

type SetupInput = {
  setupToken: string;
  username: string;
  password: string;
  displayName: string;
  householdName?: string;
};

export async function userCount(): Promise<number> {
  const rows = await db.select({ value: count() }).from(users);
  return rows[0]?.value ?? 0;
}

export async function isSetupComplete(): Promise<boolean> {
  return (await userCount()) > 0;
}

export function verifySetupToken(input: string): void {
  const expected = process.env.SETUP_TOKEN;
  if (!expected || expected.length < 12) throw new Error('服务器未配置初始化令牌');
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error('初始化令牌不正确');
}

export async function setupOwner(input: SetupInput) {
  verifySetupToken(input.setupToken);
  if (await isSetupComplete()) throw new Error('账本已经完成初始化');
  const username = validateUsername(input.username);
  const password = validatePassword(input.password);
  const displayName = validateDisplayName(input.displayName);
  const passwordHash = await hashPassword(password);
  const now = Date.now();
  const userId = randomUUID();
  const householdId = randomUUID();

  
    await db.insert(users).values({ id: userId, username, passwordHash, displayName, createdAt: now });
    await db.insert(households).values({ id: householdId, name: input.householdName?.trim() || '我们家', createdAt: now });
    await db.insert(memberships).values({ id: randomUUID(), householdId, userId, role: 'owner', joinedAt: now });
    await db.insert(categories).values(
      DEFAULT_CATEGORIES.map((category, index) => ({
        id: randomUUID(),
        householdId,
        name: category.name,
        type: category.type,
        emoji: category.emoji,
        color: category.color,
        sortOrder: index,
        isArchived: false,
        createdAt: now,
      })),
    );

  return { userId, householdId, displayName };
}

export async function getHouseholdContext(userId: string) {
  const rows = await db
    .select({
      householdId: households.id,
      householdName: households.name,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(households, eq(households.id, memberships.householdId))
    .where(eq(memberships.userId, userId))
    .limit(1);
  if (!rows[0]) throw new Error('尚未加入家庭账本');
  const memberRows = await db
    .select({ id: users.id, username: users.username, displayName: users.displayName, role: memberships.role })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.householdId, rows[0].householdId))
    .orderBy(asc(memberships.joinedAt));
  return { ...rows[0], members: memberRows };
}

export async function createInvite(householdId: string, userId: string) {
  const context = await getHouseholdContext(userId);
  if (context.householdId !== householdId || context.role !== 'owner') throw new Error('只有账本创建者可以邀请成员');
  if (context.members.length >= MAX_HOUSEHOLD_MEMBERS) throw new Error('家庭账本已经有两位成员');
  const code = randomBytes(5).toString('hex').toUpperCase().slice(0, 8);
  const now = Date.now();
  const expiresAt = now + 7 * 86400_000;
  await db.insert(invites).values({
    id: randomUUID(),
    householdId,
    createdByUserId: userId,
    codeHash: sha256(normaliseInviteCode(code)),
    expiresAt,
    usedAt: null,
    createdAt: now,
  });
  return { code, expiresAt: new Date(expiresAt) };
}

export async function inspectInvite(code: string) {
  const normalized = normaliseInviteCode(code);
  const rows = await db
    .select({
      inviteId: invites.id,
      householdId: invites.householdId,
      expiresAt: invites.expiresAt,
      usedAt: invites.usedAt,
      householdName: households.name,
    })
    .from(invites)
    .innerJoin(households, eq(households.id, invites.householdId))
    .where(and(eq(invites.codeHash, sha256(normalized)), isNull(invites.usedAt)))
    .limit(1);
  const invite = rows[0];
  if (!invite || invite.expiresAt <= Date.now()) return null;
  const memberRows = await db.select({ value: count() }).from(memberships).where(eq(memberships.householdId, invite.householdId));
  if ((memberRows[0]?.value ?? 0) >= MAX_HOUSEHOLD_MEMBERS) return null;
  return invite;
}

export async function acceptInvite(input: { code: string; username: string; password: string; displayName: string }) {
  const invite = await inspectInvite(input.code);
  if (!invite) throw new Error('邀请码无效、已使用或已过期');
  const username = validateUsername(input.username);
  const password = validatePassword(input.password);
  const displayName = validateDisplayName(input.displayName);
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  if (existing.length) throw new Error('这个用户名已经被使用');
  const passwordHash = await hashPassword(password);
  const userId = randomUUID();
  const now = Date.now();

  
    const currentMembers = await db.select({ value: count() }).from(memberships).where(eq(memberships.householdId, invite.householdId));
    if (((currentMembers[0]?.value ?? 0)) >= MAX_HOUSEHOLD_MEMBERS) throw new Error('家庭账本已经有两位成员');
    const currentInvite = (await db.select({ usedAt: invites.usedAt, expiresAt: invites.expiresAt }).from(invites).where(eq(invites.id, invite.inviteId)))[0];
    if (!currentInvite || currentInvite.usedAt || currentInvite.expiresAt <= now) throw new Error('邀请码已失效');
    await db.insert(users).values({ id: userId, username, passwordHash, displayName, createdAt: now });
    await db.insert(memberships).values({ id: randomUUID(), householdId: invite.householdId, userId, role: 'member', joinedAt: now });
    await db.update(invites).set({ usedAt: now }).where(eq(invites.id, invite.inviteId));

  return { userId, householdId: invite.householdId, displayName };
}

export async function findUserByUsername(username: string) {
  const rows = await db.select().from(users).where(eq(users.username, username.trim().toLowerCase())).limit(1);
  return rows[0] ?? null;
}

