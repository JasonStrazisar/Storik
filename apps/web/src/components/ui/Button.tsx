import type { ButtonHTMLAttributes } from "react"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

export function Button({ className, ...props }: ButtonProps) {
  const baseClassName =
    "inline-flex items-center justify-center gap-1 rounded-lg border-2 border-[rgba(255,255,255,0.12)] bg-brand-600 px-3 py-2 text-sm leading-5 font-semibold not-italic text-white [font-family:Inter] shadow-[inset_0_0_0_1px_rgba(10,13,18,0.18),inset_0_-2px_0_0_rgba(10,13,18,0.05),0_1px_2px_0_rgba(10,13,18,0.05)] transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-500 disabled:cursor-not-allowed disabled:border disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-500 [&_svg]:size-5 [&_svg]:aspect-square [&_svg]:shrink-0 [&_svg]:text-brand-300"

  return <button className={className ? `${baseClassName} ${className}` : baseClassName} {...props} />
}
