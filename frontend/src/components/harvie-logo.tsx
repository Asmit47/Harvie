import { cn } from '@/lib/utils';

export function HarvieLogo({ className }: { className?: string }) {
  return (
    <span className={cn('harvie-wordmark', className)}>
      <span aria-hidden="true">harv</span>
      <span aria-hidden="true" className="harvie-wordmark-i">
        <span className="harvie-wordmark-stem" />
        <span className="harvie-i-dot" />
      </span>
      <span aria-hidden="true">e</span>
      <span className="sr-only">harvie</span>
    </span>
  );
}
