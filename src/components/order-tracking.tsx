import { useState, Fragment } from 'react';
import { useLiveQuery, usePGlite } from '../db/context';

interface OrderWithDetails {
  id: number;
  status: string;
  total_amount: number;
  created_at: string;
  user_id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  item_count: number;
}

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  product_name: string;
  product_id: number;
}

export function OrderTracking() {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const db = usePGlite();

  const orderStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

  const ordersQuery = `
    SELECT 
      o.id,
      o.status,
      o.total_amount,
      o.created_at,
      o.user_id,
      u.username,
      up.first_name,
      up.last_name,
      COUNT(oi.id) as item_count
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE 1=1
    ${selectedStatus ? `AND o.status = '${selectedStatus}'` : ''}
    GROUP BY o.id, o.status, o.total_amount, o.created_at, o.user_id, u.username, up.first_name, up.last_name
    ORDER BY o.created_at DESC
    LIMIT ${itemsPerPage} OFFSET ${(currentPage - 1) * itemsPerPage}
  `;

  const orders = useLiveQuery<OrderWithDetails>(ordersQuery);

  const orderCountQuery = `
    SELECT COUNT(*) as count 
    FROM orders o
    WHERE 1=1
    ${selectedStatus ? `AND o.status = '${selectedStatus}'` : ''}
  `;

  const orderCount = useLiveQuery<{ count: number }>(orderCountQuery);
  const totalPages = Math.ceil((orderCount[0]?.count || 0) / itemsPerPage);

  const orderItemsQuery = selectedOrderId ? `
    SELECT 
      oi.id,
      oi.quantity,
      oi.price,
      oi.product_id,
      p.name as product_name
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ${selectedOrderId}
    ORDER BY oi.id
  ` : '';

  const orderItems = useLiveQuery<OrderItem>(orderItemsQuery || 'SELECT 1 WHERE FALSE');

  const statusCounts = useLiveQuery<{ status: string; count: number }>(`
    SELECT status, COUNT(*) as count
    FROM orders
    GROUP BY status
    ORDER BY count DESC
  `);

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      await db.query(
        'UPDATE orders SET status = $1 WHERE id = $2',
        [newStatus, orderId]
      );
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Error updating order status.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'shipped':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Order Tracking</h1>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {orderCount[0]?.count || 0} orders total
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statusCounts.map((statusCount) => (
          <div 
            key={statusCount.status}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center"
          >
            <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(statusCount.status)}`}>
              {statusCount.status}
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {statusCount.count}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Statuses</option>
              {orderStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {orders.map((order) => (
                <Fragment key={order.id}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        #{order.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {order.first_name} {order.last_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          @{order.username}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className={`px-2 py-1 text-xs font-semibold rounded-full border-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${getStatusColor(order.status)}`}
                      >
                        {orderStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {order.item_count} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      ${Number(order.total_amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setSelectedOrderId(order.id === selectedOrderId ? null : order.id)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {selectedOrderId === order.id ? 'Hide Details' : 'View Details'}
                      </button>
                    </td>
                  </tr>
                  {selectedOrderId === order.id && (
                    <tr key={`${order.id}-details`}>
                      <td colSpan={7} className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900 dark:text-white">Order Items:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {orderItems.map((item) => (
                              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {item.product_name}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  Quantity: {item.quantity}
                                </div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  ${Number(item.price).toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            Previous
          </button>
          
          <span className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}