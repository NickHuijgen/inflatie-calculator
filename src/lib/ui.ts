// Shared Tailwind class strings. Every focusable element needs a visible
// focus style (see Accessibility in AGENTS.md).

export const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700';
export const inputClass = 'block w-full rounded-md border border-gray-500 bg-white px-3 py-2 outline-none focus:outline-2 focus:outline-offset-1 focus:outline-blue-700';
export const labelClass = 'block mb-1 font-semibold text-gray-800';
export const hintClass = 'mt-1 text-sm text-gray-600';
export const linkClass = `text-blue-700 underline underline-offset-2 hover:no-underline ${focusRing}`;
export const cardClass = 'rounded-md border border-blue-200';
// A select draws its own chevron: the native arrow ignores padding and sits
// flush against the right border (macOS Chrome/Safari). appearance-none drops
// it; pr-10 keeps long option labels clear of the replacement.
export const selectClass = `${inputClass} appearance-none pr-10 bg-no-repeat bg-position-[right_0.75rem_center] bg-size-[1.25rem] bg-[url(data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2020%2020%27%20fill=%27none%27%20stroke=%27%23374151%27%20stroke-width=%271.5%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%3E%3Cpath%20d=%27M6%208l4%204%204-4%27/%3E%3C/svg%3E)]`;
