import { useFormContext, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

/**
 * FormField - Standardized form field component with error handling
 *
 * @param {string} name - Field name (must match schema)
 * @param {string} label - Field label
 * @param {string} type - Input type: text, email, password, number, textarea, select, checkbox, date
 * @param {string} placeholder - Placeholder text
 * @param {boolean} required - Show required indicator
 * @param {string} description - Help text below field
 * @param {Array} options - Options for select field [{value, label}]
 * @param {Object} validation - Additional validation rules
 * @param {boolean} disabled - Disable the field
 * @param {string} className - Additional classes for container
 */
export function FormField({
  name,
  label,
  type = 'text',
  placeholder,
  required = false,
  description,
  options = [],
  validation = {},
  disabled = false,
  className = '',
  ...props
}) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext();

  const error = errors[name];
  const errorMessage = error?.message;

  const fieldId = `field-${name}`;
  const descriptionId = description ? `${fieldId}-description` : undefined;
  const errorId = errorMessage ? `${fieldId}-error` : undefined;

  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <Textarea
            id={fieldId}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(error && 'border-red-500 focus-visible:ring-red-500')}
            aria-describedby={cn(descriptionId, errorId)}
            aria-invalid={!!error}
            {...register(name, validation)}
            {...props}
          />
        );

      case 'select':
        return (
          <Controller
            name={name}
            control={control}
            rules={validation}
            render={({ field }) => (
              <Select value={field.value || ''} onValueChange={field.onChange} disabled={disabled}>
                <SelectTrigger
                  id={fieldId}
                  className={cn(error && 'border-red-500 focus:ring-red-500')}
                  aria-describedby={cn(descriptionId, errorId)}
                  aria-invalid={!!error}
                >
                  <SelectValue placeholder={placeholder || 'Select...'} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        );

      case 'checkbox':
        return (
          <Controller
            name={name}
            control={control}
            rules={validation}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id={fieldId}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={disabled}
                  aria-describedby={cn(descriptionId, errorId)}
                  aria-invalid={!!error}
                />
                {label && (
                  <Label htmlFor={fieldId} className="font-normal cursor-pointer">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                )}
              </div>
            )}
          />
        );

      case 'date':
        return (
          <Input
            id={fieldId}
            type="date"
            placeholder={placeholder}
            disabled={disabled}
            className={cn(error && 'border-red-500 focus-visible:ring-red-500')}
            aria-describedby={cn(descriptionId, errorId)}
            aria-invalid={!!error}
            {...register(name, validation)}
            {...props}
          />
        );

      case 'number':
        return (
          <Input
            id={fieldId}
            type="number"
            placeholder={placeholder}
            disabled={disabled}
            className={cn(error && 'border-red-500 focus-visible:ring-red-500')}
            aria-describedby={cn(descriptionId, errorId)}
            aria-invalid={!!error}
            {...register(name, { ...validation, valueAsNumber: true })}
            {...props}
          />
        );

      default:
        return (
          <Input
            id={fieldId}
            type={type}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(error && 'border-red-500 focus-visible:ring-red-500')}
            aria-describedby={cn(descriptionId, errorId)}
            aria-invalid={!!error}
            {...register(name, validation)}
            {...props}
          />
        );
    }
  };

  // Checkbox has inline label, don't render separate label
  if (type === 'checkbox') {
    return (
      <div className={cn('space-y-1', className)}>
        {renderInput()}
        {description && (
          <p id={descriptionId} className="text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
        {errorMessage && (
          <p id={errorId} className="text-xs text-red-500" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label htmlFor={fieldId} className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      {renderInput()}
      {description && (
        <p id={descriptionId} className="text-xs text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
      {errorMessage && (
        <p id={errorId} className="text-xs text-red-500" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

/**
 * Form - Wrapper component that provides form context
 * Use with FormField components inside
 */
export function Form({ children, ...props }) {
  return <form {...props}>{children}</form>;
}

/**
 * FormSection - Visual grouping of related fields
 */
export function FormSection({ title, description, children, className = '' }) {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="pb-2 border-b border-gray-200 dark:border-gray-800">
          {title && <h3 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h3>}
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

/**
 * FormRow - Horizontal layout for multiple fields
 */
export function FormRow({ children, className = '' }) {
  return <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', className)}>{children}</div>;
}

/**
 * FormActions - Container for form action buttons
 */
export function FormActions({ children, className = '' }) {
  return (
    <div className={cn('flex items-center justify-end gap-3 pt-4 border-t', className)}>
      {children}
    </div>
  );
}

export default FormField;
