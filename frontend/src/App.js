import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import './styles.css';
import { ThemeContext } from './context/ThemeContext';

const API_URL = 'http://localhost:8000';


function App() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Filtering and sorting state
  const [roleFilter, setRoleFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Memoize the fetchWelcomeMessage function with useCallback
  const fetchWelcomeMessage = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/`);
      setMessage(response.data.message);
    } catch (err) {
      console.error('Error fetching welcome message:', err);
      setError('Failed to load welcome message.');
      console.log("Attempting to fetch welcome message");
      console.log("Attempting to fetch users");

    }
  }, []);

  // Memoize the fetchUsers function with useCallback
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query parameters for pagination, filtering, and sorting
      const params = new URLSearchParams({
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      if (roleFilter) {
        params.append('role', roleFilter);
      }

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const { data } = await axios.get(`${API_URL}/users?${params.toString()}`);

      setUsers(data.items);
      setTotalPages(data.pages);
      setTotalUsers(data.total);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please check if your server is running.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, roleFilter, searchQuery, sortBy, sortOrder]);

  // Use useEffect with all dependencies included
  useEffect(() => {
    fetchWelcomeMessage();
    fetchUsers();
  }, [fetchWelcomeMessage, fetchUsers]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (selectedUser) {
        // Update existing user
        await axios.put(`${API_URL}/users/${selectedUser.id}`, formData);
      } else {
        // Create new user
        await axios.post(`${API_URL}/users`, formData);
      }

      // Refresh the users list
      fetchUsers();

      // Reset form
      resetForm();
    } catch (err) {
      console.error('Error submitting user:', err);
      setError(err.response?.data?.message || 'Failed to save user. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    setIsLoading(true);
    setError(null);

    try {
      await axios.delete(`${API_URL}/users/${userId}`);

      // If deleting the last user on the page, go to previous page
      if (users.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        fetchUsers();
      }

      if (selectedUser && selectedUser.id === userId) {
        resetForm();
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    setPage(1); // Reset to first page when searching
    fetchUsers();
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email || '',
      role: user.role
    });
  };

  const resetForm = () => {
    setSelectedUser(null);
    setFormData({
      name: '',
      email: '',
      role: 'user'
    });
  };

  const handleRoleFilterChange = (e) => {
    setRoleFilter(e.target.value);
    setPage(1); // Reset to first page when changing filter
  };

  const handleSortChange = (field) => {
    if (sortBy === field) {
      // Toggle sort order if clicking on the same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field and default to ascending order
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1); // Reset to first page when changing sort
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Debug: App is loading</h1>
      <p>Theme: {theme}</p>
      <p>Loading state: {isLoading ? 'Loading...' : 'Done'}</p>
      <p>Error: {error || 'No error'}</p>

      {/* Rest of your app, remove */}

      <div className={`app-container ${theme === 'dark' ? 'dark-theme' : ''}`}>
        <div className="app-card">
          <div className="app-header">
            <h1 className="app-title">{isLoading ? 'Loading...' : message}</h1>
            <button
              onClick={toggleTheme}
              className="theme-toggle-button"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
          <div className="title-underline"></div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="section">
            <h2>{selectedUser ? 'Edit User' : 'Add a New User'}</h2>
            <form onSubmit={handleSubmit} className="user-form">
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Enter name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className="text-input"
                  required />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email (optional)</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Enter email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className="text-input" />
              </div>

              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className="select-input"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.name.trim()}
                  className="button-primary"
                >
                  {isSubmitting ? 'Saving...' : selectedUser ? 'Update User' : 'Add User'}
                </button>

                {selectedUser && (
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={isSubmitting}
                    className="button-secondary"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="section">
            <div className="section-header">
              <h2>Users List ({totalUsers} total)</h2>
              <div className="filter-container">
                <select
                  value={roleFilter}
                  onChange={handleRoleFilterChange}
                  className="select-input filter-select"
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                </select>
              </div>
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()} />
                <button onClick={handleSearch} className="button-search">
                  Search
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="loader">Loading users...</div>
            ) : users.length > 0 ? (
              <>
                <div className="table-container">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th onClick={() => handleSortChange('name')} className="sortable-header">
                          Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th>Email</th>
                        <th onClick={() => handleSortChange('role')} className="sortable-header">
                          Role {sortBy === 'role' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th onClick={() => handleSortChange('created_at')} className="sortable-header">
                          Created {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div className="user-name">
                              <div className="user-avatar">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              {user.name}
                            </div>
                          </td>
                          <td>{user.email || '-'}</td>
                          <td>
                            <span className={`badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                              {user.role}
                            </span>
                          </td>
                          <td>
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                onClick={() => handleEdit(user)}
                                className="button-icon button-edit"
                                title="Edit user"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(user.id)}
                                className="button-icon button-delete"
                                title="Delete user"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination controls */}
                <div className="pagination">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="button-pagination"
                  >
                    Previous
                  </button>
                  <span className="pagination-info">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="button-pagination"
                  >
                    Next
                  </button>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1); // Reset to first page when changing page size
                    } }
                    className="select-input page-size-select"
                  >
                    <option value="5">5 per page</option>
                    <option value="10">10 per page</option>
                    <option value="20">20 per page</option>
                  </select>
                </div>
              </>
            ) : (
              <p className="empty-message">No users found. Add your first user above or try a different search.</p>
            )}
          </div>
        </div>

        <footer className="app-footer">
          • User Management App • {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}

export default App;