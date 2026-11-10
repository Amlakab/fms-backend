import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Menu from '../models/Menu';
import User from '../models/User';

dotenv.config();

const INITIAL_WEB_MENUS = [
  { name: 'Home',                 href: '/admin/dashboard',              icon: 'Home',          type: 'web', allowedRoles: ['admin','owner','agent','customer','user','manager','accountant'], order: 1 },
  { name: 'Settings',             href: '/admin/settings',               icon: 'Settings',      type: 'web', allowedRoles: ['admin','owner','agent','customer','user','manager','accountant'], order: 2 },
  { name: 'Users',                href: '/admin/users',                  icon: 'Users',         type: 'web', allowedRoles: ['admin'],                order: 3 },
  { name: 'Sales Staff',          href: '/admin/agents',                 icon: 'Users',         type: 'web', allowedRoles: ['admin','owner'],        order: 4 },
  { name: 'Products',             href: '/public/houses',                icon: 'Home',          type: 'web', allowedRoles: ['customer','user'],      order: 5 },
  { name: 'Manage Products',      href: '/admin/houses',                 icon: 'FileText',      type: 'web', allowedRoles: ['admin','owner','agent'], order: 6 },
  { name: 'Approve Products',     href: '/admin/manager/houses',         icon: 'FileText',      type: 'web', allowedRoles: ['admin','manager'],      order: 7 },
  { name: 'Workflows & Requests', href: '/admin/workflows',              icon: 'Calendar',      type: 'web', allowedRoles: ['admin','owner','manager','agent'], order: 7.5 },
  { name: 'Orders',               href: '/admin/manager/orders',         icon: 'FileText',      type: 'web', allowedRoles: ['admin','owner','agent'], order: 8 },
  { name: 'Customer Portal',      href: '/admin/customer',               icon: 'User',          type: 'web', allowedRoles: ['admin','customer','user'], order: 8.5 },
  { name: 'My Orders',            href: '/admin/customer/orders',        icon: 'FileText',      type: 'web', allowedRoles: ['admin','customer','user'], order: 9 },
  { name: 'My Payments',          href: '/admin/customer/payments',      icon: 'FileText',      type: 'web', allowedRoles: ['admin','customer','user'], order: 10 },
  { name: 'Accounts',             href: '/admin/payments',               icon: 'Wallet',        type: 'web', allowedRoles: ['admin','accountant'],   order: 11 },
  { name: 'Transactions',         href: '/admin/transactions/complete',  icon: 'FileText',      type: 'web', allowedRoles: ['admin','owner','agent'], order: 12 },
  { name: 'Approve Transactions', href: '/admin/transactions/approve',   icon: 'FileText',      type: 'web', allowedRoles: ['admin','owner'],        order: 13 },
  { name: 'Calculator',           href: '/admin/calculator',             icon: 'FileText',      type: 'web', allowedRoles: ['admin','accountant'],   order: 14 },
  { name: 'Messages',             href: '/admin/manager/messages',       icon: 'MessageSquare', type: 'web', allowedRoles: ['admin','owner','manager','agent'], order: 15 },
  { name: 'Reports',              href: '/admin/reports/transactions',   icon: 'TrendingUp',    type: 'web', allowedRoles: ['admin','owner','manager','agent'], order: 16 },
  { name: 'Security',             href: '/admin/security',               icon: 'Shield',        type: 'web', allowedRoles: ['admin'],                order: 17 },
  { name: 'Manage Menus',         href: '/admin/menus',                  icon: 'Layers',        type: 'web', allowedRoles: ['admin'],                order: 18 },
];

const INITIAL_MOBILE_MENUS = [
  { name: 'Home',                 href: 'AdminDashboard',    icon: 'Home',          type: 'mobile', allowedRoles: ['admin','owner','agent','customer','user','manager','accountant'], order: 1 },
  { name: 'Settings',             href: 'Settings',          icon: 'Settings',      type: 'mobile', allowedRoles: ['admin','owner','agent','customer','user','manager','accountant'], order: 2 },
  { name: 'Users',                href: 'AdminUsers',        icon: 'Users',         type: 'mobile', allowedRoles: ['admin'],                order: 3 },
  { name: 'Sales Staff',          href: 'AdminAgents',       icon: 'Agents',        type: 'mobile', allowedRoles: ['admin','owner'],        order: 4 },
  { name: 'Products',             href: 'Explore',           icon: 'Home',          type: 'mobile', allowedRoles: ['customer','user'],      order: 5 },
  { name: 'Manage Products',      href: 'AdminHouses',       icon: 'House',         type: 'mobile', allowedRoles: ['admin','owner','agent'], order: 6 },
  { name: 'Approve Products',     href: 'ApproveHouses',     icon: 'Approve',       type: 'mobile', allowedRoles: ['admin','manager'],      order: 7 },
  { name: 'Workflows & Requests', href: 'AdminWorkflows',    icon: 'Workflows',     type: 'mobile', allowedRoles: ['admin','owner','manager','agent'], order: 7.5 },
  { name: 'Orders',               href: 'Orders',            icon: 'Orders',        type: 'mobile', allowedRoles: ['admin','owner','agent'], order: 8 },
  { name: 'Customer Portal',      href: 'CustomerPortal',    icon: 'Users',         type: 'mobile', allowedRoles: ['admin','customer','user'], order: 8.5 },
  { name: 'My Orders',            href: 'Orders',            icon: 'Orders',        type: 'mobile', allowedRoles: ['admin','customer','user'], order: 9 },
  { name: 'My Payments',          href: 'CustomerPayments',  icon: 'Transactions',  type: 'mobile', allowedRoles: ['admin','customer','user'], order: 10 },
  { name: 'Accounts',             href: 'Accountants',       icon: 'Accountants',   type: 'mobile', allowedRoles: ['admin','accountant'],   order: 11 },
  { name: 'Transactions',         href: 'AdminTransactions', icon: 'Transactions',  type: 'mobile', allowedRoles: ['admin','owner','agent'], order: 12 },
  { name: 'Approve Transactions', href: 'ApproveTransactions',icon: 'Approve',     type: 'mobile', allowedRoles: ['admin','owner'],        order: 13 },
  { name: 'Calculator',           href: 'Calculator',        icon: 'Calculator',    type: 'mobile', allowedRoles: ['admin','accountant'],   order: 14 },
  { name: 'Messages',             href: 'ChatList',          icon: 'Messages',      type: 'mobile', allowedRoles: ['admin','owner','manager','agent'], order: 15 },
  { name: 'Reports',              href: 'TransactionReports',icon: 'Reports',       type: 'mobile', allowedRoles: ['admin','owner','manager','agent'], order: 16 },
  { name: 'Security',             href: 'Security',          icon: 'Security',      type: 'mobile', allowedRoles: ['admin'],                order: 17 },
  { name: 'Manage Menus',         href: 'AdminMenus',        icon: 'Layers',        type: 'mobile', allowedRoles: ['admin'],                order: 18 },
  { name: 'Escrow Wallet',        href: 'Wallet',            icon: 'Wallet',        type: 'mobile', allowedRoles: ['admin','owner','agent','customer','user'], order: 19 },
  { name: 'My Listings',          href: 'MyListings',        icon: 'House',         type: 'mobile', allowedRoles: ['admin','owner','agent'], order: 20 },
  { name: 'Add Product',          href: 'CreateHouse',       icon: 'House',         type: 'mobile', allowedRoles: ['admin','owner','agent'], order: 21 },
  { name: 'Saved Favorites',      href: 'Favorites',         icon: 'House',         type: 'mobile', allowedRoles: ['admin','customer','user'], order: 22 },
];

const DEFAULT_PERMISSIONS_BY_ROLE: Record<string, string[]> = {
  owner: ['Home','Sales Staff','Agents','Manage Products','House','Workflows & Requests','Orders','Approve Transactions','Messages','Reports','Settings','Escrow Wallet','My Listings','Add Product','Add Property'],
  manager: ['Home','Approve Products','Approve House','Workflows & Requests','Messages','Reports','Settings'],
  accountant: ['Home','Accounts','Calculator','Reports','Settings'],
  agent: ['Home','Manage Products','House','Workflows & Requests','Orders','Transactions','Messages','Reports','Settings','Escrow Wallet','My Listings','Add Product','Add Property'],
  customer: ['Home','Products','Houses','Customer Portal','My Orders','My Payments','Settings','Messages','Escrow Wallet','Saved Favorites'],
  user: ['Home','Products','Houses','Customer Portal','My Orders','My Payments','Settings','Messages','Escrow Wallet','Saved Favorites'],
};

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected');

  // Ensure all existing untyped menus in DB are updated to type: 'web'
  await Menu.updateMany({ $or: [{ type: { $exists: false } }, { type: null }] }, { $set: { type: 'web' } });

  // Drop obsolete single-field unique index on name if it exists, and sync indexes
  try {
    await Menu.collection.dropIndex('name_1');
    console.log('Successfully dropped obsolete name_1 index');
  } catch (err: any) {
    // Index doesn't exist or already dropped
  }
  await Menu.syncIndexes();
  console.log('Indexes synchronized');

  // Remove previous mobile menus that had old names
  const oldMobileNames = [
    'Dashboard', 'Users & Permissions', 'All Properties', 'Approve Houses',
    'Workflows & Leases', 'Financial Reports', 'Customer Orders', 'Customer Payments',
    'Accounts & Payouts', 'Mortgage & Loan', 'Direct Messages', 'Settings & Security'
  ];
  await Menu.deleteMany({ name: { $in: oldMobileNames }, type: 'mobile' });

  const ALL_SEED_MENUS = [...INITIAL_WEB_MENUS, ...INITIAL_MOBILE_MENUS];

  for (const m of ALL_SEED_MENUS) {
    const existing = await Menu.findOne({ name: m.name, type: m.type });
    if (!existing) {
      const created = await Menu.create(m);
      console.log(`Created ${m.type} menu:`, created.name, `(${created.href})`);
    } else {
      existing.href = m.href;
      existing.icon = m.icon;
      existing.allowedRoles = m.allowedRoles;
      existing.order = m.order;
      existing.type = m.type as any;
      await existing.save();
      console.log(`Updated existing ${m.type} menu:`, existing.name, `(${existing.href})`);
    }
  }

  // Update permissions for existing non-admin users
  const users = await User.find({ role: { $ne: 'admin' } });
  for (const u of users) {
    const names = DEFAULT_PERMISSIONS_BY_ROLE[u.role] ?? [];
    if (names.length === 0) continue;
    const menus = await Menu.find({ name: { $in: names }, isActive: true });
    const allowedIds = menus
      .filter(m => m.allowedRoles.includes(u.role))
      .map(m => m._id.toString());

    const currentIds = (u.permissions || []).map((id: any) => id.toString());
    const combinedIds = Array.from(new Set([...currentIds, ...allowedIds]));

    if (combinedIds.length !== currentIds.length || !u.permissions || u.permissions.length === 0) {
      u.permissions = combinedIds as any;
      await u.save();
      console.log(`Synced permissions for ${u.email} (${u.role}): now has ${combinedIds.length} menus`);
    } else {
      console.log(`Permissions up to date for ${u.email} (${u.role}): ${currentIds.length} menus`);
    }
  }

  console.log('Done');
  await mongoose.disconnect();
}

seed().catch(err => { console.error('Seeding error:', err); process.exit(1); });