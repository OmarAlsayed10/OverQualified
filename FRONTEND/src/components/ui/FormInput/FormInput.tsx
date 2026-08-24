import { useRef } from 'react';
import { Box, Typography, TextField } from '@mui/material';
import type { FormInputProps } from './FormInput.types';
import FieldFormattingToolbar from '../FieldFormattingToolbar';
import formInput from './formInput.tokens';

const FormInput = ({
  label,
  labelAction,
  name,
  value,
  onChange,
  onBlur,
  onKeyDown,
  onPaste,
  error,
  helperText,
  placeholder,
  required,
  icon: Icon,
  multiline,
  minRows,
  formatting,
}: FormInputProps) => {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  return (
    <Box sx={formInput.wrapper}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="subtitle1" sx={formInput.label}>
          {label} {required && '*'}
        </Typography>
        {labelAction}
      </Box>

      <Box sx={formInput.row}>
        {Icon && (
          <Box sx={multiline ? formInput.iconWrapperMultiline : formInput.iconWrapper}>
            <Icon sx={formInput.icon} />
          </Box>
        )}
        <TextField
          inputRef={inputRef}
          fullWidth
          variant={multiline ? 'outlined' : 'standard'}
          name={name}
          value={value || ''}
          onChange={onChange}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          error={error}
          helperText={helperText}
          placeholder={placeholder}
          required={required}
          multiline={multiline}
          minRows={minRows}
          InputProps={!multiline ? { disableUnderline: true } : undefined}
          sx={multiline ? formInput.fieldMultiline : formInput.fieldStandard}
        />
      </Box>
      {formatting && (
        <FieldFormattingToolbar
          inputRef={inputRef}
          value={value || ''}
          onValueChange={formatting.onValueChange}
        />
      )}
    </Box>
  );
};

export default FormInput;
