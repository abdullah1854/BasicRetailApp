# Database Setup Instructions

This document provides instructions for integrating your Retail Billing App with Supabase or other SQL databases for persistent data storage.

## Current State

The application currently uses browser localStorage for data persistence. This means:
- Data is stored locally in the user's browser
- Data is lost when browser storage is cleared
- No data synchronization across devices
- No real-time collaboration features

## Database Integration Options

### Option 1: Supabase (Recommended)

Supabase is a Firebase alternative built on PostgreSQL that provides:
- Real-time database
- Built-in authentication
- Auto-generated APIs
- Dashboard for data management

#### Setting Up Supabase

1. **Create a Supabase Account**
   - Go to [supabase.com](https://supabase.com)
   - Sign up for a free account
   - Create a new project

2. **Database Schema**
   
   Create the following tables in your Supabase SQL editor:

   ```sql
   -- Customers table
   CREATE TABLE customers (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     name TEXT NOT NULL,
     phone TEXT NOT NULL,
     whatsapp TEXT,
     email TEXT,
     address TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Invoices table
   CREATE TABLE invoices (
     id TEXT PRIMARY KEY,
     customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
     customer_name TEXT NOT NULL,
     invoice_date DATE NOT NULL,
     due_date DATE NOT NULL,
     sub_total DECIMAL(10,2) NOT NULL,
     tax_rate DECIMAL(5,4) NOT NULL,
     tax_amount DECIMAL(10,2) NOT NULL,
     total_amount DECIMAL(10,2) NOT NULL,
     status TEXT CHECK (status IN ('Draft', 'Sent', 'Paid', 'Overdue')) DEFAULT 'Draft',
     notes TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Invoice Items table
   CREATE TABLE invoice_items (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     invoice_id TEXT REFERENCES invoices(id) ON DELETE CASCADE,
     description TEXT NOT NULL,
     quantity DECIMAL(10,2) NOT NULL,
     unit_price DECIMAL(10,2) NOT NULL,
     total DECIMAL(10,2) NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- App Settings table
   CREATE TABLE app_settings (
     id INTEGER PRIMARY KEY DEFAULT 1,
     company_name TEXT NOT NULL DEFAULT 'My Retail Business',
     next_invoice_number INTEGER NOT NULL DEFAULT 1,
     invoice_prefix TEXT NOT NULL DEFAULT 'INV-',
     default_tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0.18,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     CONSTRAINT single_settings_row CHECK (id = 1)
   );

   -- Insert default settings
   INSERT INTO app_settings (company_name, next_invoice_number, invoice_prefix, default_tax_rate)
   VALUES ('My Retail Business', 1, 'INV-', 0.18)
   ON CONFLICT (id) DO NOTHING;

   -- Create indexes for better performance
   CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
   CREATE INDEX idx_invoices_date ON invoices(invoice_date);
   CREATE INDEX idx_invoices_status ON invoices(status);
   CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
   ```

3. **Row Level Security (RLS)**
   
   Enable RLS for secure access:

   ```sql
   -- Enable RLS on all tables
   ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
   ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
   ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
   ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

   -- Create policies (adjust based on your authentication needs)
   -- For now, allow all operations (you can restrict later)
   CREATE POLICY "Allow all operations on customers" ON customers FOR ALL USING (true);
   CREATE POLICY "Allow all operations on invoices" ON invoices FOR ALL USING (true);
   CREATE POLICY "Allow all operations on invoice_items" ON invoice_items FOR ALL USING (true);
   CREATE POLICY "Allow all operations on app_settings" ON app_settings FOR ALL USING (true);
   ```

4. **Get Database Credentials**
   - Go to Project Settings → Database
   - Copy your connection string and API keys
   - Note down the Project URL and anon/public key

#### Code Integration

1. **Install Supabase Client**
   ```bash
   npm install @supabase/supabase-js
   ```

2. **Create Database Service**
   
   Create `src/services/databaseService.ts`:

   ```typescript
   import { createClient } from '@supabase/supabase-js';
   import { Customer, Invoice, InvoiceItem, AppSettings } from '../types';

   const supabaseUrl = 'YOUR_SUPABASE_URL';
   const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

   export const supabase = createClient(supabaseUrl, supabaseAnonKey);

   // Customer operations
   export const getCustomers = async (): Promise<Customer[]> => {
     const { data, error } = await supabase
       .from('customers')
       .select('*')
       .order('name');
     
     if (error) throw error;
     return data || [];
   };

   export const createCustomer = async (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> => {
     const { data, error } = await supabase
       .from('customers')
       .insert([customer])
       .select()
       .single();
     
     if (error) throw error;
     return data;
   };

   export const updateCustomer = async (id: string, customer: Partial<Customer>): Promise<Customer> => {
     const { data, error } = await supabase
       .from('customers')
       .update({ ...customer, updated_at: new Date().toISOString() })
       .eq('id', id)
       .select()
       .single();
     
     if (error) throw error;
     return data;
   };

   export const deleteCustomer = async (id: string): Promise<void> => {
     const { error } = await supabase
       .from('customers')
       .delete()
       .eq('id', id);
     
     if (error) throw error;
   };

   // Invoice operations
   export const getInvoices = async (): Promise<Invoice[]> => {
     const { data, error } = await supabase
       .from('invoices')
       .select(`
         *,
         invoice_items (*)
       `)
       .order('created_at', { ascending: false });
     
     if (error) throw error;
     
     return data?.map(invoice => ({
       ...invoice,
       items: invoice.invoice_items || []
     })) || [];
   };

   export const createInvoice = async (invoice: Omit<Invoice, 'createdAt' | 'updatedAt'>, items: InvoiceItem[]): Promise<Invoice> => {
     const { data: invoiceData, error: invoiceError } = await supabase
       .from('invoices')
       .insert([{ ...invoice, items: undefined }])
       .select()
       .single();
     
     if (invoiceError) throw invoiceError;

     const { error: itemsError } = await supabase
       .from('invoice_items')
       .insert(items.map(item => ({ ...item, invoice_id: invoiceData.id })));
     
     if (itemsError) throw itemsError;

     return { ...invoiceData, items };
   };

   // Add more operations as needed...
   ```

3. **Update Storage Service**
   
   Modify `src/services/storageService.ts` to use database:

   ```typescript
   import { getCustomers, getInvoices, getSettings } from './databaseService';
   import { Customer, Invoice, AppSettings } from '../types';

   // Replace localStorage functions with database calls
   export const loadCustomers = async (): Promise<Customer[]> => {
     try {
       return await getCustomers();
     } catch (error) {
       console.error('Error loading customers:', error);
       return [];
     }
   };

   // Update other functions similarly...
   ```

### Option 2: PostgreSQL with Custom Backend

If you prefer a custom backend:

1. **Set up PostgreSQL database**
2. **Create Express.js/Node.js API server**
3. **Implement REST endpoints**
4. **Update frontend to call API endpoints**

### Option 3: MySQL/MariaDB

Similar to PostgreSQL but with MySQL syntax:

```sql
-- Example MySQL schema
CREATE TABLE customers (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  whatsapp VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Migration Strategy

### Step 1: Backup Current Data
```javascript
// Export current localStorage data
const backup = {
  customers: localStorage.getItem('customers'),
  invoices: localStorage.getItem('invoices'),
  settings: localStorage.getItem('settings')
};
console.log('Backup:', JSON.stringify(backup, null, 2));
```

### Step 2: Implement Database Layer
- Keep localStorage as fallback
- Implement database operations
- Add error handling and offline support

### Step 3: Data Migration
- Create migration script to move localStorage data to database
- Verify data integrity
- Switch to database-first approach

### Step 4: Remove localStorage Dependency
- Once confident in database implementation
- Remove localStorage fallbacks
- Clean up old code

## Environment Variables

Create a `.env` file in your project root:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Or for custom database
VITE_API_BASE_URL=http://localhost:3001/api
```

## Additional Features to Consider

1. **Real-time Updates**: Use Supabase subscriptions for live updates
2. **Authentication**: Add user authentication for multi-user support
3. **Backup & Restore**: Implement automated backups
4. **Analytics**: Track business metrics and growth
5. **Multi-company**: Support multiple businesses in one app
6. **API Integration**: Connect with accounting software or payment gateways

## Security Considerations

1. **Input Validation**: Validate all data before database operations
2. **SQL Injection**: Use parameterized queries
3. **Access Control**: Implement proper user permissions
4. **Data Encryption**: Encrypt sensitive data
5. **Regular Backups**: Implement automated backup strategy

## Testing

1. **Database Connection**: Test connection to your database
2. **CRUD Operations**: Test create, read, update, delete for all entities
3. **Data Integrity**: Ensure referential integrity is maintained
4. **Performance**: Test with larger datasets
5. **Error Handling**: Test error scenarios and recovery

## Support

For questions or issues:
1. Check Supabase documentation: [docs.supabase.com](https://docs.supabase.com)
2. Review PostgreSQL documentation for SQL queries
3. Test database operations in smaller increments
4. Consider implementing with localStorage fallback initially

Remember to keep your database credentials secure and never commit them to version control!