"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSION_DEFAULTS_BY_ROLE = void 0;
// backend/config/permissionDefaults.ts
// Default menu NAMES per role. At user-creation time we look up the
// corresponding Menu._id by name. Unknown names are silently skipped,
// so this is safe even if the admin hasn't created that menu yet.
exports.PERMISSION_DEFAULTS_BY_ROLE = {
    admin: [
    // admin bypasses permissions anyway — left empty on purpose
    ],
    owner: ['Home', 'Agents', 'House', 'Orders', 'Approve Transactions', 'Messages', 'Reports', 'Settings'],
    manager: ['Home', 'Approve House', 'Messages', 'Reports', 'Settings'],
    accountant: ['Home', 'Accounts', 'Calculator', 'Reports', 'Settings'],
    agent: ['Home', 'House', 'Orders', 'Transactions', 'Messages', 'Reports', 'Settings'],
    customer: ['Home', 'Houses', 'My Orders', 'My Payments', 'Settings'],
    user: ['Home', 'Houses', 'My Orders', 'My Payments', 'Settings'],
};
