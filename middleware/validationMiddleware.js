const { body, validationResult } = require('express-validator');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Registration validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .isIn(['admin', 'organisation', 'donar', 'hospital'])
    .withMessage('Invalid role'),
  body('phone')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('profilePic')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('Profile picture must be an image')
    .bail()
    .isLength({ max: 2800000 })
    .withMessage('Profile picture must be 2 MB or smaller')
    .bail()
    .matches(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/)
    .withMessage('Profile picture must be a JPEG, PNG, or WebP image')
    .bail()
    .custom(value => Buffer.from(value.slice(value.indexOf(',') + 1), 'base64').length <= 2 * 1024 * 1024)
    .withMessage('Profile picture must be 2 MB or smaller')
    .bail()
    .custom((value, { req }) => !value || ['donar', 'hospital'].includes(req.body.role))
    .withMessage('Profile pictures are only available for donors and hospitals'),
  body('address')
    .notEmpty()
    .withMessage('Address is required')
    .trim(),
  handleValidationErrors
];

// Login validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Inventory validation rules
const inventoryValidation = [
  body('inventoryType')
    .isIn(['in', 'out'])
    .withMessage('Inventory type must be either "in" or "out"'),
  body('bloodGroup')
    .isIn(['O+', 'O-', 'AB+', 'AB-', 'A+', 'A-', 'B+', 'B-'])
    .withMessage('Invalid blood group'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive number'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  handleValidationErrors
];

module.exports = {
  registerValidation,
  loginValidation,
  inventoryValidation,
  handleValidationErrors
};
