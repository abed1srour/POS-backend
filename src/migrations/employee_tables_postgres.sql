-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20) NOT NULL UNIQUE,
  address TEXT NOT NULL,
  role VARCHAR(20) DEFAULT 'cashier' CHECK (role IN ('admin', 'manager', 'cashier', 'sales', 'support')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
  daily_pay DECIMAL(10,2) NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  hire_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create employee_time_entries table
CREATE TABLE IF NOT EXISTS employee_time_entries (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  date DATE NOT NULL,
  clock_in TIME NOT NULL,
  clock_out TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE (employee_id, date)
);

-- Create employee_withdrawals table
CREATE TABLE IF NOT EXISTS employee_withdrawals (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_phone ON employees(phone);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_hire_date ON employees(hire_date);

CREATE INDEX IF NOT EXISTS idx_time_entries_employee_id ON employee_time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON employee_time_entries(date);

CREATE INDEX IF NOT EXISTS idx_withdrawals_employee_id ON employee_withdrawals(employee_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_date ON employee_withdrawals(date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON employee_time_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON employee_withdrawals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample employee data
INSERT INTO employees (first_name, last_name, email, phone, address, role, status, daily_pay, hourly_rate, hire_date) VALUES
('John', 'Doe', 'john.doe@example.com', '+1234567890', '123 Main St, City, State 12345', 'cashier', 'active', 90.00, 10.00, '2024-01-15'),
('Jane', 'Smith', 'jane.smith@example.com', '+1234567891', '456 Oak Ave, City, State 12345', 'manager', 'active', 120.00, 13.33, '2024-01-10'),
('Mike', 'Johnson', 'mike.johnson@example.com', '+1234567892', '789 Pine Rd, City, State 12345', 'sales', 'active', 85.00, 9.44, '2024-02-01'),
('Sarah', 'Williams', 'sarah.williams@example.com', '+1234567893', '321 Elm St, City, State 12345', 'cashier', 'active', 88.00, 9.78, '2024-02-15'),
('David', 'Brown', 'david.brown@example.com', '+1234567894', '654 Maple Dr, City, State 12345', 'support', 'active', 95.00, 10.56, '2024-03-01')
ON CONFLICT (email) DO NOTHING;

-- Insert sample time entries
INSERT INTO employee_time_entries (employee_id, date, clock_in, clock_out) VALUES
(1, CURRENT_DATE - INTERVAL '6 days', '08:00', '17:00'),
(1, CURRENT_DATE - INTERVAL '5 days', '08:15', '17:30'),
(1, CURRENT_DATE - INTERVAL '4 days', '08:00', '17:00'),
(1, CURRENT_DATE - INTERVAL '3 days', '08:30', '17:15'),
(1, CURRENT_DATE - INTERVAL '2 days', '08:00', '17:00'),
(1, CURRENT_DATE - INTERVAL '1 day', '08:00', '17:00'),
(2, CURRENT_DATE - INTERVAL '6 days', '08:00', '17:00'),
(2, CURRENT_DATE - INTERVAL '5 days', '08:00', '17:00'),
(2, CURRENT_DATE - INTERVAL '4 days', '08:00', '17:00'),
(2, CURRENT_DATE - INTERVAL '3 days', '08:00', '17:00'),
(2, CURRENT_DATE - INTERVAL '2 days', '08:00', '17:00'),
(2, CURRENT_DATE - INTERVAL '1 day', '08:00', '17:00')
ON CONFLICT (employee_id, date) DO NOTHING;

-- Insert sample withdrawals
INSERT INTO employee_withdrawals (employee_id, amount, date, notes) VALUES
(1, 50.00, CURRENT_DATE - INTERVAL '3 days', 'Advance payment'),
(1, 30.00, CURRENT_DATE - INTERVAL '1 day', 'Emergency withdrawal'),
(2, 100.00, CURRENT_DATE - INTERVAL '4 days', 'Monthly advance'),
(3, 25.00, CURRENT_DATE - INTERVAL '2 days', 'Small advance');
