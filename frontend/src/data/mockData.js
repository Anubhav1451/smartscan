/**
 * Local mock data for Phase 1 Design Gate.
 * Mirrors the exact seed database values from docs/04_DATABASE.md.
 * Allows Phase 2 to swap to live API calls seamlessly without redesign.
 */

export const MOCK_USER = {
  name: "Anubhav",
  greeting: "Hello, Anubhav!",
  subtitle: "Let's make your shopping easier.",
};

export const MOCK_STORES = [
  {
    id: "fm",
    code: "FM",
    name: "FreshMart",
    area: "Rajpur Road",
    fullArea: "Rajpur Road, Dehradun",
    type: "Grocery Store",
    tagline: "Daily grocery, zero queue",
    isOpen: true,
  },
  {
    id: "sh",
    code: "SH",
    name: "StyleHub",
    area: "Rajpur Road",
    fullArea: "Rajpur Road, Dehradun",
    type: "Apparel Store",
    tagline: "Trendy fashion, zero queue",
    isOpen: true,
  },
  {
    id: "dn",
    code: "DN",
    name: "DailyNeeds",
    area: "Subhash Nagar",
    fullArea: "Subhash Nagar, Dehradun",
    type: "Daily Essentials",
    tagline: "Everyday essentials, zero queue",
    isOpen: true,
  },
];

export const MOCK_HOME_CATEGORIES = [
  { id: "fash", label: "Fashion", icon: "Shirt" },
  { id: "groc", label: "Grocery", icon: "Apple" },
  { id: "elec", label: "Electronics", icon: "Tv" },
  { id: "home", label: "Home", icon: "Home" },
];

export const MOCK_STORE_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "dairy", label: "Dairy" },
  { id: "bakery", label: "Bakery" },
  { id: "care", label: "Care" },
  { id: "snacks", label: "Snacks" },
];

export const MOCK_FRESHMART_PRODUCTS = [
  {
    id: "prod-1",
    barcode: "8901262010015",
    name: "Amul Taaza Milk 500ml",
    category: "Dairy",
    price: 62,
    stock: 40,
    badge: "AM",
    badgeBg: "bg-surface-tint",
    badgeText: "text-primary",
  },
  {
    id: "prod-2",
    barcode: "8901063142217",
    name: "Britannia Whole Wheat Bread",
    category: "Bakery",
    price: 45,
    stock: 35,
    badge: "BB",
    badgeBg: "bg-cream-card",
    badgeText: "text-ink",
  },
  {
    id: "prod-3",
    barcode: "4902430752108",
    name: "Head & Shoulders Shampoo 340ml",
    category: "Care",
    price: 210,
    stock: 18,
    badge: "HS",
    badgeBg: "bg-surface-alt",
    badgeText: "text-primary-dark",
  },
  {
    id: "prod-4",
    barcode: "8901764012235",
    name: "Coca-Cola 750ml",
    category: "Beverages",
    price: 40,
    stock: 0,
    isOutOfStock: true,
    badge: "CC",
    badgeBg: "bg-disabled-bg",
    badgeText: "text-disabled",
  },
  {
    id: "prod-5",
    barcode: "8901058852336",
    name: "Maggi Masala Noodles 12-pack",
    category: "Snacks",
    price: 168,
    stock: 50,
    badge: "MG",
    badgeBg: "bg-cream-card",
    badgeText: "text-ink",
  },
  {
    id: "prod-6",
    barcode: "8904043901005",
    name: "Tata Salt 1kg",
    category: "Grocery",
    price: 28,
    stock: 60,
    badge: "TS",
    badgeBg: "bg-surface-tint",
    badgeText: "text-primary",
  },
  {
    id: "prod-7",
    barcode: "8901234567890",
    name: "Steel Water Bottle 1L",
    category: "Home",
    price: 499,
    stock: 12,
    badge: "SB",
    badgeBg: "bg-surface-tint",
    badgeText: "text-primary",
  },
  {
    id: "prod-8",
    barcode: "8901719114120",
    name: "Parle-G Gold Biscuits 800g",
    category: "Snacks",
    price: 120,
    stock: 45,
    badge: "PG",
    badgeBg: "bg-cream-card",
    badgeText: "text-ink",
  },
];

export const MOCK_CANONICAL_CART = {
  itemsCount: 3,
  total: 317,
  summaryText: "3 items | ₹317",
};

export const MOCK_DETECTED_PRODUCT = {
  name: "Steel Water Bottle · 1L",
  price: 499,
  badge: "SB",
  barcode: "8901234567890",
};
