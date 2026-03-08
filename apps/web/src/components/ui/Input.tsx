import type { InputHTMLAttributes } from "react"

type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: InputProps) {
  const baseClassName =
    "flex w-full items-center gap-2 self-stretch overflow-hidden text-ellipsis rounded-md border border-gray-300 bg-white px-3 py-2 text-base leading-6 font-normal text-gray-900 placeholder-shown:text-gray-500 placeholder:text-gray-500 shadow-xs focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-50 disabled:text-gray-500"

  return <input className={className ? `${baseClassName} ${className}` : baseClassName} {...props} />
}
