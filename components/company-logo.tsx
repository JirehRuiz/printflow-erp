type Props = {
  variant: "sidebar" | "login" | "print";
};

/**
 * The logo file (public/logo.png) has an opaque white background and
 * includes icon + wordmark + tagline in one wide image. We treat it
 * differently depending on where it's placed:
 *  - sidebar: cropped to just icon+wordmark (tagline unreadable that small
 *    anyway), on a white card so it doesn't clash with the dark sidebar.
 *  - login: full lockup including tagline, on a white card on the dark bg.
 *  - print: used directly — the print page background is already white.
 */
export default function CompanyLogo({ variant }: Props) {
  if (variant === "print") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/logo.png" alt="Skylar Advertising" className="h-14 w-auto" />;
  }

  if (variant === "login") {
    return (
      <div className="inline-block rounded-xl bg-white p-4 shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Skylar Advertising" className="w-56 max-w-full" />
      </div>
    );
  }

  // sidebar: crop out the tagline band, keep just the icon + wordmark
  return (
    <div className="w-full overflow-hidden rounded-lg bg-white px-3 py-2">
      <div className="h-[52px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Skylar Advertising" className="w-full" />
      </div>
    </div>
  );
}
