import type { Timestamp } from "firebase/firestore";

export type Product = {
  id?: string;
  name: string;
  category: string;
  sku: string;
  costPrice: number;
  retailPrice: number;
  stockLevel: number;
  reservedStock: number;
  lowStockThreshold: number;
};

export type ReservedPart = {
  productId: string;
  productName: string;
  quantity: number;
}

export type RepairStatus = 'Pendiente' | 'Diagnóstico' | 'En Progreso' | 'Esperando Piezas' | 'Listo para Recoger' | 'Completado';

export type RepairJob = {
  id?: string;
  customerName: string;
  customerPhone: string;
  deviceMake: string;
  deviceModel: string;
  deviceImei?: string;
  reportedIssue: string;
  initialCondition?: string;
  estimatedCost: number;
  amountPaid: number;
  isPaid: boolean;
  status: RepairStatus;
  notes?: string;
  createdAt: string;
  reservedParts: ReservedPart[];
  completedAt?: string;
  warrantyEndDate?: string;
};

export type CartItem = {
  productId: string;
  quantity: number;
  name: string;
  price: number;
  isRepair?: boolean;
};

export type HeldSale = {
  id: string;
  name: string;
  createdAt: string;
  items: CartItem[];
};

export type PaymentMethod = 'Efectivo USD' | 'Efectivo Bs' | 'Tarjeta' | 'Pago Móvil';

export type Payment = {
  method: PaymentMethod;
  amount: number;
}

export type Sale = {
  id?: string;
  items: CartItem[];
  repairJobId?: string;
  subtotal: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string;
  transactionDate: string;
  payments: Payment[];
};

export type Currency = 'USD' | 'Bs';
