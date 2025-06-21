
export interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string; // Auto-generated, e.g., INV-2024-0001
  customerId: string;
  customerName: string; // Denormalized for quick display
  invoiceDate: string; // ISO date string
  dueDate: string; // ISO date string
  items: InvoiceItem[];
  subTotal: number;
  taxRate: number; // Percentage, e.g., 0.1 for 10%
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  invoicePrefix: string;
  nextInvoiceNumber: number;
  defaultTaxRate: number; // e.g., 0.05 for 5%
}

export type NotificationType = 'success' | 'error' | 'info';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}
    