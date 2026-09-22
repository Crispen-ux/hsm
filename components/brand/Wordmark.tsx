import { EagleMark } from "@/components/brand/EagleMark";

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-3">
      <EagleMark className="h-7 w-11 shrink-0" />
      <span className="flex flex-col leading-none">
        <span className="display-wide text-chrome text-[1.35rem]">Hawk</span>
        <span className="display-narrow mt-1 text-[0.7rem] tracking-[0.18em] text-zinc-400">Mobile Rubberising</span>
      </span>
    </span>
  );
}
