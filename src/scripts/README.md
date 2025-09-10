# Database Management Scripts

This directory contains scripts to manage your database data.

## Available Scripts

### 1. `clear-nonadmin-data.js` - Clear Data (Keep Admins)
**Use this to clear all business data while keeping admin users.**

```bash
cd backend
node src/scripts/clear-nonadmin-data.js
```

**What it does:**
- ✅ Clears all business data (orders, products, customers, etc.)
- ✅ Keeps admin users intact
- ✅ Resets auto-increment IDs
- ✅ Safe to use in production

### 2. `clear-data-keep-users.js` - Clear Data (Keep All Users)
**Use this to clear all business data while keeping ALL user accounts.**

```bash
cd backend
node src/scripts/clear-data-keep-users.js
```

**What it does:**
- ✅ Clears all business data (orders, products, customers, etc.)
- ✅ Keeps ALL user accounts (admin, employee, etc.)
- ✅ Preserves usernames and passwords
- ✅ Resets auto-increment IDs
- ✅ Safe to use in production

### 3. `clear-all-data.js` - Clear Everything
**Use this to delete ALL data including admin users.**

```bash
cd backend
node src/scripts/clear-all-data.js
```

**What it does:**
- ⚠️ Deletes ALL data including admin users
- ⚠️ You'll need to create a new admin user
- ⚠️ Use with caution!

### 4. `reset-database.js` - Complete Reset
**Use this to reset everything and create a fresh admin user.**

```bash
cd backend
node src/scripts/reset-database.js
```

**What it does:**
- 🔄 Deletes ALL data
- 👤 Creates a fresh admin user
- 🔑 Admin credentials: admin@pos.com / admin123

### 5. `create-admin.js` - Create Admin Only
**Use this to create an admin user without clearing data.**

```bash
cd backend
node src/scripts/create-admin.js
```

**What it does:**
- 👤 Creates admin user if none exists
- 🔑 Admin credentials: admin@pos.com / admin123

## Quick Commands

```bash
# Clear business data (keep admins)
npm run clear-data

# Clear business data (keep all users)
npm run clear-data-keep-users

# Reset everything (delete all + create admin)
npm run reset-db

# Create admin user only
npm run create-admin
```

## Safety Notes

- ⚠️ Always backup your database before running these scripts
- ⚠️ `clear-all-data.js` and `reset-database.js` will delete admin users
- ✅ `clear-nonadmin-data.js` is safe for production use
- 🔒 Change the default admin password after first login

## Default Admin Credentials

- **Email:** admin@pos.com
- **Password:** admin123
- **Username:** admin
- **Role:** admin
