import { useLiveQuery } from '../db/context';
import { DebugPanel } from './debug-panel';

interface StatsCardProps {
  title: string;
  value: number;
  icon: string;
}

function StatsCard({ title, value, icon }: StatsCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className="text-2xl mr-4">{icon}</div>
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

interface CategoryBreakdown {
  name: string;
  product_count: number;
}

interface OrderStats {
  status: string;
  count: number;
}

export function Dashboard() {
  const userStats = useLiveQuery<{ count: number }>(`
    SELECT COUNT(*) as count FROM users
  `);

  const productStats = useLiveQuery<{ count: number }>(`
    SELECT COUNT(*) as count FROM products
  `);

  const orderStats = useLiveQuery<{ count: number }>(`
    SELECT COUNT(*) as count FROM orders
  `);

  const revenueStats = useLiveQuery<{ total: number }>(`
    SELECT COALESCE(SUM(total_amount), 0) as total FROM orders
  `);

  const categoryBreakdown = useLiveQuery<CategoryBreakdown>(`
    SELECT 
      c.name,
      COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id
    GROUP BY c.id, c.name
    ORDER BY product_count DESC
  `);

  const ordersByStatus = useLiveQuery<OrderStats>(`
    SELECT 
      status,
      COUNT(*) as count
    FROM orders
    GROUP BY status
    ORDER BY count DESC
  `);

  const recentOrders = useLiveQuery(`
    SELECT 
      o.id,
      o.status,
      o.total_amount,
      o.created_at,
      u.username,
      up.first_name,
      up.last_name
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    ORDER BY o.created_at DESC
    LIMIT 5
  `);

  const topProducts = useLiveQuery(`
    SELECT 
      p.name,
      p.price,
      COUNT(oi.id) as order_count,
      SUM(oi.quantity) as total_sold
    FROM products p
    LEFT JOIN order_items oi ON p.id = oi.product_id
    GROUP BY p.id, p.name, p.price
    HAVING COUNT(oi.id) > 0
    ORDER BY total_sold DESC
    LIMIT 5
  `);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
      
      {/* Debug Panel */}
      <DebugPanel />
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Users" 
          value={userStats[0]?.count || 0} 
          icon="👥" 
        />
        <StatsCard 
          title="Total Products" 
          value={productStats[0]?.count || 0} 
          icon="📦" 
        />
        <StatsCard 
          title="Total Orders" 
          value={orderStats[0]?.count || 0} 
          icon="🛒" 
        />
        <StatsCard 
          title="Total Revenue" 
          value={revenueStats[0]?.total || 0} 
          icon="💰" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Products by Category</h2>
          <div className="space-y-3">
            {categoryBreakdown.map((category) => (
              <div key={category.name} className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">{category.name}</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {category.product_count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Orders by Status</h2>
          <div className="space-y-3">
            {ordersByStatus.map((stat) => (
              <div key={stat.status} className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300 capitalize">
                  {stat.status}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {stat.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Recent Orders</h2>
          <div className="space-y-3">
            {recentOrders.map((order: any) => (
              <div key={order.id} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    #{order.id} - {order.first_name} {order.last_name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {order.status}
                  </p>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ${Number(order.total_amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Top Selling Products</h2>
          <div className="space-y-3">
            {topProducts.map((product: any) => (
              <div key={product.name} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    ${Number(product.price).toFixed(2)} • {product.order_count} orders
                  </p>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {product.total_sold} sold
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}