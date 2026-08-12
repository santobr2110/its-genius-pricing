import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 24, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Smart Monitor — radar / pulso 24x7 */
export function MonitorIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="24" cy="24" r="18" />
      <circle cx="24" cy="24" r="11" />
      <circle cx="24" cy="24" r="4" />
      <path d="M24 6v6M24 36v6M6 24h6M36 24h6" />
      <circle cx="34" cy="14" r="1.6" fill="currentColor" />
    </Base>
  );
}

/** Smart Flow — nós conectados por setas (integração ITSM) */
export function FlowIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="4" y="18" width="12" height="12" rx="2" />
      <rect x="32" y="6" width="12" height="12" rx="2" />
      <rect x="32" y="30" width="12" height="12" rx="2" />
      <path d="M16 22l16-8M16 26l16 8" />
      <path d="M28 12l4 0M28 12l0 -3M28 36l4 0M28 36l0 3" />
    </Base>
  );
}

/** Smart Operation — headset (service desk humano) */
export function OperationIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M8 26v-3a16 16 0 0 1 32 0v3" />
      <rect x="6" y="26" width="8" height="12" rx="2" />
      <rect x="34" y="26" width="8" height="12" rx="2" />
      <path d="M38 38v2a4 4 0 0 1-4 4h-6" />
      <circle cx="24" cy="42" r="2" />
    </Base>
  );
}

/** Smart Performance — gauge / velocímetro (rotinas avançadas) */
export function PerformanceIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 32a18 18 0 0 1 36 0" />
      <path d="M24 32l10-12" />
      <circle cx="24" cy="32" r="2.4" fill="currentColor" />
      <path d="M10 32l-3 0M38 32l3 0M13 22l-2 -2M35 22l2 -2M24 14l0 -3" />
    </Base>
  );
}

/** Smart Enterprise — pilares / governança */
export function EnterpriseIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 18l18-10 18 10" />
      <path d="M8 18v20M40 18v20" />
      <path d="M14 20v16M24 20v16M34 20v16" />
      <path d="M4 40h40" />
      <path d="M8 44h32" />
    </Base>
  );
}

