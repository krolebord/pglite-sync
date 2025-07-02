import { useState } from 'react';
import { useLiveQuery, usePGlite } from '../db/context';

interface CategoryWithStats {
  id: number;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
  product_count: number;
  total_revenue: number;
}

export function CategoryManager() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithStats | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: ''
  });
  const db = usePGlite();

  const categoriesWithStats = useLiveQuery<CategoryWithStats>(`
    SELECT 
      c.id,
      c.name,
      c.slug,
      c.description,
      c.created_at,
      COUNT(p.id) as product_count,
      COALESCE(SUM(oi.price * oi.quantity), 0) as total_revenue
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id
    LEFT JOIN order_items oi ON p.id = oi.product_id
    GROUP BY c.id, c.name, c.slug, c.description, c.created_at
    ORDER BY product_count DESC, c.name
  `);

  const totalCategories = useLiveQuery<{ count: number }>(`
    SELECT COUNT(*) as count FROM categories
  `);

  const createSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const addCategory = async () => {
    if (!newCategory.name.trim()) return;

    try {
      const slug = createSlug(newCategory.name);
      await db.query(
        'INSERT INTO categories (name, slug, description) VALUES ($1, $2, $3)',
        [newCategory.name.trim(), slug, newCategory.description.trim() || null]
      );

      setNewCategory({ name: '', description: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Error adding category. Category name or slug might already exist.');
    }
  };

  const updateCategory = async (category: CategoryWithStats) => {
    if (!category.name.trim()) return;

    try {
      const slug = createSlug(category.name);
      await db.query(
        'UPDATE categories SET name = $1, slug = $2, description = $3 WHERE id = $4',
        [category.name.trim(), slug, category.description?.trim() || null, category.id]
      );

      setEditingCategory(null);
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Error updating category. Category name or slug might already exist.');
    }
  };

  const deleteCategory = async (categoryId: number, productCount: number) => {
    if (productCount > 0) {
      alert('Cannot delete category with products. Please move or delete all products first.');
      return;
    }

    if (confirm('Are you sure you want to delete this category?')) {
      try {
        await db.query('DELETE FROM categories WHERE id = $1', [categoryId]);
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Error deleting category.');
      }
    }
  };

  const topSellingCategories = useLiveQuery<{ 
    name: string; 
    total_sold: number; 
    revenue: number; 
  }>(`
    SELECT 
      c.name,
      COALESCE(SUM(oi.quantity), 0) as total_sold,
      COALESCE(SUM(oi.price * oi.quantity), 0) as revenue
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id
    LEFT JOIN order_items oi ON p.id = oi.product_id
    GROUP BY c.id, c.name
    HAVING SUM(oi.quantity) > 0
    ORDER BY total_sold DESC
    LIMIT 5
  `);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Category Management</h1>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {totalCategories[0]?.count || 0} categories total
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Category
          </button>
        </div>
      </div>

      {/* Top Selling Categories */}
      {topSellingCategories.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Top Selling Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {topSellingCategories.map((category, index) => (
              <div key={category.name} className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  #{index + 1}
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {category.name}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {category.total_sold} sold
                </div>
                <div className="text-sm font-medium text-green-600 dark:text-green-400">
                  ${Number(category.revenue).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Category Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Add New Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category Name *
              </label>
              <input
                type="text"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="e.g., Electronics"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
              {newCategory.name && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Slug: {createSlug(newCategory.name)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                placeholder="Brief description of the category"
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
              onClick={addCategory}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Category
            </button>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Products
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Revenue
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
              {categoriesWithStats.map((category) => (
                <tr key={category.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingCategory?.id === category.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingCategory.name}
                          onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        {editingCategory.name && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Slug: {createSlug(editingCategory.name)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {category.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          /{category.slug}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingCategory?.id === category.id ? (
                      <input
                        type="text"
                        value={editingCategory.description || ''}
                        onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                        placeholder="Category description"
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    ) : (
                      <div className="text-sm text-gray-900 dark:text-white">
                        {category.description || (
                          <span className="text-gray-500 dark:text-gray-400 italic">No description</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {category.product_count} products
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    ${Number(category.total_revenue).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(category.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingCategory?.id === category.id ? (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => updateCategory(editingCategory)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingCategory(null)}
                          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setEditingCategory(category)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteCategory(category.id, category.product_count)}
                          className={`${
                            category.product_count > 0 
                              ? 'text-gray-400 cursor-not-allowed' 
                              : 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300'
                          }`}
                          disabled={category.product_count > 0}
                          title={category.product_count > 0 ? 'Cannot delete category with products' : 'Delete category'}
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

      {categoriesWithStats.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <div className="text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-4">📂</div>
            <h3 className="text-lg font-medium mb-2">No categories yet</h3>
            <p className="text-sm">Get started by adding your first product category.</p>
          </div>
        </div>
      )}
    </div>
  );
}