import { useState, useEffect } from 'react';
import { Users as UsersIcon, UserPlus, Search, MoreVertical, Edit, Trash2, Shield, Mail, Phone, Calendar, Building2 } from 'lucide-react';
import client from '../api/client';

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Form state for add user
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'customer',
    password: '',
    phone_number: ''
  });
  
  // Form state for edit user
  const [editUser, setEditUser] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'customer',
    is_active: true
  });
  
  // Loading states
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const response = await client.get('/auth/users/').catch(() => ({ data: [] }));
      const usersData = response.data.results ?? response.data;
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }

  function getRoleBadge(role) {
    const roleConfig = {
      'admin': { bg: 'bg-red-100', text: 'text-red-700', label: 'Admin' },
      'dispatcher': { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Dispatcher' },
      'driver': { bg: 'bg-green-100', text: 'text-green-700', label: 'Driver' },
      'customer': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Customer' },
    };
    const config = roleConfig[role] || roleConfig['customer'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  }

  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function handleAddUser() {
    try {
      setIsAddingUser(true);
      console.log('Adding user:', newUser);
      // For admin user creation, use the users endpoint instead of register
      const userData = {
        username: newUser.username,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        role: newUser.role,
        phone_number: newUser.phone_number,
        password: newUser.password
      };
      const response = await client.post('/auth/users/', userData);
      console.log('User added successfully:', response.data);
      
      // Close modal
      setShowAddModal(false);
      
      // Reset form
      setNewUser({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        role: 'customer',
        password: '',
        phone_number: ''
      });
      
      // Refresh users list
      await loadUsers();
      
      // Show success message
      alert('User added successfully!');
    } catch (error) {
      console.error('Error adding user:', error);
      if (error.response && error.response.data) {
        console.error('Validation errors:', error.response.data);
        const errors = error.response.data;
        let errorMessage = 'Failed to add user. ';
        if (typeof errors === 'string') {
          errorMessage += errors;
        } else if (errors.password) {
          errorMessage += Array.isArray(errors.password) ? errors.password.join(' ') : errors.password;
        } else if (errors.username) {
          errorMessage += Array.isArray(errors.username) ? errors.username.join(' ') : errors.username;
        } else if (errors.email) {
          errorMessage += Array.isArray(errors.email) ? errors.email.join(' ') : errors.email;
        } else {
          errorMessage += 'Please check the form and try again.';
        }
        alert(errorMessage);
      } else {
        alert('Failed to add user. Please check the form and try again.');
      }
    } finally {
      setIsAddingUser(false);
    }
  }

  async function handleEditUser() {
    try {
      setIsUpdatingUser(true);
      console.log('Editing user:', editUser);
      const response = await client.put(`/auth/users/${selectedUser.id}/`, editUser);
      console.log('User updated successfully:', response.data);
      
      // Close modal
      setShowEditModal(false);
      setSelectedUser(null);
      
      // Refresh users list
      await loadUsers();
      
      // Show success message
      alert('User updated successfully!');
    } catch (error) {
      console.error('Error editing user:', error);
      if (error.response && error.response.data) {
        console.error('Validation errors:', error.response.data);
        const errors = error.response.data;
        let errorMessage = 'Failed to update user. ';
        if (typeof errors === 'string') {
          errorMessage += errors;
        } else if (errors.password) {
          errorMessage += Array.isArray(errors.password) ? errors.password.join(' ') : errors.password;
        } else if (errors.username) {
          errorMessage += Array.isArray(errors.username) ? errors.username.join(' ') : errors.username;
        } else if (errors.email) {
          errorMessage += Array.isArray(errors.email) ? errors.email.join(' ') : errors.email;
        } else {
          errorMessage += 'Please check the form and try again.';
        }
        alert(errorMessage);
      } else {
        alert('Failed to update user. Please try again.');
      }
    } finally {
      setIsUpdatingUser(false);
    }
  }

  async function handleDeleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await client.delete(`/auth/users/${userId}/`);
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    }
  }

  function handleAddModalOpen() {
    setNewUser({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      role: 'customer',
      password: '',
      phone_number: ''
    });
    setShowAddModal(true);
  }

  function handleEditModalOpen(user) {
    setSelectedUser(user);
    setEditUser({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      is_active: user.is_active
    });
    setShowEditModal(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">User Management</h1>
          <p className="text-sm text-gray-500">Manage system users and permissions</p>
        </div>
        <button
          onClick={handleAddModalOpen}
          className="flex items-center gap-2 bg-[#1e3a8a] text-white px-4 py-2 rounded-lg hover:bg-[#1e40af] transition-colors"
        >
          <UserPlus size={16} /> Add User
        </button>
      </div>

      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a]"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-500">
            <UsersIcon size={32} className="mx-auto mb-2 text-gray-300" />
            No users found
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Organization</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Last Active</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center text-sm font-medium">
                        {user.first_name?.[0] || user.username?.[0] || 'U'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-xs text-gray-500">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    <div className="flex items-center gap-1">
                      <Mail size={14} className="text-gray-400" />
                      {user.email}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    <div className="flex items-center gap-1">
                      <Building2 size={14} className="text-gray-400" />
                      <span className="text-xs">{user.current_organization?.name || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.is_active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditModalOpen(user)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Add New User</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input 
                  type="text" 
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input 
                    type="text" 
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({...newUser, first_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input 
                    type="text" 
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({...newUser, last_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select 
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="customer">Customer</option>
                  <option value="driver">Driver</option>
                  <option value="dispatcher">Dispatcher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input 
                  type="text" 
                  value={newUser.phone_number}
                  onChange={(e) => setNewUser({...newUser, phone_number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input 
                  type="password" 
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                disabled={isAddingUser}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={isAddingUser}
                className="px-4 py-2 bg-[#1e3a8a] text-white rounded-lg text-sm hover:bg-[#1e40af] disabled:opacity-50"
              >
                {isAddingUser ? 'Adding...' : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Edit User</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input 
                  type="text" 
                  value={editUser.username}
                  onChange={(e) => setEditUser({...editUser, username: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  value={editUser.email}
                  onChange={(e) => setEditUser({...editUser, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input 
                    type="text" 
                    value={editUser.first_name}
                    onChange={(e) => setEditUser({...editUser, first_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input 
                    type="text" 
                    value={editUser.last_name}
                    onChange={(e) => setEditUser({...editUser, last_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select 
                  value={editUser.role}
                  onChange={(e) => setEditUser({...editUser, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="customer">Customer</option>
                  <option value="driver">Driver</option>
                  <option value="dispatcher">Dispatcher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={editUser.is_active}
                  onChange={(e) => setEditUser({...editUser, is_active: e.target.checked})}
                  className="rounded" 
                />
                <label className="text-sm text-gray-700">Active</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                disabled={isUpdatingUser}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditUser}
                disabled={isUpdatingUser}
                className="px-4 py-2 bg-[#1e3a8a] text-white rounded-lg text-sm hover:bg-[#1e40af] disabled:opacity-50"
              >
                {isUpdatingUser ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;