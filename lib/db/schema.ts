import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [uniqueIndex('users_username_unique').on(table.username)]);

export const households = sqliteTable('households', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const memberships = sqliteTable('memberships', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['owner', 'member'] }).notNull().default('member'),
  joinedAt: integer('joined_at').notNull(),
}, (table) => [
  uniqueIndex('memberships_household_user_unique').on(table.householdId, table.userId),
  index('memberships_user_idx').on(table.userId),
]);

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [uniqueIndex('sessions_token_hash_unique').on(table.tokenHash), index('sessions_user_idx').on(table.userId)]);

export const invites = sqliteTable('invites', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  createdByUserId: text('created_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  codeHash: text('code_hash').notNull(),
  expiresAt: integer('expires_at').notNull(),
  usedAt: integer('used_at'),
  createdAt: integer('created_at').notNull(),
}, (table) => [uniqueIndex('invites_code_hash_unique').on(table.codeHash)]);

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type', { enum: ['expense', 'income'] }).notNull(),
  emoji: text('emoji').notNull().default('✨'),
  color: text('color').notNull().default('#a5a39e'),
  sortOrder: integer('sort_order').notNull().default(0),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
}, (table) => [uniqueIndex('categories_household_type_name_unique').on(table.householdId, table.type, table.name)]);

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  createdByUserId: text('created_by_user_id').notNull().references(() => users.id),
  memberUserId: text('member_user_id').notNull().references(() => users.id),
  categoryId: text('category_id').notNull().references(() => categories.id),
  type: text('type', { enum: ['expense', 'income'] }).notNull(),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull().default('CNY'),
  originalAmount: real('original_amount').notNull(),
  exchangeRate: real('exchange_rate').notNull().default(1),
  rateDate: text('rate_date').notNull(),
  occurredOn: text('occurred_on').notNull(),
  note: text('note').notNull().default(''),
  paymentMethod: text('payment_method', { enum: ['wechat', 'alipay', 'bank', 'cash', 'other'] }).notNull().default('other'),
  scope: text('scope', { enum: ['joint', 'personal'] }).notNull().default('joint'),
  visibility: text('visibility', { enum: ['shared', 'private'] }).notNull().default('shared'),
  source: text('source', { enum: ['manual', 'text', 'voice'] }).notNull().default('manual'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
}, (table) => [
  index('transactions_household_date_idx').on(table.householdId, table.occurredOn),
  index('transactions_household_visibility_idx').on(table.householdId, table.visibility),
  index('transactions_category_idx').on(table.categoryId),
]);

export const budgets = sqliteTable('budgets', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  scope: text('scope', { enum: ['total', 'category'] }).notNull(),
  categoryId: text('category_id').references(() => categories.id),
  amountCents: integer('amount_cents').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [index('budgets_household_idx').on(table.householdId)]);

export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  month: text('month').notNull(),
  content: text('content').notNull(),
  dataHash: text('data_hash').notNull(),
  generatedAt: integer('generated_at').notNull(),
}, (table) => [uniqueIndex('reports_household_month_unique').on(table.householdId, table.month)]);

export const fxRates = sqliteTable('fx_rates', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull(),
  rateDate: text('rate_date').notNull(),
  cnyPerUnit: real('cny_per_unit').notNull(),
  fetchedAt: integer('fetched_at').notNull(),
}, (table) => [uniqueIndex('fx_rates_currency_date_unique').on(table.currency, table.rateDate)]);

export type User = typeof users.$inferSelect;
export type Household = typeof households.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
