import type { SVGProps } from 'react';

type IconName =
  | 'add'
  | 'check'
  | 'download'
  | 'minus'
  | 'redo'
  | 'reset'
  | 'save'
  | 'trash'
  | 'undo'
  | 'upload'
  | 'warning'
  | 'zoomIn';

const paths: Record<IconName, React.ReactNode> = {
  add: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12 4 4L19 6" />,
  download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M5 19h14" /></>,
  minus: <path d="M5 12h14" />,
  redo: <><path d="m15 5 4 4-4 4" /><path d="M19 9h-8a6 6 0 0 0-6 6v2" /></>,
  reset: <><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8" /><path d="M4 4v4h4" /></>,
  save: <><path d="M5 3h12l2 2v16H5z" /><path d="M8 3v6h8V3M8 21v-7h8v7" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14" /><path d="M10 11v6m4-6v6" /></>,
  undo: <><path d="m9 5-4 4 4 4" /><path d="M5 9h8a6 6 0 0 1 6 6v2" /></>,
  upload: <><path d="M12 16V4m0 0L8 8m4-4 4 4" /><path d="M5 20h14" /></>,
  warning: <><path d="M12 3 2.5 20h19z" /><path d="M12 9v5m0 3h.01" /></>,
  zoomIn: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5M10.5 7.5v6m-3-3h6" /></>,
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
}

export function Icon({ name, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
