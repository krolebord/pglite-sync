import { useSetAtom } from "jotai";
import {
  createSnapshotAtom,
  restoreSnapshotAtom,
  usePGlite,
} from "../db/context";
import { timeDbQuery, queryTimer } from "../utils/query-timer";

export function DebugPanel() {
  const db = usePGlite();

  const createSnapshot = useSetAtom(createSnapshotAtom);
  const restoreSnapshot = useSetAtom(restoreSnapshotAtom);

  const deleteRandomUser = async () => {
    try {
      const users = await timeDbQuery(
        db,
        "SELECT id FROM users ORDER BY RANDOM() LIMIT 1"
      );
      if ((users as any).rows.length > 0) {
        const userId = ((users as any).rows[0] as any).id;
        await timeDbQuery(db, "DELETE FROM users WHERE id = $1", [userId]);
        console.log(`Deleted user with ID: ${userId}`);
      }
    } catch (error) {
      console.error("Error deleting random user:", error);
    }
  };

  const setRandomOrderTotal = async () => {
    try {
      const orders = await timeDbQuery(db, "SELECT id FROM orders LIMIT 1");
      if ((orders as any).rows.length > 0) {
        const orderId = ((orders as any).rows[0] as any).id;
        const newTotal = Math.floor(Math.random() * 50000) + 1000; // $10.00 to $500.00
        await timeDbQuery(
          db,
          "UPDATE orders SET total_amount = $1 WHERE id = $2",
          [newTotal / 100, orderId]
        );
        console.log(
          `Updated order ${orderId} total to $${(newTotal / 100).toFixed(2)}`
        );
      }
    } catch (error) {
      console.error("Error updating random order total:", error);
    }
  };

  const setRandomOrderStatuses = async (count: number = 1) => {
    const start = performance.now();
    try {
      const orderStatuses = [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ];
      const orders = await timeDbQuery(
        db,
        `SELECT id FROM orders ORDER BY RANDOM() LIMIT ${count}`
      );

      let updateCount = 0;
      for (const order of (orders as any).rows) {
        const orderId = (order as any).id;
        const newStatus =
          orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
        await timeDbQuery(db, "UPDATE orders SET status = $1 WHERE id = $2", [
          newStatus,
          orderId,
        ]);
        updateCount++;
      }

      const duration = performance.now() - start;
      console.log(
        `Updated ${updateCount} orders with random statuses in ${duration.toFixed(
          2
        )}ms`
      );
    } catch (error) {
      const duration = performance.now() - start;
      console.error(
        "Error updating random order statuses:",
        error,
        `(after ${duration.toFixed(2)}ms)`
      );
    }
  };

  const addRandomProduct = async () => {
    try {
      const categories = await timeDbQuery(
        db,
        "SELECT id FROM categories ORDER BY RANDOM() LIMIT 1"
      );
      if ((categories as any).rows.length > 0) {
        const categoryId = ((categories as any).rows[0] as any).id;
        const productName = `Demo Product ${Date.now()}`;
        const price = Math.floor(Math.random() * 20000) + 500; // $5.00 to $200.00
        const slug = `demo-product-${Date.now()}`;

        await timeDbQuery(
          db,
          "INSERT INTO products (name, slug, description, price, category_id, in_stock) VALUES ($1, $2, $3, $4, $5, $6)",
          [
            productName,
            slug,
            `Auto-generated demo product for testing live queries.`,
            price / 100,
            categoryId,
            true,
          ]
        );

        console.log(
          `Added product: ${productName} ($${(price / 100).toFixed(2)})`
        );
      }
    } catch (error) {
      console.error("Error adding random product:", error);
    }
  };

  const toggleRandomProductStock = async () => {
    try {
      const products = await timeDbQuery(
        db,
        "SELECT id, in_stock FROM products ORDER BY RANDOM() LIMIT 10"
      );

      let updateCount = 0;
      for (const product of (products as any).rows) {
        const productData = product as any;
        await timeDbQuery(
          db,
          "UPDATE products SET in_stock = $1 WHERE id = $2",
          [!productData.in_stock, productData.id]
        );
        updateCount++;
      }

      console.log(`Toggled stock status for ${updateCount} products`);
    } catch (error) {
      console.error("Error toggling product stock:", error);
    }
  };

  const addRandomOrder = async () => {
    try {
      const users = await timeDbQuery(
        db,
        "SELECT id FROM users ORDER BY RANDOM() LIMIT 1"
      );
      const products = await timeDbQuery(
        db,
        "SELECT id, price FROM products WHERE in_stock = true ORDER BY RANDOM() LIMIT 3"
      );

      if ((users as any).rows.length > 0 && (products as any).rows.length > 0) {
        const userId = ((users as any).rows[0] as any).id;
        const orderStatuses = ["pending", "processing", "shipped", "delivered"];
        const status =
          orderStatuses[Math.floor(Math.random() * orderStatuses.length)];

        // Calculate total from selected products
        let total = 0;
        for (const product of (products as any).rows) {
          const productData = product as any;
          const quantity = Math.floor(Math.random() * 3) + 1;
          total += productData.price * quantity;
        }

        const orderResult = await timeDbQuery(
          db,
          "INSERT INTO orders (user_id, status, total_amount) VALUES ($1, $2, $3) RETURNING id",
          [userId, status, total]
        );

        const orderId = ((orderResult as any).rows[0] as any).id;

        // Add order items
        for (const product of (products as any).rows) {
          const productData = product as any;
          const quantity = Math.floor(Math.random() * 3) + 1;
          await timeDbQuery(
            db,
            "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)",
            [orderId, productData.id, quantity, productData.price * quantity]
          );
        }

        console.log(
          `Added order ${orderId} with ${
            (products as any).rows.length
          } items (total: $${total.toFixed(2)})`
        );
      }
    } catch (error) {
      console.error("Error adding random order:", error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        🛠️ Live Query Demo Controls
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Use these buttons to make real-time changes and see live queries update
        instantly across all components.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <button
          onClick={() => createSnapshot()}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors text-sm"
        >
          🔄 Create Snapshot
        </button>
        <button
          onClick={async () => {
            await deleteRandomUser();
            await restoreSnapshot();
            await deleteRandomUser();
          }}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors text-sm"
        >
          🔄 Restore Snapshot
        </button>
        <button
          onClick={deleteRandomUser}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors text-sm"
        >
          🗑️ Delete Random User
        </button>

        <button
          onClick={setRandomOrderTotal}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors text-sm"
        >
          💰 Random Order Total
        </button>

        <button
          onClick={() => setRandomOrderStatuses(1)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors text-sm"
        >
          📦 Random Order Status
        </button>

        <button
          onClick={() => setRandomOrderStatuses(100)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors text-sm"
        >
          📦 Random Order Status (100x)
        </button>

        <button
          onClick={addRandomProduct}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors text-sm"
        >
          ➕ Add Random Product
        </button>

        <button
          onClick={toggleRandomProductStock}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm"
        >
          🔄 Toggle Stock (10x)
        </button>

        <button
          onClick={addRandomOrder}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors text-sm"
        >
          🛒 Add Random Order
        </button>
      </div>

      {/* Query Performance Controls */}
      <div className="mt-6 border-t border-gray-200 dark:border-gray-600 pt-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
          📊 Query Performance Analysis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => queryTimer.logSummary()}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md transition-colors text-sm"
          >
            📈 Show Performance Summary
          </button>

          <button
            onClick={() => {
              const slowQueries = queryTimer.getSlowQueries(25);
              console.group("🐌 Slow Queries (>25ms)");
              slowQueries.forEach((q, i) => {
                console.log(
                  `${i + 1}. ${q.duration.toFixed(2)}ms: ${q.query.substring(
                    0,
                    80
                  )}...`
                );
              });
              console.groupEnd();
            }}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors text-sm"
          >
            🐌 Show Slow Queries
          </button>

          <button
            onClick={() => queryTimer.clearStats()}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors text-sm"
          >
            🧹 Clear Query Stats
          </button>
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          💡 <strong>Tip:</strong> Open the browser console to see detailed logs
          of all changes. Watch how the dashboard, tables, and statistics update
          in real-time as you click these buttons!
        </p>
      </div>
    </div>
  );
}
