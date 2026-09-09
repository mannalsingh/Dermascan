const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, 'users.json');

const loadUsers = () => {
  try {
    if (fs.existsSync(FILE_PATH)) {
      return JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading users.json:', e.message);
  }
  return {};
};

const saveUsers = (users) => {
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(users, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing users.json:', e.message);
  }
};

const cleanNameFromEmail = (email) => {
  if (!email) return 'User';
  const prefix = email.split('@')[0];
  const cleaned = prefix.replace(/\d+/g, '').replace(/[._-]+/g, ' ').trim();
  if (!cleaned) return 'User';
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

module.exports = {
  getUserByEmail: (email) => {
    if (!email) return null;
    const users = loadUsers();
    return users[email.toLowerCase().trim()] || null;
  },
  saveUser: (user) => {
    if (!user || !user.email) return user;
    const users = loadUsers();
    const key = user.email.toLowerCase().trim();
    users[key] = {
      ...(users[key] || {}),
      ...user,
      email: key,
      updatedAt: new Date().toISOString()
    };
    saveUsers(users);
    return users[key];
  },
  cleanNameFromEmail,
};
