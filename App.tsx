
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useParams, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Customer, Invoice, InvoiceItem, AppSettings, Notification, NotificationType } from './types';
import { loadCustomers, saveCustomers, loadInvoices, saveInvoices, loadSettings, saveSettings } from './services/storageService';
import { exportToPdf } from './services/pdfService';
import { APP_NAME, DEFAULT_SETTINGS } from './constants';
import {
  Users, UserPlus, Edit3, Trash2, FileText, PlusCircle, Printer, MessageSquare, UploadCloud, Settings as SettingsIcon, Home, ArrowLeft, X, AlertTriangle, CheckCircle, Info
} from 'lucide-react';

// Helper to generate unique IDs
const generateId = (): string => Math.random().toString(36).substr(2, 9);

// --- Reusable UI Components ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className = '', leftIcon, ...props }) => {
  const baseStyle = 'font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition ease-in-out duration-150 flex items-center justify-center';
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'bg-transparent text-blue-600 hover:bg-blue-100 focus:ring-blue-500',
  };
  return (
    <button className={`${baseStyle} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`} {...props}>
      {leftIcon && <span className="mr-2 h-5 w-5">{leftIcon}</span>}
      {children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input: React.FC<InputProps> = ({ label, id, error, className, ...props }) => {
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <input
        id={id}
        className={`mt-1 block w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}
const Textarea: React.FC<TextareaProps> = ({ label, id, error, className, ...props }) => {
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <textarea
        id={id}
        className={`mt-1 block w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};


interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]} p-6`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};


// --- Notification System ---
const NotificationItem: React.FC<{ notification: Notification; onDismiss: (id: string) => void }> = ({ notification, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  const icons = {
    success: <CheckCircle className="text-green-500" size={20} />,
    error: <AlertTriangle className="text-red-500" size={20} />,
    info: <Info className="text-blue-500" size={20} />,
  };

  const colors = {
    success: 'bg-green-50 border-green-500 text-green-700',
    error: 'bg-red-50 border-red-500 text-red-700',
    info: 'bg-blue-50 border-blue-500 text-blue-700',
  };

  return (
    <div className={`p-4 mb-2 rounded-md border-l-4 shadow-lg ${colors[notification.type]} flex items-start`}>
      <div className="mr-3 flex-shrink-0">{icons[notification.type]}</div>
      <div className="flex-grow text-sm">{notification.message}</div>
      <button onClick={() => onDismiss(notification.id)} className="ml-4 text-gray-500 hover:text-gray-700">
        <X size={18} />
      </button>
    </div>
  );
};

const NotificationsContainer: React.FC<{ notifications: Notification[]; onDismiss: (id: string) => void }> = ({ notifications, onDismiss }) => {
  return (
    <div className="fixed top-4 right-4 w-full max-w-sm z-[100]"> {/* Ensure high z-index */}
      {notifications.map(notif => (
        <NotificationItem key={notif.id} notification={notif} onDismiss={onDismiss} />
      ))}
    </div>
  );
};


// --- App Component ---
const App: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const appNavigate = useNavigate();


  const addNotification = useCallback((message: string, type: NotificationType = 'info') => {
    const id = generateId();
    setNotifications(prev => [...prev, { id, message, type }]);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  useEffect(() => {
    setCustomers(loadCustomers());
    setInvoices(loadInvoices());
    setSettings(loadSettings());
    setIsLoading(false);
  }, []);

  useEffect(() => { if (!isLoading) saveCustomers(customers); }, [customers, isLoading]);
  useEffect(() => { if (!isLoading) saveInvoices(invoices); }, [invoices, isLoading]);
  useEffect(() => { if (!isLoading) saveSettings(settings); }, [settings, isLoading]);

  // Customer CRUD
  const addCustomer = (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCustomer: Customer = {
      ...customerData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCustomers(prev => [...prev, newCustomer]);
    addNotification('Customer added successfully', 'success');
  };

  const updateCustomer = (updatedCustomer: Customer) => {
    setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? { ...updatedCustomer, updatedAt: new Date().toISOString() } : c));
    addNotification('Customer updated successfully', 'success');
  };

  const deleteCustomer = (customerId: string) => {
    if (invoices.some(inv => inv.customerId === customerId)) {
      addNotification('Cannot delete customer with existing invoices.', 'error');
      return;
    }
    setCustomers(prev => prev.filter(c => c.id !== customerId));
    addNotification('Customer deleted successfully', 'success');
  };
  
  const findCustomerById = useCallback((customerId: string): Customer | undefined => customers.find(c => c.id === customerId), [customers]);

  // Invoice Logic
  const calculateInvoiceTotals = useCallback((items: InvoiceItem[], taxRate: number): Pick<Invoice, 'subTotal' | 'taxAmount' | 'totalAmount'> => {
    const subTotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subTotal * taxRate;
    const totalAmount = subTotal + taxAmount;
    return { subTotal, taxAmount, totalAmount };
  },[]);
  
  const getNextInvoiceId = useCallback(() => {
    const currentYear = new Date().getFullYear();
    const invoiceNumberStr = settings.nextInvoiceNumber.toString().padStart(4, '0');
    return `${settings.invoicePrefix}${currentYear}-${invoiceNumberStr}`;
  }, [settings.invoicePrefix, settings.nextInvoiceNumber]);

  const addInvoice = (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'subTotal' | 'taxAmount' | 'totalAmount' | 'status' | 'customerName' | 'items'>, items: InvoiceItem[]) => {
    const customer = findCustomerById(invoiceData.customerId);
    if (!customer) {
      addNotification('Customer not found for invoice.', 'error');
      return null;
    }
    const totals = calculateInvoiceTotals(items, invoiceData.taxRate);
    const newInvoice: Invoice = {
      ...invoiceData,
      id: getNextInvoiceId(),
      customerName: customer.name,
      items,
      ...totals,
      status: 'Draft', // New invoices always start as Draft
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setInvoices(prev => [...prev, newInvoice]);
    setSettings(s => ({ ...s, nextInvoiceNumber: s.nextInvoiceNumber + 1 }));
    addNotification(`Invoice ${newInvoice.id} created successfully`, 'success');
    return newInvoice.id; // Return ID for navigation
  };

  const updateInvoice = (updatedInvoiceData: Omit<Invoice, 'createdAt' | 'updatedAt' | 'subTotal' | 'taxAmount' | 'totalAmount' | 'customerName' | 'items'>, items: InvoiceItem[]) => {
    const customer = findCustomerById(updatedInvoiceData.customerId);
     if (!customer) {
      addNotification('Customer not found for invoice.', 'error');
      return;
    }
    const originalInvoice = invoices.find(inv => inv.id === updatedInvoiceData.id);
    if (!originalInvoice) {
      addNotification('Original invoice not found for update.', 'error');
      return;
    }

    const totals = calculateInvoiceTotals(items, updatedInvoiceData.taxRate);
    const updatedInvoice: Invoice = {
      ...updatedInvoiceData, // This will include id, status from the form
      customerName: customer.name,
      items,
      ...totals,
      updatedAt: new Date().toISOString(),
      createdAt: originalInvoice.createdAt, // Preserve original creation date
    };
    setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
    addNotification(`Invoice ${updatedInvoice.id} updated successfully`, 'success');
  };

  const deleteInvoice = (invoiceId: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
    addNotification(`Invoice ${invoiceId} deleted successfully`, 'success');
  };

  const findInvoiceById = useCallback((invoiceId: string): Invoice | undefined => invoices.find(inv => inv.id === invoiceId), [invoices]);
  
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-xl font-semibold">Loading Application Data...</div>;
  }
  
  // --- Page Components ---
  

  // --- Customer Components & Page ---
  interface CustomerFormProps {
    customer?: Customer;
    onSave: (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> | Customer) => void;
    onClose: () => void;
  }
  const CustomerForm: React.FC<CustomerFormProps> = ({ customer, onSave, onClose }) => {
    const [name, setName] = useState(customer?.name || '');
    const [phone, setPhone] = useState(customer?.phone || '');
    const [whatsapp, setWhatsapp] = useState(customer?.whatsapp || '');
    const [email, setEmail] = useState(customer?.email || '');
    const [address, setAddress] = useState(customer?.address || '');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
      const newErrors: Record<string, string> = {};
      if (!name.trim()) newErrors.name = "Name is required";
      if (!phone.trim()) newErrors.phone = "Phone is required";
      else if (!/^\+?[0-9\s-()]+$/.test(phone)) newErrors.phone = "Invalid phone number";
      
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Invalid email address";
      if (whatsapp && !/^\+?[0-9\s-()]+$/.test(whatsapp)) newErrors.whatsapp = "Invalid WhatsApp number";

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;
      
      const customerData = { name, phone, whatsapp: whatsapp || phone, email, address }; // Default whatsapp to phone if empty
      if (customer) {
        onSave({ ...customer, ...customerData });
      } else {
        onSave(customerData);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Name" id="name" value={name} onChange={e => setName(e.target.value)} error={errors.name} required />
        <Input label="Phone Number" id="phone" value={phone} onChange={e => setPhone(e.target.value)} error={errors.phone} required />
        <Input label="WhatsApp Number (optional)" id="whatsapp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} error={errors.whatsapp} placeholder="Defaults to phone number if blank" />
        <Input label="Email (optional)" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} error={errors.email} />
        <Textarea label="Address (optional)" id="address" value={address} onChange={e => setAddress(e.target.value)} rows={3} />
        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">Save Customer</Button>
        </div>
      </form>
    );
  };

  const CustomersPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);

    const filteredCustomers = customers.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a,b) => a.name.localeCompare(b.name));


    const handleAddNew = () => {
      setEditingCustomer(undefined);
      setIsModalOpen(true);
    };

    const handleEdit = (customer: Customer) => {
      setEditingCustomer(customer);
      setIsModalOpen(true);
    };

    const handleSaveCustomer = (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> | Customer) => {
      if ('id' in customerData) { 
        updateCustomer(customerData as Customer);
      } else { 
        addCustomer(customerData);
      }
      setIsModalOpen(false);
      setEditingCustomer(undefined);
    };
    
    const handleDeleteCustomer = (customerId: string) => {
        if(window.confirm("Are you sure you want to delete this customer? This action cannot be undone.")){
            deleteCustomer(customerId);
        }
    }

    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Customers</h1>
          <Button onClick={handleAddNew} leftIcon={<UserPlus size={18} />}>Add New Customer</Button>
        </div>
        <div className="mb-4">
          <Input 
            type="text" 
            placeholder="Search customers by name, phone, or email..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="max-w-md"
          />
        </div>
        <div className="bg-white shadow overflow-x-auto rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WhatsApp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.length > 0 ? filteredCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.whatsapp || customer.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.email || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(customer)} leftIcon={<Edit3 size={16}/>}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-100" onClick={() => handleDeleteCustomer(customer.id)} leftIcon={<Trash2 size={16}/>}>Delete</Button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No customers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCustomer ? "Edit Customer" : "Add New Customer"}>
          <CustomerForm customer={editingCustomer} onSave={handleSaveCustomer} onClose={() => setIsModalOpen(false)} />
        </Modal>
      </div>
    );
  };

  // --- Invoice Components & Page ---
  const InvoicePreview: React.FC<{ invoice: Invoice | null; customer: Customer | null }> = ({ invoice, customer }) => {
    if (!invoice || !customer) return <div className="p-6 text-center text-gray-500">Invoice data is incomplete.</div>;
  
    return (
      <div id="invoice-preview-content" className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto my-4 border border-gray-200 print-area">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .print-area, .print-area * { visibility: visible; }
            .print-area { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
          }
        `}</style>
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-blue-600">{APP_NAME}</h1>
            <p className="text-gray-600">123 Main Street</p>
            <p className="text-gray-600">Anytown, ST 12345</p>
            <p className="text-gray-600">(555) 123-4567</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-semibold text-gray-800">INVOICE</h2>
            <p className="text-gray-600"># {invoice.id}</p>
            <p className="text-gray-600">Date: {new Date(invoice.invoiceDate).toLocaleDateString()}</p>
            <p className="text-gray-600">Due Date: {new Date(invoice.dueDate).toLocaleDateString()}</p>
          </div>
        </div>
  
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">Bill To:</h3>
            <p className="font-medium text-gray-800">{customer.name}</p>
            <p className="text-gray-600 whitespace-pre-line">{customer.address || 'N/A'}</p>
            <p className="text-gray-600">{customer.phone}</p>
            {customer.email && <p className="text-gray-600">{customer.email}</p>}
          </div>
        </div>
  
        <table className="w-full mb-8">
          <thead className="border-b-2 border-gray-300">
            <tr>
              <th className="text-left py-2 font-semibold text-gray-700">Description</th>
              <th className="text-right py-2 font-semibold text-gray-700 w-1/6">Qty</th>
              <th className="text-right py-2 font-semibold text-gray-700 w-1/6">Unit Price</th>
              <th className="text-right py-2 font-semibold text-gray-700 w-1/5">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map(item => (
              <tr key={item.id} className="border-b border-gray-200">
                <td className="py-2 text-gray-700">{item.description}</td>
                <td className="text-right py-2 text-gray-700">{item.quantity}</td>
                <td className="text-right py-2 text-gray-700">₹{item.unitPrice.toFixed(2)}</td>
                <td className="text-right py-2 text-gray-700">₹{item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
  
        <div className="flex justify-end mb-8">
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal:</span>
              <span>₹{invoice.subTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Tax ({ (invoice.taxRate * 100).toFixed(0) }%):</span>
              <span>₹{invoice.taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-xl text-gray-800 mt-2 pt-2 border-t border-gray-300">
              <span>Total:</span>
              <span>₹{invoice.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
  
        {invoice.notes && (
          <div className="mb-8">
            <h4 className="font-semibold text-gray-700 mb-1">Notes:</h4>
            <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}
  
        <div className="text-center text-xs text-gray-500 pt-8 border-t border-gray-200">
          Thank you for your business!
        </div>
      </div>
    );
  };

  interface InvoiceFormProps {
    invoiceToEdit?: Invoice;
    onSave: (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'subTotal' | 'taxAmount' | 'totalAmount' | 'status' | 'customerName' | 'items'>, items: InvoiceItem[]) => string | null;
    onUpdate: (invoiceData: Omit<Invoice, 'createdAt' | 'updatedAt' | 'subTotal' | 'taxAmount' | 'totalAmount' | 'customerName' | 'items'>, items: InvoiceItem[]) => void;
  }
  
  const InvoiceForm: React.FC<InvoiceFormProps> = ({ invoiceToEdit, onSave, onUpdate }) => {
    const navigate = useNavigate();
    const [customerId, setCustomerId] = useState(invoiceToEdit?.customerId || (customers.length > 0 ? customers[0].id : ''));
    const [invoiceDate, setInvoiceDate] = useState(invoiceToEdit?.invoiceDate || new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(invoiceToEdit?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); 
    const [items, setItems] = useState<InvoiceItem[]>(invoiceToEdit?.items || [{ id: generateId(), description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    const [taxRate, setTaxRate] = useState(invoiceToEdit?.taxRate || settings.defaultTaxRate);
    const [notes, setNotes] = useState(invoiceToEdit?.notes || '');
    const [status, setStatus] = useState<'Draft' | 'Sent' | 'Paid' | 'Overdue'>(invoiceToEdit?.status || 'Draft');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleItemChange = <K extends keyof InvoiceItem>(index: number, field: K, value: K extends 'quantity' | 'unitPrice' ? (string | number) : InvoiceItem[K]) => {
      const newItems = [...items];
      let parsedValue: any = value;
      if ((field === 'quantity' || field === 'unitPrice') && typeof value === 'string') {
        parsedValue = parseFloat(value);
        if (isNaN(parsedValue as number)) parsedValue = 0;
      }
      // The type assertion helps TypeScript understand that parsedValue is now of the correct type for the specific field
      newItems[index] = { ...newItems[index], [field]: parsedValue as InvoiceItem[K] };
      newItems[index].total = (newItems[index].quantity || 0) * (newItems[index].unitPrice || 0);
      setItems(newItems);
    };
  
    const addItem = () => setItems([...items, { id: generateId(), description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

    const validateForm = () => {
      const newErrors: Record<string, string> = {};
      if (!customerId) newErrors.customerId = "Customer is required.";
      if (!invoiceDate) newErrors.invoiceDate = "Invoice date is required.";
      if (!dueDate) newErrors.dueDate = "Due date is required.";
      if (new Date(dueDate) < new Date(invoiceDate)) newErrors.dueDate = "Due date cannot be before invoice date.";
      if (items.some(item => !item.description.trim() || item.quantity <= 0 || item.unitPrice < 0)) {
        newErrors.items = "All items must have a description, positive quantity, and non-negative price.";
      }
      if (taxRate < 0 || taxRate > 1) newErrors.taxRate = "Tax rate must be between 0 (0%) and 1 (100%).";
      
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!validateForm()) {
        addNotification("Please correct the errors in the form.", "error");
        return;
      }
      
      if (invoiceToEdit) {
        const invoiceDataForUpdate = { customerId, invoiceDate, dueDate, taxRate: Number(taxRate), notes, status };
        onUpdate({ ...invoiceToEdit, ...invoiceDataForUpdate }, items);
        navigate(`/invoices/${invoiceToEdit.id}`);
      } else {
        const invoiceDataForSave = { customerId, invoiceDate, dueDate, taxRate: Number(taxRate), notes }; // Status is not included, addInvoice sets it to 'Draft'
        const newInvoiceId = onSave(invoiceDataForSave, items);
        if (newInvoiceId) {
          navigate(`/invoices/${newInvoiceId}`);
        }
      }
    };

    const currentInvoiceForPreview = useMemo(() => {
        const customer = findCustomerById(customerId);
        if(!customer || !items) return null; 

        const totals = calculateInvoiceTotals(items, Number(taxRate));
        return {
            id: invoiceToEdit?.id || 'PREVIEW',
            customerId,
            customerName: customer.name,
            invoiceDate,
            dueDate,
            items,
            taxRate: Number(taxRate),
            notes,
            status,
            ...totals,
            createdAt: invoiceToEdit?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    }, [customerId, invoiceDate, dueDate, items, taxRate, notes, status, invoiceToEdit, findCustomerById, calculateInvoiceTotals]); 
  
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
          <div>
            <label htmlFor="customer" className="block text-sm font-medium text-gray-700">Customer</label>
            <select id="customer" value={customerId} onChange={e => setCustomerId(e.target.value)} className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border ${errors.customerId ? 'border-red-500':'border-gray-300'} focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md`}>
              <option value="" disabled>Select a customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.customerId && <p className="mt-1 text-sm text-red-500">{errors.customerId}</p>}
          </div>
  
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Invoice Date" id="invoiceDate" type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} error={errors.invoiceDate} />
            <Input label="Due Date" id="dueDate" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} error={errors.dueDate} />
          </div>
  
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Items</h3>
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 mb-3 p-3 border border-gray-200 rounded-md items-center">
                <div className="col-span-12 sm:col-span-5"><Input aria-label="Item Description" placeholder="Description" value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} /></div>
                <div className="col-span-4 sm:col-span-2"><Input aria-label="Item Quantity" type="number" placeholder="Qty" value={item.quantity.toString()} onChange={e => handleItemChange(index, 'quantity', e.target.value)} min="0.01" step="any" /></div>
                <div className="col-span-4 sm:col-span-2"><Input aria-label="Item Unit Price" type="number" placeholder="Price" value={item.unitPrice.toString()} onChange={e => handleItemChange(index, 'unitPrice', e.target.value)} min="0" step="any"/></div>
                <div className="col-span-4 sm:col-span-2 flex items-center justify-end"><span className="text-sm text-gray-700">₹{item.total.toFixed(2)}</span></div>
                <div className="col-span-12 sm:col-span-1 flex items-center justify-end">
                  {items.length > 1 && <Button type="button" variant="danger" size="sm" onClick={() => removeItem(index)} aria-label="Remove item"><Trash2 size={14}/></Button>}
                </div>
              </div>
            ))}
             {errors.items && <p className="mt-1 text-sm text-red-500">{errors.items}</p>}
            <Button type="button" variant="secondary" onClick={addItem} leftIcon={<PlusCircle size={16}/>}>Add Item</Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label={`Tax Rate (e.g., 0.05 for 5%)`} id="taxRate" type="number" value={taxRate.toString()} onChange={e => setTaxRate(parseFloat(e.target.value))} step="0.01" min="0" max="1" error={errors.taxRate}/>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
              <select id="status" value={status} onChange={e => setStatus(e.target.value as Invoice['status'])} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                disabled={!invoiceToEdit} // Status only editable for existing invoices
              >
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Paid">Paid</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>

          <Textarea label="Notes (optional)" id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
  
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => navigate(invoiceToEdit ? `/invoices/${invoiceToEdit.id}` : '/invoices')}>Cancel</Button>
            <Button type="submit" variant="primary">{invoiceToEdit ? 'Update Invoice' : 'Create Invoice'}</Button>
          </div>
        </form>
        <div className="bg-gray-50 p-2 rounded-lg shadow-inner overflow-y-auto max-h-[calc(100vh-12rem)] print-no-show"> 
          <h3 className="text-xl font-semibold text-gray-700 p-4 sticky top-0 bg-gray-50 z-10 border-b">Live Preview</h3>
          {currentInvoiceForPreview && findCustomerById(currentInvoiceForPreview.customerId) ? (
            <InvoicePreview invoice={currentInvoiceForPreview} customer={findCustomerById(currentInvoiceForPreview.customerId)!} />
          ): <div className="p-6 text-center text-gray-500">Please select a customer and add items to see the preview.</div>}
        </div>
      </div>
    );
  };
  
  const InvoicesListPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const filteredInvoices = invoices.filter(inv =>
      inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.status.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a,b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());

    const handleDelete = (invoiceId: string) => {
        if (window.confirm(`Are you sure you want to delete invoice ${invoiceId}? This action cannot be undone.`)) {
            deleteInvoice(invoiceId);
        }
    }

    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Invoices</h1>
          <Button onClick={() => navigate('/invoices/new')} leftIcon={<PlusCircle size={18} />}>Create New Invoice</Button>
        </div>
        <div className="mb-4">
          <Input 
            type="text" 
            placeholder="Search invoices by ID, customer name, or status..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="max-w-md"
          />
        </div>
        <div className="bg-white shadow overflow-x-auto rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvoices.length > 0 ? filteredInvoices.map(invoice => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer" onClick={() => navigate(`/invoices/${invoice.id}`)}>{invoice.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.customerName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{invoice.totalAmount.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      invoice.status === 'Paid' ? 'bg-green-100 text-green-800' :
                      invoice.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                      invoice.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800' // Draft
                    }`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/invoices/${invoice.id}`)} leftIcon={<FileText size={16}/>} aria-label={`View invoice ${invoice.id}`}>View</Button>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/invoices/edit/${invoice.id}`)} leftIcon={<Edit3 size={16}/>} aria-label={`Edit invoice ${invoice.id}`}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-100" onClick={() => handleDelete(invoice.id)} leftIcon={<Trash2 size={16}/>} aria-label={`Delete invoice ${invoice.id}`}>Delete</Button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No invoices found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  const InvoiceDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate(); 
    const invoice = findInvoiceById(id || '');
    const customer = invoice ? findCustomerById(invoice.customerId) : null;

    useEffect(() => { 
        if (!isLoading && id && (!invoice || !customer)) { 
            addNotification('Invoice or associated customer not found.', 'error');
            navigate('/invoices');
        }
    }, [id, invoice, customer, navigate, addNotification, isLoading]);


    if (!id) return <Navigate to="/invoices" />; 
    if (!invoice || !customer) { 
      return <div className="p-6 text-center text-gray-500">Loading invoice details or invoice not found...</div>;
    }

    const handlePrint = async () => {
      await exportToPdf('invoice-preview-content', `Invoice-${invoice.id}`);
      addNotification(`Invoice ${invoice.id} PDF export initiated.`, 'success');
    };

    const handleShareWhatsApp = () => {
      const targetPhone = customer.whatsapp || customer.phone;
      if (!targetPhone) {
        addNotification('Customer phone/WhatsApp number not available.', 'error');
        return;
      }
      const cleanedPhone = targetPhone.replace(/(?!^\+)[^\d]/g, '');
      
      const message = encodeURIComponent(`Hello ${customer.name},\n\nHere is your invoice ${invoice.id} for ₹${invoice.totalAmount.toFixed(2)}.\n\nThank you!\n${APP_NAME}`);
      const waLink = `https://wa.me/${cleanedPhone}?text=${message}`;
      window.open(waLink, '_blank');
      addNotification(`WhatsApp message prepared for ${customer.name}.`, 'info');
    };
    
    const handleUploadToDrive = () => {
      addNotification('Google Drive upload functionality is not yet implemented.', 'info');
    };

    const handleDeleteInvoiceAction = () => {
      if (window.confirm(`Are you sure you want to delete invoice ${invoice.id}? This action cannot be undone.`)) {
        deleteInvoice(invoice.id);
        navigate('/invoices');
      }
    };

    return (
      <div>
        <div className="mb-6 flex flex-wrap justify-between items-center gap-2 no-print">
            <Button variant="ghost" onClick={() => navigate('/invoices')} leftIcon={<ArrowLeft size={18}/>}>
              Back to Invoices
            </Button>
          <div className="flex flex-wrap space-x-2 gap-y-2">
            <Button onClick={() => navigate(`/invoices/edit/${invoice.id}`)} leftIcon={<Edit3 size={18}/>} variant="secondary">Edit Invoice</Button>
            <Button onClick={handlePrint} leftIcon={<Printer size={18}/>}>Export PDF</Button>
            <Button onClick={handleShareWhatsApp} leftIcon={<MessageSquare size={18}/>} variant="secondary">Share via WhatsApp</Button>
            <Button onClick={handleUploadToDrive} leftIcon={<UploadCloud size={18}/>} variant="secondary">Upload to Drive</Button>
            <Button onClick={handleDeleteInvoiceAction} leftIcon={<Trash2 size={18}/>} variant="danger">Delete Invoice</Button>
          </div>
        </div>
        <InvoicePreview invoice={invoice} customer={customer} />
      </div>
    );
  };

  const InvoiceEditorPage: React.FC = () => {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const invoiceToEdit = id ? findInvoiceById(id) : undefined;

    useEffect(() => {
        if (!isLoading && id && !invoiceToEdit) {
            addNotification('Invoice not found for editing.', 'error');
            navigate('/invoices');
        }
    }, [id, invoiceToEdit, navigate, addNotification, isLoading]);
    
    if (id && !invoiceToEdit && !isLoading) { 
         return <div className="p-6 text-center text-gray-500">Invoice not found. Redirecting...</div>;
    }
    if (isLoading && id) { 
        return <div className="p-6 text-center text-gray-500">Loading invoice data for editing...</div>;
    }
    
    const pageTitle = invoiceToEdit ? `Edit Invoice ${invoiceToEdit.id}` : "Create New Invoice";

    return (
      <div>
        <div className="flex items-center mb-6">
            <Button variant="ghost" onClick={() => navigate(invoiceToEdit ? `/invoices/${invoiceToEdit.id}` : '/invoices')} leftIcon={<ArrowLeft size={18}/>} className="mr-4">
              {invoiceToEdit ? 'Back to Invoice View' : 'Back to Invoices List'}
            </Button>
            <h1 className="text-3xl font-bold text-gray-800">{pageTitle}</h1>
        </div>
        <InvoiceForm
          invoiceToEdit={invoiceToEdit}
          onSave={addInvoice} 
          onUpdate={updateInvoice}
        />
      </div>
    );
  };
  
  const SettingsPage: React.FC = () => {
    const [currentSettings, setCurrentSettings] = useState<AppSettings>(settings); 
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        setCurrentSettings(settings);
    }, [settings]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      const numValue = name === 'nextInvoiceNumber' ? parseInt(value, 10) : 
                       name === 'defaultTaxRate' ? parseFloat(value) : value;

      setCurrentSettings(prev => ({
        ...prev,
        [name]: name === 'invoicePrefix' ? value : numValue,
      }));
    };
    
    const validateSettings = () => {
        const newErrors: Record<string, string> = {};
        if (!currentSettings.invoicePrefix.trim()) {
            newErrors.invoicePrefix = "Invoice prefix cannot be empty.";
        }
        if (isNaN(currentSettings.nextInvoiceNumber) || currentSettings.nextInvoiceNumber < 1) {
            newErrors.nextInvoiceNumber = "Next invoice number must be a positive integer.";
        }
        if (isNaN(currentSettings.defaultTaxRate) || currentSettings.defaultTaxRate < 0 || currentSettings.defaultTaxRate > 1) {
            newErrors.defaultTaxRate = "Default tax rate must be between 0 (0%) and 1 (100%).";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const handleSaveSettings = (e: React.FormEvent) => {
      e.preventDefault();
      if (!validateSettings()) {
          addNotification("Please correct the errors in settings.", "error");
          return;
      }
      setSettings(currentSettings); 
      addNotification('Settings saved successfully!', 'success');
    };
    
    const previewNextId = () => {
        const currentYear = new Date().getFullYear();
        const invoiceNumberStr = (currentSettings.nextInvoiceNumber || 1).toString().padStart(4, '0');
        return `${currentSettings.invoicePrefix || 'INV-'}${currentYear}-${invoiceNumberStr}`;
    }

    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Application Settings</h1>
        <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-lg shadow space-y-6 max-w-lg">
          <Input 
            label="Invoice Prefix" 
            id="invoicePrefix" 
            name="invoicePrefix" 
            value={currentSettings.invoicePrefix} 
            onChange={handleInputChange}
            error={errors.invoicePrefix}
          />
          <Input 
            label="Next Invoice Number" 
            id="nextInvoiceNumber" 
            name="nextInvoiceNumber" 
            type="number" 
            value={currentSettings.nextInvoiceNumber.toString()} 
            onChange={handleInputChange} 
            min="1"
            error={errors.nextInvoiceNumber}
          />
          <div className="text-sm text-gray-600">
            Preview of next invoice ID: <strong className="text-gray-700">{previewNextId()}</strong>
          </div>
          <Input 
            label="Default Tax Rate (e.g., 0.05 for 5%)" 
            id="defaultTaxRate" 
            name="defaultTaxRate" 
            type="number" 
            value={currentSettings.defaultTaxRate.toString()}
            onChange={handleInputChange} 
            step="0.001" 
            min="0" 
            max="1"
            error={errors.defaultTaxRate}
          />
          <div className="pt-2">
            <Button type="submit" leftIcon={<SettingsIcon size={18}/>}>Save Settings</Button>
          </div>
        </form>
      </div>
    );
  };

  const NavLink: React.FC<{ to: string; children: React.ReactNode; icon: React.ReactNode }> = ({ to, children, icon }) => {
    const location = useLocation(); 
    const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to) && location.pathname.split('/')[1] === to.split('/')[1]);

    return (
      <Link 
        to={to} 
        className={`flex items-center px-4 py-3 text-sm font-medium rounded-md group hover:bg-gray-700 hover:text-white transition-colors duration-150 ${
          isActive ? 'bg-gray-900 text-white shadow-inner' : 'text-gray-300'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className={`mr-3 h-5 w-5 ${isActive ? 'text-white': 'text-gray-400 group-hover:text-white'}`}>{icon}</span>
        {children}
      </Link>
    );
  };
  
  const handleDashboardAddCustomer = () => {
    appNavigate('/customers'); 
    addNotification("Navigate to Customers page and click 'Add New Customer'.", "info")
  };

   const NewDashboardPage: React.FC = () => { 
    const navigate = useNavigate();
    
    // Sales Overview Calculations
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const thisMonth = new Date();
    const lastMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 1);
    const thisMonthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
    
    const thisMonthInvoices = invoices.filter(inv => new Date(inv.invoiceDate) >= thisMonthStart);
    const lastMonthInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.invoiceDate);
      return invDate >= lastMonth && invDate < thisMonthStart;
    });
    
    const thisMonthRevenue = thisMonthInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const lastMonthRevenue = lastMonthInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const revenueGrowth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0;
    
    const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
    const pendingInvoices = invoices.filter(inv => inv.status === 'Draft' || inv.status === 'Sent');
    const overdueInvoices = invoices.filter(inv => inv.status === 'Overdue');
    
    const paidRevenue = paidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const pendingRevenue = pendingInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const overdueRevenue = overdueInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    
    const averageInvoiceValue = invoices.length > 0 ? totalRevenue / invoices.length : 0;
    
    return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Sales Dashboard</h1>
      
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h2 className="text-lg font-semibold text-gray-700">Total Revenue</h2>
          <p className="text-3xl font-bold text-green-600 mt-2">₹{totalRevenue.toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-1">All time</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h2 className="text-lg font-semibold text-gray-700">This Month</h2>
          <p className="text-3xl font-bold text-blue-600 mt-2">₹{thisMonthRevenue.toFixed(2)}</p>
          <p className={`text-sm mt-1 ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}% from last month
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h2 className="text-lg font-semibold text-gray-700">Average Invoice</h2>
          <p className="text-3xl font-bold text-purple-600 mt-2">₹{averageInvoiceValue.toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-1">Per invoice</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h2 className="text-lg font-semibold text-gray-700">Total Customers</h2>
          <p className="text-3xl font-bold text-indigo-600 mt-2">{customers.length}</p>
          <p className="text-sm text-gray-500 mt-1">Active clients</p>
        </div>
      </div>

      {/* Invoice Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Invoice Status Overview</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
                <span className="text-gray-700">Paid ({paidInvoices.length})</span>
              </div>
              <span className="font-semibold text-green-600">₹{paidRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-500 rounded mr-3"></div>
                <span className="text-gray-700">Pending ({pendingInvoices.length})</span>
              </div>
              <span className="font-semibold text-yellow-600">₹{pendingRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded mr-3"></div>
                <span className="text-gray-700">Overdue ({overdueInvoices.length})</span>
              </div>
              <span className="font-semibold text-red-600">₹{overdueRevenue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {invoices.slice(0, 5).map(invoice => (
              <div key={invoice.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="font-medium text-gray-800">{invoice.id}</p>
                  <p className="text-sm text-gray-500">{invoice.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-800">₹{invoice.totalAmount.toFixed(2)}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    invoice.status === 'Paid' ? 'bg-green-100 text-green-800' :
                    invoice.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                    invoice.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {invoice.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Button onClick={handleDashboardAddCustomer} leftIcon={<UserPlus size={18}/>}>Add Customer</Button>
          <Button onClick={() => navigate('/invoices/new')} leftIcon={<PlusCircle size={18}/>}>Create Invoice</Button>
          <Button onClick={() => navigate('/invoices')} variant="secondary">View All Invoices</Button>
          <Button onClick={() => navigate('/customers')} variant="secondary">Manage Customers</Button>
        </div>
      </div>
    </div>
  )};


  return (
      <> 
      <NotificationsContainer notifications={notifications} onDismiss={dismissNotification} />
      <div className="flex h-screen bg-gray-100">
        <div className="w-64 bg-gray-800 text-white flex-shrink-0 flex flex-col p-4 space-y-2 overflow-y-auto no-print">
          <div className="text-2xl font-semibold text-white py-4 px-2 mb-4 border-b border-gray-700 text-center">{APP_NAME}</div>
          <NavLink to="/" icon={<Home size={18}/>}>Dashboard</NavLink>
          <NavLink to="/customers" icon={<Users size={18}/>}>Customers</NavLink>
          <NavLink to="/invoices" icon={<FileText size={18}/>}>Invoices</NavLink>
          <NavLink to="/settings" icon={<SettingsIcon size={18}/>}>Settings</NavLink>
        </div>

        <main className="flex-1 p-6 overflow-y-auto">
          <Routes>
            <Route path="/" element={<NewDashboardPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/invoices" element={<InvoicesListPage />} />
            <Route path="/invoices/new" element={<InvoiceEditorPage />} />
            <Route path="/invoices/edit/:id" element={<InvoiceEditorPage />} />
            <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
      </>
  );
};

const AppWrapper: React.FC = () => (
  <HashRouter>
    <App />
  </HashRouter>
);

export default AppWrapper;
