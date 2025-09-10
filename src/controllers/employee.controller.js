import { pool } from '../config/db.js';
import { validationResult } from 'express-validator';

// Get all employees
export const getAllEmployees = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        id,
        first_name,
        last_name,
        email,
        phone,
        address,
        role,
        status,
        daily_pay,
        hourly_rate,
        hire_date,
        created_at,
        updated_at
      FROM employees 
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employees'
    });
  }
};

// Get single employee
export const getEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await pool.query(`
      SELECT 
        id,
        first_name,
        last_name,
        email,
        phone,
        address,
        role,
        status,
        daily_pay,
        hourly_rate,
        hire_date,
        created_at,
        updated_at
      FROM employees 
      WHERE id = $1
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee'
    });
  }
};

// Create new employee
export const createEmployee = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      first_name,
      last_name,
      email,
      phone,
      address,
      role = 'worker',
      status = 'active',
      daily_pay,
      hourly_rate,
      hire_date
    } = req.body;

    // Check if email already exists
    if (email) {
      const { rows: existingEmail } = await pool.query(
        'SELECT id FROM employees WHERE email = $1',
        [email]
      );
      
      if (existingEmail.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Check if phone already exists
    if (phone) {
      const { rows: existingPhone } = await pool.query(
        'SELECT id FROM employees WHERE phone = $1',
        [phone]
      );
      
      if (existingPhone.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already exists'
        });
      }
    }

    const { rows: result } = await pool.query(`
      INSERT INTO employees (
        first_name, 
        last_name, 
        email, 
        phone, 
        address, 
        role, 
        status, 
        daily_pay, 
        hourly_rate, 
        hire_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      first_name,
      last_name,
      email || null,
      phone,
      address,
      role,
      status,
      daily_pay,
      hourly_rate,
      hire_date || new Date().toISOString().split('T')[0]
    ]);

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: result[0]
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create employee'
    });
  }
};

// Update employee
export const updateEmployee = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      phone,
      address,
      role,
      status,
      daily_pay,
      hourly_rate
    } = req.body;

    // Check if employee exists
    const { rows: existingEmployee } = await pool.query(
      'SELECT id FROM employees WHERE id = $1',
      [id]
    );

    if (existingEmployee.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if email already exists (excluding current employee)
    if (email) {
      const { rows: existingEmail } = await pool.query(
        'SELECT id FROM employees WHERE email = $1 AND id != $2',
        [email, id]
      );
      
      if (existingEmail.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Check if phone already exists (excluding current employee)
    if (phone) {
      const { rows: existingPhone } = await pool.query(
        'SELECT id FROM employees WHERE phone = $1 AND id != $2',
        [phone, id]
      );
      
      if (existingPhone.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already exists'
        });
      }
    }

    const { rows: updatedEmployee } = await pool.query(`
      UPDATE employees SET
        first_name = $1,
        last_name = $2,
        email = $3,
        phone = $4,
        address = $5,
        role = $6,
        status = $7,
        daily_pay = $8,
        hourly_rate = $9,
        updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `, [
      first_name,
      last_name,
      email || null,
      phone,
      address,
      role,
      status,
      daily_pay,
      hourly_rate,
      id
    ]);

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: updatedEmployee[0]
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update employee'
    });
  }
};

// Delete employee
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if employee exists
    const { rows: existingEmployee } = await pool.query(
      'SELECT id FROM employees WHERE id = $1',
      [id]
    );

    if (existingEmployee.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Delete related records first
    await pool.query('DELETE FROM employee_time_entries WHERE employee_id = $1', [id]);
    await pool.query('DELETE FROM employee_withdrawals WHERE employee_id = $1', [id]);
    
    // Delete employee
    await pool.query('DELETE FROM employees WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete employee'
    });
  }
};

// Time tracking methods
export const getTimeEntries = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await pool.query(`
      SELECT 
        id,
        employee_id,
        date,
        clock_in,
        clock_out,
        created_at,
        updated_at
      FROM employee_time_entries 
      WHERE employee_id = $1
      ORDER BY date DESC, created_at DESC
    `, [id]);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching time entries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch time entries'
    });
  }
};

export const addTimeEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, clock_in, clock_out } = req.body;

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(clock_in)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid clock in time format. Use HH:MM format'
      });
    }
    
    // Only validate clock_out if it's provided
    if (clock_out && !timeRegex.test(clock_out)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid clock out time format. Use HH:MM format'
      });
    }

    // Check if entry already exists for this date
    const { rows: existingEntry } = await pool.query(
      'SELECT id FROM employee_time_entries WHERE employee_id = $1 AND date = $2',
      [id, date]
    );

    if (existingEntry.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Time entry already exists for this date'
      });
    }

    const { rows: newEntry } = await pool.query(`
      INSERT INTO employee_time_entries (
        employee_id, 
        date, 
        clock_in, 
        clock_out
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [id, date, clock_in, clock_out]);

    res.status(201).json({
      success: true,
      message: 'Time entry added successfully',
      data: newEntry[0]
    });
  } catch (error) {
    console.error('Error adding time entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add time entry'
    });
  }
};

export const updateTimeEntry = async (req, res) => {
  try {
    const { id, entryId } = req.params;
    const { date, clock_in, clock_out } = req.body;

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(clock_in)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid clock in time format. Use HH:MM format'
      });
    }
    
    // Only validate clock_out if it's provided
    if (clock_out && !timeRegex.test(clock_out)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid clock out time format. Use HH:MM format'
      });
    }

    // Check if entry exists
    const { rows: existingEntry } = await pool.query(
      'SELECT id FROM employee_time_entries WHERE id = $1 AND employee_id = $2',
      [entryId, id]
    );

    if (existingEntry.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Time entry not found'
      });
    }

    const { rows: updatedEntry } = await pool.query(`
      UPDATE employee_time_entries SET
        date = $1,
        clock_in = $2,
        clock_out = $3,
        updated_at = NOW()
      WHERE id = $4 AND employee_id = $5
      RETURNING *
    `, [date, clock_in, clock_out, entryId, id]);

    res.json({
      success: true,
      message: 'Time entry updated successfully',
      data: updatedEntry[0]
    });
  } catch (error) {
    console.error('Error updating time entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update time entry'
    });
  }
};

export const deleteTimeEntry = async (req, res) => {
  try {
    const { id, entryId } = req.params;

    // Check if entry exists
    const { rows: existingEntry } = await pool.query(
      'SELECT id FROM employee_time_entries WHERE id = $1 AND employee_id = $2',
      [entryId, id]
    );

    if (existingEntry.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Time entry not found'
      });
    }

    await pool.query(
      'DELETE FROM employee_time_entries WHERE id = $1 AND employee_id = $2',
      [entryId, id]
    );

    res.json({
      success: true,
      message: 'Time entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting time entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete time entry'
    });
  }
};

// Withdrawal methods
export const getWithdrawals = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await pool.query(`
      SELECT 
        id,
        employee_id,
        amount,
        date,
        notes,
        created_at,
        updated_at
      FROM employee_withdrawals 
      WHERE employee_id = $1
      ORDER BY date DESC, created_at DESC
    `, [id]);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch withdrawals'
    });
  }
};

export const addWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, date, notes } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid withdrawal amount'
      });
    }

    const { rows: newWithdrawal } = await pool.query(`
      INSERT INTO employee_withdrawals (
        employee_id, 
        amount, 
        date, 
        notes
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [id, parseFloat(amount), date, notes || null]);

    res.status(201).json({
      success: true,
      message: 'Withdrawal added successfully',
      data: newWithdrawal[0]
    });
  } catch (error) {
    console.error('Error adding withdrawal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add withdrawal'
    });
  }
};

export const updateWithdrawal = async (req, res) => {
  try {
    const { id, withdrawalId } = req.params;
    const { amount, date, notes } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid withdrawal amount'
      });
    }

    // Check if withdrawal exists
    const { rows: existingWithdrawal } = await pool.query(
      'SELECT id FROM employee_withdrawals WHERE id = $1 AND employee_id = $2',
      [withdrawalId, id]
    );

    if (existingWithdrawal.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found'
      });
    }

    const { rows: updatedWithdrawal } = await pool.query(`
      UPDATE employee_withdrawals SET
        amount = $1,
        date = $2,
        notes = $3,
        updated_at = NOW()
      WHERE id = $4 AND employee_id = $5
      RETURNING *
    `, [parseFloat(amount), date, notes || null, withdrawalId, id]);

    res.json({
      success: true,
      message: 'Withdrawal updated successfully',
      data: updatedWithdrawal[0]
    });
  } catch (error) {
    console.error('Error updating withdrawal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update withdrawal'
    });
  }
};

export const deleteWithdrawal = async (req, res) => {
  try {
    const { id, withdrawalId } = req.params;

    // Check if withdrawal exists
    const { rows: existingWithdrawal } = await pool.query(
      'SELECT id FROM employee_withdrawals WHERE id = $1 AND employee_id = $2',
      [withdrawalId, id]
    );

    if (existingWithdrawal.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found'
      });
    }

    await pool.query(
      'DELETE FROM employee_withdrawals WHERE id = $1 AND employee_id = $2',
      [withdrawalId, id]
    );

    res.json({
      success: true,
      message: 'Withdrawal deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting withdrawal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete withdrawal'
    });
  }
};

// Payroll calculation
export const getPayrollReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    // Get employee info
    const { rows: employee } = await pool.query(
      'SELECT id, first_name, last_name, hourly_rate FROM employees WHERE id = $1',
      [id]
    );

    if (employee.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Get time entries for the period
    const { rows: timeEntries } = await pool.query(`
      SELECT date, clock_in, clock_out
      FROM employee_time_entries 
      WHERE employee_id = $1 
      AND date BETWEEN $2 AND $3
      ORDER BY date
    `, [id, start_date, end_date]);

    // Get withdrawals for the period
    const { rows: withdrawals } = await pool.query(`
      SELECT amount, date, notes
      FROM employee_withdrawals 
      WHERE employee_id = $1 
      AND date BETWEEN $2 AND $3
      ORDER BY date
    `, [id, start_date, end_date]);

    // Calculate totals
    let totalHours = 0;
    const dailyBreakdown = [];

    timeEntries.forEach(entry => {
      const [inHour, inMin] = entry.clock_in.split(':').map(Number);
      const [outHour, outMin] = entry.clock_out.split(':').map(Number);
      
      let hours = outHour - inHour;
      let minutes = outMin - inMin;
      
      if (minutes < 0) {
        hours -= 1;
        minutes += 60;
      }
      
      const dayHours = hours + (minutes / 60);
      totalHours += dayHours;

      dailyBreakdown.push({
        date: entry.date,
        clock_in: entry.clock_in,
        clock_out: entry.clock_out,
        hours: dayHours.toFixed(2),
        pay: (dayHours * employee[0].hourly_rate).toFixed(2)
      });
    });

    const totalPay = (totalHours * employee[0].hourly_rate).toFixed(2);
    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + parseFloat(w.amount), 0).toFixed(2);
    const netPay = (parseFloat(totalPay) - parseFloat(totalWithdrawals)).toFixed(2);

    res.json({
      success: true,
      data: {
        employee: employee[0],
        period: { start_date, end_date },
        summary: {
          total_hours: totalHours.toFixed(2),
          total_pay: totalPay,
          total_withdrawals: totalWithdrawals,
          net_pay: netPay
        },
        daily_breakdown: dailyBreakdown,
        withdrawals: withdrawals
      }
    });
  } catch (error) {
    console.error('Error generating payroll report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payroll report'
    });
  }
};
