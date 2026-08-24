import { ChangeEvent, ClipboardEventHandler, KeyboardEventHandler, ElementType, ReactNode } from 'react';

export interface FieldFormattingOptions {
  onValueChange: (formattedText: string) => void;
}

export interface FormInputProps {
  label: string;
  labelAction?: ReactNode;
  name?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur?: () => void;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
  onPaste?: ClipboardEventHandler<HTMLDivElement>;
  error?: boolean;
  helperText?: string;
  placeholder?: string;
  required?: boolean;
  icon?: ElementType;
  multiline?: boolean;
  minRows?: number;
  formatting?: FieldFormattingOptions;
}
