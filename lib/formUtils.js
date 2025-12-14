import { z } from 'zod';

/**
 * Common validation schemas for reuse across forms
 */
export const commonSchemas = {
  // Required string with min length
  requiredString: (fieldName = 'This field', minLength = 1) =>
    z
      .string()
      .min(minLength, `${fieldName} is required`)
      .max(255, `${fieldName} must be less than 255 characters`),

  // Optional string
  optionalString: () => z.string().optional().nullable(),

  // Email validation
  email: () =>
    z
      .string()
      .email('Please enter a valid email address')
      .max(255, 'Email must be less than 255 characters'),

  // Optional email
  optionalEmail: () =>
    z
      .string()
      .email('Please enter a valid email address')
      .max(255, 'Email must be less than 255 characters')
      .optional()
      .or(z.literal('')),

  // URL validation
  url: () => z.string().url('Please enter a valid URL').optional().or(z.literal('')),

  // Date validation
  date: () => z.coerce.date(),
  optionalDate: () => z.coerce.date().optional().nullable(),

  // Number validation
  positiveNumber: () => z.coerce.number().positive('Must be a positive number'),
  optionalNumber: () => z.coerce.number().optional().nullable(),

  // Boolean
  boolean: () => z.boolean().default(false),

  // Select/enum validation
  select: (options, fieldName = 'This field') =>
    z.enum(options, {
      errorMap: () => ({ message: `${fieldName} must be one of: ${options.join(', ')}` }),
    }),

  optionalSelect: (options) => z.enum(options).optional().nullable(),

  // Array validation
  stringArray: () => z.array(z.string()).default([]),
  optionalArray: () => z.array(z.string()).optional().nullable(),

  // UUID validation
  uuid: () => z.string().uuid('Invalid ID format'),
  optionalUuid: () => z.string().uuid('Invalid ID format').optional().nullable(),
};

/**
 * Pre-built schemas for common entities
 */
export const entitySchemas = {
  // Task form schema
  task: z.object({
    title: commonSchemas.requiredString('Title', 1),
    description: commonSchemas.optionalString(),
    status: commonSchemas.select(['todo', 'in_progress', 'review', 'done', 'blocked']),
    priority: commonSchemas.select(['low', 'medium', 'high', 'urgent']),
    due_date: commonSchemas.optionalDate(),
    assigned_to: commonSchemas.optionalEmail(),
    assignment_id: commonSchemas.optionalUuid(),
    project_id: commonSchemas.optionalUuid(),
    tags: commonSchemas.stringArray(),
  }),

  // Document form schema
  document: z.object({
    title: commonSchemas.requiredString('Title', 1),
    description: commonSchemas.optionalString(),
    content: commonSchemas.optionalString(),
    folder_path: commonSchemas.optionalString(),
    doc_type: commonSchemas.optionalSelect(['document', 'template', 'note', 'other']),
    assigned_to_project: commonSchemas.optionalUuid(),
    assigned_to_assignments: commonSchemas.optionalArray(),
  }),

  // Project form schema
  project: z.object({
    name: commonSchemas.requiredString('Project name', 1),
    description: commonSchemas.optionalString(),
    status: commonSchemas.optionalSelect([
      'planning',
      'active',
      'on_hold',
      'completed',
      'cancelled',
    ]),
    start_date: commonSchemas.optionalDate(),
    due_date: commonSchemas.optionalDate(),
    color: commonSchemas.optionalString(),
    icon: commonSchemas.optionalString(),
  }),

  // Assignment form schema
  assignment: z.object({
    name: commonSchemas.requiredString('Assignment name', 1),
    description: commonSchemas.optionalString(),
    status: commonSchemas.optionalSelect([
      'not_started',
      'in_progress',
      'review',
      'completed',
      'on_hold',
    ]),
    priority: commonSchemas.optionalSelect(['low', 'medium', 'high', 'urgent']),
    start_date: commonSchemas.optionalDate(),
    due_date: commonSchemas.optionalDate(),
    project_id: commonSchemas.optionalUuid(),
    assigned_to: commonSchemas.optionalEmail(),
  }),

  // User profile schema
  userProfile: z.object({
    full_name: commonSchemas.requiredString('Name', 2),
    email: commonSchemas.email(),
    user_role: commonSchemas.optionalSelect(['owner', 'admin', 'member', 'viewer']),
    bio: commonSchemas.optionalString(),
    avatar_url: commonSchemas.url(),
  }),

  // Session save schema
  chatSession: z.object({
    name: commonSchemas.requiredString('Session name', 1),
    description: commonSchemas.optionalString(),
  }),
};

/**
 * Transform form data to API format
 * Handles null/undefined conversion, date formatting, etc.
 *
 * @param {Object} data - Form data to transform
 * @param {Object} schema - Zod schema for validation
 * @returns {Object} Transformed data ready for API
 */
export function transformFormData(data, schema) {
  // Validate with Zod first
  const parsed = schema.safeParse(data);

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const transformed = { ...parsed.data };

  // Convert empty strings to null for optional fields
  Object.keys(transformed).forEach((key) => {
    if (transformed[key] === '') {
      transformed[key] = null;
    }
  });

  return transformed;
}

/**
 * Extract default values from a Zod schema
 * Useful for initializing forms with proper defaults
 *
 * @param {Object} schema - Zod schema
 * @returns {Object} Default values object
 */
export function getSchemaDefaults(schema) {
  const shape = schema.shape || schema._def.shape?.();

  if (!shape) return {};

  const defaults = {};

  Object.keys(shape).forEach((key) => {
    const field = shape[key];
    const def = field._def;

    // Check for default value
    if (def.defaultValue !== undefined) {
      defaults[key] =
        typeof def.defaultValue === 'function' ? def.defaultValue() : def.defaultValue;
    } else if (def.typeName === 'ZodOptional' || def.typeName === 'ZodNullable') {
      defaults[key] = null;
    } else if (def.typeName === 'ZodBoolean') {
      defaults[key] = false;
    } else if (def.typeName === 'ZodArray') {
      defaults[key] = [];
    } else if (def.typeName === 'ZodString') {
      defaults[key] = '';
    } else if (def.typeName === 'ZodNumber') {
      defaults[key] = 0;
    }
  });

  return defaults;
}

/**
 * Create error map from Zod errors for use with form state
 *
 * @param {Object} zodError - Zod validation error
 * @returns {Object} Map of field names to error messages
 */
export function zodErrorToFieldErrors(zodError) {
  if (!zodError?.issues) return {};

  return zodError.issues.reduce((acc, issue) => {
    const path = issue.path.join('.');
    if (!acc[path]) {
      acc[path] = issue.message;
    }
    return acc;
  }, {});
}

export default {
  commonSchemas,
  entitySchemas,
  transformFormData,
  getSchemaDefaults,
  zodErrorToFieldErrors,
};
