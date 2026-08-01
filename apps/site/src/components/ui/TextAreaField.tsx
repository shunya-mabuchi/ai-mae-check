import {
  TextArea,
  TextField,
  type TextFieldProps
} from "react-aria-components/TextField";

export interface TextAreaFieldProps
  extends Omit<TextFieldProps, "children" | "className"> {
  ariaLabel: string;
  placeholder: string;
  className?: string;
}

export function TextAreaField({
  ariaLabel,
  placeholder,
  className = "",
  ...props
}: TextAreaFieldProps) {
  return (
    <TextField {...props} aria-label={ariaLabel} className="h-full">
      <TextArea
        className={`min-h-[320px] w-full resize-y bg-transparent p-2 text-sm leading-7 text-ink outline-none placeholder:text-slate-400 data-[focus-visible]:ring-2 data-[focus-visible]:ring-signal data-[focus-visible]:ring-offset-2 md:min-h-[480px] ${className}`}
        placeholder={placeholder}
      />
    </TextField>
  );
}
