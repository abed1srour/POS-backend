-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id INT PRIMARY KEY AUTO_INCREMENT,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20) NOT NULL UNIQUE,
  address TEXT NOT NULL,
  role ENUM('admin', 'manager', 'cashier', 'sales', 'support') DEFAULT 'cashier',
  status ENUM('active', 'inactive', 'pending', 'suspended') DEFAULT 'active',
  daily_pay DECIMAL(10,2) NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  hire_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_phone (phone),
  INDEX idx_role (role),
  INDEX idx_status (status),
  INDEX idx_hire_date (hire_date)
);

-- Create employee_time_entries table
CREATE TABLE IF NOT EXISTS employee_time_entries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  date DATE NOT NULL,
  clock_in TIME NOT NULL,
  clock_out TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE KEY unique_employee_date (employee_id, date),
  INDEX idx_employee_id (employee_id),
  INDEX idx_date (date)
);

-- Create employee_withdrawals table
CREATE TABLE IF NOT EXISTS employee_withdrawals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_employee_id (employee_id),
  INDEX idx_date (date)
);

-- Insert sample employee data
INSERT INTO employees (first_name, last_name, email, phone, address, role, status, daily_pay, hourly_rate, hire_date) VALUES
('John', 'Doe', 'john.doe@example.com', '+1234567890', '123 Main St, City, State 12345', 'cashier', 'active', 90.00, 10.00, '2024-01-15'),
('Jane', 'Smith', 'jane.smith@example.com', '+1234567891', '456 Oak Ave, City, State 12345', 'manager', 'active', 120.00, 13.33, '2024-01-10'),
('Mike', 'Johnson', 'mike.johnson@example.com', '+1234567892', '789 Pine Rd, City, State 12345', 'sales', 'active', 85.00, 9.44, '2024-02-01'),
('Sarah', 'Williams', 'sarah.williams@example.com', '+1234567893', '321 Elm St, City, State 12345', 'cashier', 'active', 88.00, 9.78, '2024-02-15'),
('David', 'Brown', 'david.brown@example.com', '+1234567894', '654 Maple Dr, City, State 12345', 'support', 'active', 95.00, 10.56, '2024-03-01');

-- Insert sample time entries
INSERT INTO employee_time_entries (employee_id, date, clock_in, clock_out) VALUES
(1, CURDATE() - INTERVAL 6 DAY, '08:00', '17:00'),
(1, CURDATE() - INTERVAL 5 DAY, '08:15', '17:30'),
(1, CURDATE() - INTERVAL 4 DAY, '08:00', '17:00'),
(1, CURDATE() - INTERVAL 3 DAY, '08:30', '17:15'),
(1, CURDATE() - INTERVAL 2 DAY, '08:00', '17:00'),
(1, CURDATE() - INTERVAL 1 DAY, '08:00', '17:00'),
(2, CURDATE() - INTERVAL 6 DAY, '08:00', '17:00'),
(2, CURDATE() - INTERVAL 5 DAY, '08:00', '17:00'),
(2, CURDATE() - INTERVAL 4 DAY, '08:00', '17:00'),
(2, CURDATE() - INTERVAL 3 DAY, '08:00', '17:00'),
(2, CURDATE() - INTERVAL 2 DAY, '08:00', '17:00'),
(2, CURDATE() - INTERVAL 1 DAY, '08:00', '17:00');

-- Insert sample withdrawals
INSERT INTO employee_withdrawals (employee_id, amount, date, notes) VALUES
(1, 50.00, CURDATE() - INTERVAL 3 DAY, 'Advance payment'),
(1, 30.00, CURDATE() - INTERVAL 1 DAY, 'Emergency withdrawal'),
(2, 100.00, CURDATE() - INTERVAL 4 DAY, 'Monthly advance'),
(3, 25.00, CURDATE() - INTERVAL 2 DAY, 'Small advance');
