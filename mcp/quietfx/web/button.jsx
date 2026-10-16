// The upstream SoundField only needs a native button and a forwarded ref.
/** @param {import('react').ComponentProps<'button'> & {variant?: string}} props */
export function Button({ variant: _variant, ...props }) {
  return <button type="button" {...props} />;
}
