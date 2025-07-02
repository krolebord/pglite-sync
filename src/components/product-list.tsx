import { useState } from 'react';
import { useLiveQuery, usePGlite } from '../db/context';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category_id: number;
  category_name: string;
  in_stock: boolean;
  tags: string;
}

export function ProductList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const db = usePGlite();

  const categories = useLiveQuery<{ id: number; name: string }>(`
    SELECT id, name FROM categories ORDER BY name
  `);

  const productCountQuery = `
    SELECT COUNT(*) as count 
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE 1=1
    ${searchTerm ? "AND (p.name ILIKE $1 OR p.description ILIKE $1)" : ""}
    ${selectedCategory ? `AND p.category_id = ${selectedCategory}` : ""}
  `;

  const productCount = useLiveQuery<{ count: number }>(
    productCountQuery,
    searchTerm ? [`%${searchTerm}%`] : []
  );

  const offset = (currentPage - 1) * itemsPerPage;
  const totalPages = Math.ceil((productCount[0]?.count || 0) / itemsPerPage);

  const productsQuery = `
    SELECT 
      p.id,
      p.name,
      p.description,
      p.price,
      p.category_id,
      p.in_stock,
      c.name as category_name,
      STRING_AGG(pt.name, ', ' ORDER BY pt.name) as tags
    FROM products p
    JOIN categories c ON p.category_id = c.id
    LEFT JOIN product_tag_relations ptr ON p.id = ptr.product_id
    LEFT JOIN product_tags pt ON ptr.tag_id = pt.id
    WHERE 1=1
    ${searchTerm ? "AND (p.name ILIKE $1 OR p.description ILIKE $1)" : ""}
    ${selectedCategory ? `AND p.category_id = ${selectedCategory}` : ""}
    GROUP BY p.id, p.name, p.description, p.price, p.category_id, p.in_stock, c.name
    ORDER BY p.created_at DESC
    LIMIT ${itemsPerPage} OFFSET ${offset}
  `;

  const products = useLiveQuery<Product>(
    productsQuery,
    searchTerm ? [`%${searchTerm}%`] : []
  );

  const toggleStock = async (productId: number, currentStock: boolean) => {
    await db.query(
      'UPDATE products SET in_stock = $1 WHERE id = $2',
      [!currentStock, productId]
    );
  };

  const updatePrice = async (productId: number, newPrice: number) => {
    if (newPrice > 0) {
      await db.query(
        'UPDATE products SET price = $1 WHERE id = $2',
        [newPrice, productId]
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Products</h1>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {productCount[0]?.count || 0} products total
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Products
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name or description..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select
              value={selectedCategory || ''}
              onChange={(e) => {
                setSelectedCategory(e.target.value ? Number(e.target.value) : null);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {product.name}
                </h3>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  product.in_stock 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {product.in_stock ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {product.description.length > 100 
                  ? `${product.description.substring(0, 100)}...` 
                  : product.description
                }
              </p>
              
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {product.category_name}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">$</span>
                  <input
                    type="number"
                    value={Number(product.price).toFixed(2)}
                    onChange={(e) => updatePrice(product.id, Number(e.target.value))}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
              
              {product.tags && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1">
                    {product.tags.split(', ').map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <button
                onClick={() => toggleStock(product.id, product.in_stock)}
                className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  product.in_stock
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {product.in_stock ? 'Mark Out of Stock' : 'Mark In Stock'}
              </button>
            </div>
          </div>
        ))}
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