/**
 * UI primitives (PRD §5.1) — Button, Input, Select, Badge, Card.
 * Stubs à styler avec les tokens Tailwind (globals.css / design-system).
 */
import type { ReactNode } from "react";

export function Button({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props}>{children}</button>;
}
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}
export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props}>{children}</select>;
}
export function Badge({ children }: { children: ReactNode }) {
  return <span>{children}</span>;
}
export function Card({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}
