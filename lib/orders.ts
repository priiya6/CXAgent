export type OrderStatus = "Processing" | "Out for Delivery" | "Delivered";

export type Order = {
  order_id: string;
  customer_name: string;
  product: string;
  value: string;
  status: OrderStatus;
  courier: string;
  tracking: string;
  expected_delivery?: string;
  ordered?: string;
  deliveredDaysAgo?: number;
};

export const ORDERS: Record<string, Order> = {
  "ORD-101": {
    order_id: "ORD-101",
    customer_name: "Priya Sharma",
    product: "Vitamin C Serum (30ml)",
    value: "₹699",
    status: "Out for Delivery",
    courier: "BlueDart",
    tracking: "BD-982103",
    expected_delivery: "6 PM today",
  },
  "ORD-102": {
    order_id: "ORD-102",
    customer_name: "Rahul Verma",
    product: "Hydrating Sunscreen SPF 50",
    value: "₹499",
    status: "Delivered",
    courier: "Delhivery",
    tracking: "DL-441029",
    deliveredDaysAgo: 14,
  },
  "ORD-103": {
    order_id: "ORD-103",
    customer_name: "Ananya Patel",
    product: "Green Tea Face Wash + Toner",
    value: "₹850",
    status: "Processing",
    courier: "Not assigned",
    tracking: "Not assigned",
    ordered: "3 hours ago",
  },
};
