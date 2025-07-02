import { PGliteInterface } from "@electric-sql/pglite";

const createTablesSQL = `
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- User profiles (one-to-one with users)
  CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    bio TEXT,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Categories table
  CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Products table (many-to-one with categories)
  CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    in_stock BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Orders table (many-to-one with users)
  CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    total_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Order items table (many-to-one with orders and products)
  CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Product tags table
  CREATE TABLE IF NOT EXISTS product_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Product tag relations (many-to-many junction table)
  CREATE TABLE IF NOT EXISTS product_tag_relations (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES product_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, tag_id)
  );

  -- Create indexes for better performance
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
  CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
  CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
  CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
  CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
  CREATE INDEX IF NOT EXISTS idx_product_tag_relations_product_id ON product_tag_relations(product_id);
  CREATE INDEX IF NOT EXISTS idx_product_tag_relations_tag_id ON product_tag_relations(tag_id);
`;

function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

const firstNames = [
  "John",
  "Jane",
  "Michael",
  "Sarah",
  "David",
  "Emily",
  "Chris",
  "Lisa",
  "James",
  "Maria",
  "Robert",
  "Jennifer",
  "William",
  "Linda",
  "Richard",
  "Elizabeth",
  "Charles",
  "Barbara",
  "Joseph",
  "Susan",
  "Thomas",
  "Jessica",
  "Daniel",
  "Karen",
  "Matthew",
  "Nancy",
  "Anthony",
  "Betty",
  "Mark",
  "Helen",
  "Donald",
  "Sandra",
  "Steven",
  "Donna",
  "Paul",
  "Carol",
];

const lastNames = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Perez",
  "Thompson",
  "White",
  "Harris",
  "Sanchez",
  "Clark",
  "Ramirez",
  "Lewis",
  "Robinson",
  "Walker",
  "Young",
  "Allen",
  "King",
  "Wright",
];

const categories = [
  { name: "Electronics", description: "Electronic devices and gadgets" },
  { name: "Clothing", description: "Apparel and fashion items" },
  { name: "Books", description: "Physical and digital books" },
  {
    name: "Home & Garden",
    description: "Home improvement and garden supplies",
  },
  { name: "Sports", description: "Sports equipment and accessories" },
  { name: "Toys", description: "Toys and games for all ages" },
  { name: "Beauty", description: "Beauty and personal care products" },
  { name: "Automotive", description: "Car parts and accessories" },
  { name: "Food", description: "Food and beverages" },
  { name: "Health", description: "Health and wellness products" },
];

const productAdjectives = [
  "Premium",
  "Deluxe",
  "Professional",
  "Ultra",
  "Super",
  "Mega",
  "Pro",
  "Advanced",
  "Smart",
  "Digital",
];
const productNouns = [
  "Widget",
  "Device",
  "Tool",
  "Kit",
  "Set",
  "System",
  "Solution",
  "Product",
  "Item",
  "Gadget",
];

const tags = [
  "bestseller",
  "new-arrival",
  "sale",
  "premium",
  "eco-friendly",
  "limited-edition",
  "trending",
  "featured",
  "popular",
  "recommended",
  "top-rated",
  "exclusive",
  "seasonal",
  "gift-idea",
  "bundle",
  "clearance",
  "pre-order",
  "imported",
  "handmade",
  "organic",
  "wireless",
  "waterproof",
  "portable",
  "compact",
];

const orderStatuses = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export async function createSchema(db: PGliteInterface | any): Promise<void> {
  await db.exec(createTablesSQL);
}

export async function seedUsers(
  db: PGliteInterface | any,
  count: number = 1000
): Promise<void> {
  const users = [];
  for (let i = 1; i <= count; i++) {
    const firstName = getRandomElement(firstNames);
    const lastName = getRandomElement(lastNames);
    users.push({
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
      username: `${firstName.toLowerCase()}${lastName.toLowerCase()}${i}`,
    });
  }

  for (const user of users) {
    await db.query("INSERT INTO users (email, username) VALUES ($1, $2)", [
      user.email,
      user.username,
    ]);
  }
}

export async function seedUserProfiles(
  db: PGliteInterface | any
): Promise<void> {
  const userIds = await db.query("SELECT id FROM users ORDER BY id");

  for (const row of userIds.rows) {
    const userId = (row as any).id;
    const firstName = getRandomElement(firstNames);
    const lastName = getRandomElement(lastNames);
    const bio =
      Math.random() > 0.3
        ? `Hello, I'm ${firstName}! I love shopping and discovering new products.`
        : null;

    await db.query(
      "INSERT INTO user_profiles (user_id, first_name, last_name, bio) VALUES ($1, $2, $3, $4)",
      [userId, firstName, lastName, bio]
    );
  }
}

export async function seedCategories(db: PGliteInterface | any): Promise<void> {
  for (const category of categories) {
    await db.query(
      "INSERT INTO categories (name, slug, description) VALUES ($1, $2, $3)",
      [category.name, createSlug(category.name), category.description]
    );
  }
}

export async function seedProducts(
  db: PGliteInterface | any,
  count: number = 1000
): Promise<void> {
  const categoryIds = await db.query("SELECT id FROM categories");

  for (let i = 1; i <= count; i++) {
    const adjective = getRandomElement(productAdjectives);
    const noun = getRandomElement(productNouns);
    const name = `${adjective} ${noun} ${i}`;
    const slug = createSlug(name);
    const description = `High-quality ${name.toLowerCase()} designed for maximum performance and reliability. Perfect for both professional and personal use.`;
    const price = Math.floor(Math.random() * 99900) + 100; // $1.00 to $999.00
    const categoryId = (getRandomElement(categoryIds.rows) as any).id;
    const inStock = Math.random() > 0.1; // 90% in stock

    await db.query(
      "INSERT INTO products (name, slug, description, price, category_id, in_stock) VALUES ($1, $2, $3, $4, $5, $6)",
      [name, slug, description, price / 100, categoryId, inStock]
    );
  }
}

export async function seedOrders(
  db: PGliteInterface | any,
  count: number = 1000
): Promise<void> {
  const userIds = await db.query("SELECT id FROM users");

  for (let i = 1; i <= count; i++) {
    const userId = (getRandomElement(userIds.rows) as any).id;
    const status = getRandomElement([...orderStatuses]);
    const totalAmount = Math.floor(Math.random() * 50000) + 1000; // $10.00 to $500.00

    await db.query(
      "INSERT INTO orders (user_id, status, total_amount) VALUES ($1, $2, $3)",
      [userId, status, totalAmount / 100]
    );
  }
}

export async function seedOrderItems(db: PGliteInterface | any): Promise<void> {
  const orders = await db.query("SELECT id, total_amount FROM orders");
  const products = await db.query(
    "SELECT id, price FROM products WHERE in_stock = true"
  );

  for (const order of orders.rows as any[]) {
    const itemCount = Math.floor(Math.random() * 5) + 1; // 1-5 items per order
    const selectedProducts = getRandomElements(products.rows, itemCount);

    let runningTotal = 0;
    for (let i = 0; i < selectedProducts.length; i++) {
      const product = selectedProducts[i] as any;
      const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity
      const price = product.price;

      // For the last item, adjust to match order total
      const itemPrice =
        i === selectedProducts.length - 1
          ? (order as any).total_amount - runningTotal
          : price * quantity;

      if (itemPrice > 0) {
        await db.query(
          "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)",
          [(order as any).id, (product as any).id, quantity, itemPrice]
        );
        runningTotal += itemPrice;
      }
    }
  }
}

export async function seedProductTags(
  db: PGliteInterface | any
): Promise<void> {
  for (const tag of tags) {
    await db.query("INSERT INTO product_tags (name, slug) VALUES ($1, $2)", [
      tag,
      createSlug(tag),
    ]);
  }
}

export async function seedProductTagRelations(
  db: PGliteInterface | any
): Promise<void> {
  const products = await db.query("SELECT id FROM products");
  const tagIds = await db.query("SELECT id FROM product_tags");

  for (const product of products.rows as any[]) {
    const tagCount = Math.floor(Math.random() * 4) + 1; // 1-4 tags per product
    const selectedTags = getRandomElements(tagIds.rows, tagCount);

    for (const tag of selectedTags as any[]) {
      await db.query(
        "INSERT INTO product_tag_relations (product_id, tag_id) VALUES ($1, $2)",
        [(product as any).id, (tag as any).id]
      );
    }
  }
}

export async function seedDatabase(db: PGliteInterface): Promise<void> {
  console.log("Starting database seeding...");

  try {
    // Check if already seeded
    const userCount = await db.query("SELECT COUNT(*) as count FROM users");
    if ((userCount.rows[0] as any).count > 0) {
      console.log("Database already seeded, skipping...");
      return;
    }
  } catch {}

  try {
    await db.transaction(async (tx) => {
      console.log("Creating schema...");
      await createSchema(tx);

      console.log("Seeding users...");
      await seedUsers(tx, 1000);

      console.log("Seeding user profiles...");
      await seedUserProfiles(tx);

      console.log("Seeding categories...");
      await seedCategories(tx);

      console.log("Seeding products...");
      await seedProducts(tx, 1000);

      console.log("Seeding orders...");
      await seedOrders(tx, 1000);

      console.log("Seeding product tags...");
      await seedProductTags(tx);

      console.log("Seeding product tag relations...");
      await seedProductTagRelations(tx);

      console.log("Seeding order items...");
      await seedOrderItems(tx);
    });

    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}
