type Props = {
  variant: "sidebar" | "login" | "print";
};

/**
 * Two pre-cropped assets (both opaque white background, no CSS clipping):
 *  - logo-compact.png: icon + "SKYLAR ADVERTISING" only, no tagline —
 *    used in the sidebar where space is tight.
 *  - logo-full.png: icon + wordmark + tagline — used on the login screen
 *    and printed documents where there's room to show it in full.
 * Both are placed on a white card wherever the surrounding surface is dark
 * (sidebar, login), since the source art has an opaque white background.
 */
export default function CompanyLogo({ variant }: Props) {
  if (variant === "print") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/logo-full.png" alt="Skylar Advertising" className="h-16 w-auto" />;
  }

  if (variant === "login") {
    return (
      <div className="inline-flex justify-center rounded-xl bg-white p-4 shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-full.png" alt="Skylar Advertising" className="w-60 max-w-full" />
      </div>
    );
  }

  // sidebar
  return (
    <div className="flex justify-center rounded-lg bg-white px-3 py-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-compact.png" alt="Skylar Advertising" className="w-full" />
    </div>
  );
}
