"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type AdminSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingLabel?: string;
  confirmMessage?: string;
};

export function AdminSubmitButton({
  children,
  pendingLabel = "Enregistrement…",
  confirmMessage,
  onClick,
  ...props
}: AdminSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      disabled={pending || props.disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}