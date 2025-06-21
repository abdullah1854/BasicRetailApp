
import { Customer, Invoice, AppSettings } from '../types';
import { LOCAL_STORAGE_KEYS, DEFAULT_SETTINGS } from '../constants';

// Generic getter
const getItem = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage`, error);
    return defaultValue;
  }
};

// Generic setter
const setItem = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage`, error);
  }
};

// Customers
export const loadCustomers = (): Customer[] => getItem<Customer[]>(LOCAL_STORAGE_KEYS.CUSTOMERS, []);
export const saveCustomers = (customers: Customer[]): void => setItem<Customer[]>(LOCAL_STORAGE_KEYS.CUSTOMERS, customers);

// Invoices
export const loadInvoices = (): Invoice[] => getItem<Invoice[]>(LOCAL_STORAGE_KEYS.INVOICES, []);
export const saveInvoices = (invoices: Invoice[]): void => setItem<Invoice[]>(LOCAL_STORAGE_KEYS.INVOICES, invoices);

// Settings
export const loadSettings = (): AppSettings => getItem<AppSettings>(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
export const saveSettings = (settings: AppSettings): void => setItem<AppSettings>(LOCAL_STORAGE_KEYS.SETTINGS, settings);
    