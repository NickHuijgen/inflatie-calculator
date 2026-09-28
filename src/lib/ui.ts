// Shared Tailwind class strings. Every focusable element needs a visible
// focus style (see Accessibility in AGENTS.md).

export const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700';
export const inputClass = 'block w-full rounded-md border border-gray-500 bg-white px-3 py-2 outline-none focus:outline-2 focus:outline-offset-1 focus:outline-blue-700';
export const labelClass = 'block mb-1 font-semibold text-gray-800';
export const hintClass = 'mt-1 text-sm text-gray-600';
export const linkClass = `text-blue-700 underline underline-offset-2 hover:no-underline ${focusRing}`;
export const cardClass = 'rounded-md border border-blue-200';
