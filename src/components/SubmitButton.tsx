"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingText = "Saving…",
  className = "btn-primary",
  confirm,
  name,
  value,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  confirm?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) return e.preventDefault();
        // Mirror name/value into a hidden field: the submitter isn't reliably
        // included when a form with file inputs posts to a server action.
        const form = e.currentTarget.form;
        if (form && name) {
          let input = form.querySelector<HTMLInputElement>(`input[type=hidden][data-submitter="${name}"]`);
          if (!input) {
            input = document.createElement("input");
            input.type = "hidden";
            input.name = name;
            input.dataset.submitter = name;
            form.appendChild(input);
          }
          input.value = value ?? "";
        }
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}
