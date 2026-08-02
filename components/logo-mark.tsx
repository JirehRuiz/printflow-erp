export default function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="36" height="36" rx="9" fill="#0B0D12" />
      {/* Four slightly offset dots referencing CMYK print registration marks */}
      <circle cx="15" cy="15" r="5.5" fill="#0EA5D6" fillOpacity="0.9" />
      <circle cx="20" cy="15" r="5.5" fill="#D6127E" fillOpacity="0.85" />
      <circle cx="17.5" cy="20" r="5.5" fill="#F4C21A" fillOpacity="0.9" />
      <circle cx="17.5" cy="17.2" r="1.6" fill="#F6F6F4" />
    </svg>
  );
}
