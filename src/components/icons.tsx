import type { SVGProps } from 'react';

export function AppLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      aria-label="Offline Repair POS Logo"
      {...props}
    >
      <g fill="currentColor">
        <path d="M184,32H72a16,16,0,0,0-16,16V208a16,16,0,0,0,16,16H184a16,16,0,0,0,16-16V48A16,16,0,0,0,184,32Zm0,176H72V48H184Z" />
        <path d="M136,76h20a4,4,0,0,1,0,8H136a4,4,0,0,1,0-8Z" />
        <path d="M128,144.3l-13.8-10.3a8,8,0,0,1-1-12.7l28-37.3a8,8,0,0,1,13.6,8.2l-15.5,31.1,19,14.2a8,8,0,0,1-9,13.4l-21.3-16Z" />
        <path d="M112,180a4,4,0,0,1-4,4H88a4,4,0,0,1,0-8h20A4,4,0,0,1,112,180Z" />
        <path d="M168,180a4,4,0,0,1-4,4H144a4,4,0,0,1,0-8h20A4,4,0,0,1,168,180Z" />
      </g>
    </svg>
  );
}
