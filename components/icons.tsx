import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ size = 18, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export const PlayIcon = (p: IconProps) => (
  <Icon {...p}><path d="M7 4.8v14.4a.8.8 0 0 0 1.2.7l11.5-7.2a.8.8 0 0 0 0-1.4L8.2 4.1a.8.8 0 0 0-1.2.7Z" fill="currentColor" stroke="none" /></Icon>
)
export const PauseIcon = (p: IconProps) => (
  <Icon {...p}><rect x="6" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none" /><rect x="14" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none" /></Icon>
)
export const RestartIcon = (p: IconProps) => (
  <Icon {...p}><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4.5h4.5" /></Icon>
)
export const MicIcon = (p: IconProps) => (
  <Icon {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></Icon>
)
export const FlipHIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 3v18" strokeDasharray="2 2.5" /><path d="M9 7 4 17h5V7ZM15 7l5 10h-5V7Z" /></Icon>
)
export const FlipVIcon = (p: IconProps) => (
  <Icon {...p}><path d="M3 12h18" strokeDasharray="2 2.5" /><path d="M7 9 17 4v5H7ZM7 15l10 5v-5H7Z" /></Icon>
)
export const RotateIcon = (p: IconProps) => (
  <Icon {...p}><path d="M20 12a8 8 0 1 1-2.4-5.7" /><path d="M20 4v4.5h-4.5" /></Icon>
)
export const PencilIcon = (p: IconProps) => (
  <Icon {...p}><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" /></Icon>
)
export const ParagraphIcon = (p: IconProps) => (
  <Icon {...p}><rect x="3.5" y="4" width="17" height="16" rx="3" /><path d="M7.5 9h9M7.5 12h9M7.5 15h5.5" /></Icon>
)
export const ScrollIcon = (p: IconProps) => (
  <Icon {...p}><path d="M5 6h14M5 10h14M5 14h9" /><path d="m16 17 2.5 3 2.5-3" /></Icon>
)
export const PlusIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>
)
export const MinusIcon = (p: IconProps) => (
  <Icon {...p}><path d="M5 12h14" /></Icon>
)
export const ChevronLeftIcon = (p: IconProps) => (
  <Icon {...p}><path d="m15 18-6-6 6-6" /></Icon>
)
export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}><path d="m9 18 6-6-6-6" /></Icon>
)
export const ChevronDownIcon = (p: IconProps) => (
  <Icon {...p}><path d="m6 9 6 6 6-6" /></Icon>
)
export const CloseIcon = (p: IconProps) => (
  <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>
)
export const SidebarIcon = (p: IconProps) => (
  <Icon {...p}><rect x="3" y="4.5" width="18" height="15" rx="3" /><path d="M3 9h18" /></Icon>
)
export const RefreshIcon = (p: IconProps) => (
  <Icon {...p}><path d="M20 11a8 8 0 0 0-14.3-4.3L4 8.5M4 13a8 8 0 0 0 14.3 4.3l1.7-1.8" /><path d="M4 4v4.5h4.5M20 20v-4.5h-4.5" /></Icon>
)
export const CopyIcon = (p: IconProps) => (
  <Icon {...p}><rect x="8.5" y="8.5" width="12" height="12" rx="2.5" /><path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5" /></Icon>
)
export const UploadIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5M4.5 14.5v3a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5v-3" /></Icon>
)
export const CodeIcon = (p: IconProps) => (
  <Icon {...p}><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" /></Icon>
)
export const CheckIcon = (p: IconProps) => (
  <Icon {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>
)
export const MonitorIcon = (p: IconProps) => (
  <Icon {...p}><rect x="2.5" y="4" width="19" height="13" rx="2.5" /><path d="M8.5 21h7M12 17v4" /></Icon>
)
export const PhoneIcon = (p: IconProps) => (
  <Icon {...p}><rect x="6.5" y="2.5" width="11" height="19" rx="2.8" /><path d="M10.5 18.5h3" /></Icon>
)
export const LockIcon = (p: IconProps) => (
  <Icon {...p}><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></Icon>
)
export const TrashIcon = (p: IconProps) => (
  <Icon {...p}><path d="M4 6.5h16M9.5 6.5V4.5h5v2M6.5 6.5l.9 12.6a1.8 1.8 0 0 0 1.8 1.7h5.6a1.8 1.8 0 0 0 1.8-1.7l.9-12.6" /></Icon>
)
export const ArrowRightIcon = (p: IconProps) => (
  <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>
)
export const WidthIcon = (p: IconProps) => (
  <Icon {...p}><path d="M3 12h18M6.5 8.5 3 12l3.5 3.5M17.5 8.5 21 12l-3.5 3.5" /></Icon>
)
export const SpeedIcon = (p: IconProps) => (
  <Icon {...p}><path d="M4.5 17a8.5 8.5 0 1 1 15 0" /><path d="m12 13 4-4.5" /></Icon>
)
export const HighlightIcon = (p: IconProps) => (
  <Icon {...p}><path d="M4 20h16" /><path d="m14.5 4.5 5 5L11 18H6v-5l8.5-8.5Z" /></Icon>
)
export const SyncIcon = (p: IconProps) => (
  <Icon {...p}><rect x="2.5" y="5" width="11" height="9" rx="2" /><rect x="15" y="8" width="6.5" height="11" rx="1.8" /><path d="M6 18h5" /></Icon>
)
export const SparkleIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 3.5 13.8 10l6.7 2-6.7 2L12 20.5 10.2 14l-6.7-2 6.7-2L12 3.5Z" /></Icon>
)
export const DocIcon = (p: IconProps) => (
  <Icon {...p}><path d="M14 3H7.5A2.5 2.5 0 0 0 5 5.5v13A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V8l-5-5Z" /><path d="M14 3v5h5M9 13h6M9 16.5h4" /></Icon>
)
export const KeyboardIcon = (p: IconProps) => (
  <Icon {...p}><rect x="2.5" y="6" width="19" height="12" rx="2.5" /><path d="M6.5 10h1M10.5 10h1M14.5 10h1M8 14h8" /></Icon>
)
