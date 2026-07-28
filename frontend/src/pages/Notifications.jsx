import { useState, useEffect } from 'react';
import { Bell, Check, Clock, AlertCircle, CheckCircle, Info, Trash2, Filter } from 'lucide-react';
import client from '../api/client';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadNotifications() {
    try {
      const response = await client.get('/notifications/').catch(() => ({ data: [] }));
      const notificationsData = response.data.results ?? response.data;
      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId) {
    try {
      await client.patch(`/notifications/${notificationId}/`, { read: true });
      loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async function markAllAsRead() {
    try {
      await client.post('/notifications/mark-all-read/');
      loadNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  async function deleteNotification(notificationId) {
    try {
      await client.delete(`/notifications/${notificationId}/`);
      loadNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }

  function getNotificationIcon(type) {
    switch (type) {
      case 'alert':
        return <AlertCircle size={16} className="text-red-500" />;
      case 'success':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'info':
      default:
        return <Info size={16} className="text-blue-500" />;
    }
  }

  function getNotificationIconBg(type) {
    switch (type) {
      case 'alert':
        return 'bg-red-100';
      case 'success':
        return 'bg-green-100';
      case 'info':
      default:
        return 'bg-blue-100';
    }
  }

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => 
      filter === 'unread' ? !n.read : 
      filter === 'read' ? n.read : 
      n.type === filter
    );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Notifications</h1>
          <p className="text-sm text-gray-500">Manage your notifications and alerts</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 bg-[#1e3a8a] text-white px-4 py-2 rounded-lg hover:bg-[#1e40af] transition-colors"
          >
            <Check size={16} /> Mark all as read
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <button 
          onClick={() => setFilter('all')}
          className={`text-sm font-medium px-4 py-2 rounded-lg ${filter === 'all' ? "bg-[#1e3a8a] text-white" : "bg-gray-100 text-gray-700"}`}
        >
          All ({notifications.length})
        </button>
        <button 
          onClick={() => setFilter('unread')}
          className={`text-sm font-medium px-4 py-2 rounded-lg ${filter === 'unread' ? "bg-[#1e3a8a] text-white" : "bg-gray-100 text-gray-700"}`}
        >
          Unread ({unreadCount})
        </button>
        <button 
          onClick={() => setFilter('read')}
          className={`text-sm font-medium px-4 py-2 rounded-lg ${filter === 'read' ? "bg-[#1e3a8a] text-white" : "bg-gray-100 text-gray-700"}`}
        >
          Read
        </button>
        <button 
          onClick={() => setFilter('alert')}
          className={`text-sm font-medium px-4 py-2 rounded-lg ${filter === 'alert' ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700"}`}
        >
          Alerts
        </button>
        <button 
          onClick={() => setFilter('success')}
          className={`text-sm font-medium px-4 py-2 rounded-lg ${filter === 'success' ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700"}`}
        >
          Success
        </button>
        <button 
          onClick={() => setFilter('info')}
          className={`text-sm font-medium px-4 py-2 rounded-lg ${filter === 'info' ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
        >
          Info
        </button>
      </div>

      <div className="bg-white border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a]"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-500">
            <Bell size={32} className="mx-auto mb-2 text-gray-300" />
            No notifications found
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Message</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotifications.map((notification) => (
                <tr 
                  key={notification.id} 
                  className={`border-b border-gray-200 last:border-0 hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-5 py-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getNotificationIconBg(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-900">{notification.title}</td>
                  <td className="px-5 py-3 text-gray-600">{notification.message}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {new Date(notification.created_at).toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      notification.read 
                        ? 'bg-gray-100 text-gray-600' 
                        : 'bg-[#1e3a8a] text-white'
                    }`}>
                      {notification.read ? 'Read' : 'Unread'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Mark as read"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
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
    </div>
  );
}

export default Notifications;