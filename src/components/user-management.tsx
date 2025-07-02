import { useState } from 'react';
import { useLiveQuery, usePGlite } from '../db/context';

interface UserWithProfile {
  id: number;
  email: string;
  username: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  profile_id?: number;
}

export function UserManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithProfile | null>(null);
  const [newUser, setNewUser] = useState({
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    bio: ''
  });
  const db = usePGlite();

  const usersQuery = `
    SELECT 
      u.id,
      u.email,
      u.username,
      u.created_at,
      up.id as profile_id,
      up.first_name,
      up.last_name,
      up.bio
    FROM users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE 1=1
    ${searchTerm ? "AND (u.email ILIKE $1 OR u.username ILIKE $1 OR up.first_name ILIKE $1 OR up.last_name ILIKE $1)" : ""}
    ORDER BY u.created_at DESC
    LIMIT 50
  `;

  const users = useLiveQuery<UserWithProfile>(
    usersQuery,
    searchTerm ? [`%${searchTerm}%`] : []
  );

  const userCount = useLiveQuery<{ count: number }>(`
    SELECT COUNT(*) as count FROM users
  `);

  const addUser = async () => {
    if (!newUser.email || !newUser.username) return;

    try {
      await db.transaction(async (tx) => {
        const userResult = await tx.query(
          'INSERT INTO users (email, username) VALUES ($1, $2) RETURNING id',
          [newUser.email, newUser.username]
        );
        
        const userId = (userResult.rows[0] as any).id;
        
        await tx.query(
          'INSERT INTO user_profiles (user_id, first_name, last_name, bio) VALUES ($1, $2, $3, $4)',
          [userId, newUser.firstName || '', newUser.lastName || '', newUser.bio || null]
        );
      });

      setNewUser({ email: '', username: '', firstName: '', lastName: '', bio: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Error adding user. Please check if email/username already exists.');
    }
  };

  const updateUser = async (user: UserWithProfile) => {
    if (!user.email || !user.username) return;

    try {
      await db.transaction(async (tx) => {
        await tx.query(
          'UPDATE users SET email = $1, username = $2 WHERE id = $3',
          [user.email, user.username, user.id]
        );
        
        if (user.profile_id) {
          await tx.query(
            'UPDATE user_profiles SET first_name = $1, last_name = $2, bio = $3 WHERE id = $4',
            [user.first_name || '', user.last_name || '', user.bio || null, user.profile_id]
          );
        } else {
          await tx.query(
            'INSERT INTO user_profiles (user_id, first_name, last_name, bio) VALUES ($1, $2, $3, $4)',
            [user.id, user.first_name || '', user.last_name || '', user.bio || null]
          );
        }
      });

      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error updating user. Please check if email/username already exists.');
    }
  };

  const deleteUser = async (userId: number) => {
    if (confirm('Are you sure you want to delete this user? This will also delete all related data.')) {
      try {
        await db.query('DELETE FROM users WHERE id = $1', [userId]);
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {userCount[0]?.count || 0} users total
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add User
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Search Users
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by email, username, or name..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Add User Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Add New User</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username *
              </label>
              <input
                type="text"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={newUser.firstName}
                onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={newUser.lastName}
                onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bio
              </label>
              <textarea
                value={newUser.bio}
                onChange={(e) => setNewUser({ ...newUser, bio: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={addUser}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add User
            </button>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Profile
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUser?.id === user.id ? (
                      <div className="space-y-2">
                        <input
                          type="email"
                          value={editingUser.email}
                          onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <input
                          type="text"
                          value={editingUser.username}
                          onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.email}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          @{user.username}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingUser?.id === user.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingUser.first_name || ''}
                          onChange={(e) => setEditingUser({ ...editingUser, first_name: e.target.value })}
                          placeholder="First Name"
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <input
                          type="text"
                          value={editingUser.last_name || ''}
                          onChange={(e) => setEditingUser({ ...editingUser, last_name: e.target.value })}
                          placeholder="Last Name"
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <textarea
                          value={editingUser.bio || ''}
                          onChange={(e) => setEditingUser({ ...editingUser, bio: e.target.value })}
                          placeholder="Bio"
                          rows={2}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    ) : (
                      <div>
                        {user.first_name || user.last_name ? (
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.first_name} {user.last_name}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            No profile
                          </div>
                        )}
                        {user.bio && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {user.bio.length > 50 ? `${user.bio.substring(0, 50)}...` : user.bio}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingUser?.id === user.id ? (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => updateUser(editingUser)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingUser(null)}
                          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}