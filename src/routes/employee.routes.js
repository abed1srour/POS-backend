import express from 'express';
import { body } from 'express-validator';
import * as employeeController from '../controllers/employee.controller.js';
import { authRequired } from '../middleware/auth.middleware.js';

const router = express.Router();

// Validation middleware
const validateEmployee = [
  body('first_name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be between 1 and 50 characters'),
  body('last_name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be between 1 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email must be a valid email address'),
  body('phone')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Phone number is required and must be between 1 and 20 characters'),
  body('address')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Address is required and must be between 1 and 500 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'cashier', 'sales', 'support', 'worker'])
    .withMessage('Role must be one of: admin, manager, cashier, sales, support, worker'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'pending', 'suspended'])
    .withMessage('Status must be one of: active, inactive, pending, suspended'),
  body('daily_pay')
    .isFloat({ min: 0 })
    .withMessage('Daily pay must be a positive number'),
  body('hourly_rate')
    .isFloat({ min: 0 })
    .withMessage('Hourly rate must be a positive number'),
  body('hire_date')
    .optional()
    .isISO8601()
    .withMessage('Hire date must be a valid date')
];

const validateTimeEntry = [
  body('date')
    .isISO8601()
    .withMessage('Date must be a valid date'),
  body('clock_in')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Clock in time must be in HH:MM format'),
  body('clock_out')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Clock out time must be in HH:MM format')
];

const validateWithdrawal = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('date')
    .isISO8601()
    .withMessage('Date must be a valid date'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
];

// Apply authentication to all routes
router.use(authRequired);

// Employee CRUD routes
router.get('/', employeeController.getAllEmployees);
router.get('/:id', employeeController.getEmployee);
router.post('/', validateEmployee, employeeController.createEmployee);
router.put('/:id', validateEmployee, employeeController.updateEmployee);
router.delete('/:id', employeeController.deleteEmployee);

// Time tracking routes
router.get('/:id/time-entries', employeeController.getTimeEntries);
router.post('/:id/time-entries', validateTimeEntry, employeeController.addTimeEntry);
router.put('/:id/time-entries/:entryId', validateTimeEntry, employeeController.updateTimeEntry);
router.delete('/:id/time-entries/:entryId', employeeController.deleteTimeEntry);

// Withdrawal routes
router.get('/:id/withdrawals', employeeController.getWithdrawals);
router.post('/:id/withdrawals', validateWithdrawal, employeeController.addWithdrawal);
router.put('/:id/withdrawals/:withdrawalId', validateWithdrawal, employeeController.updateWithdrawal);
router.delete('/:id/withdrawals/:withdrawalId', employeeController.deleteWithdrawal);

// Payroll routes
router.get('/:id/payroll', employeeController.getPayrollReport);

export default router;
