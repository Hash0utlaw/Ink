import type { ReactNode } from "react"

interface ListingHeaderProps {
  /** "Tattoo artists", "Tattoo shops", "Search results". */
  title: string
  /** The searched place, in IM Fell italic after "near". */
  place?: string
  /** Replaces "near {place}", e.g. a name search. */
  suffix?: ReactNode
  /** "79 artists"; null while loading. */
  countLine?: string | null
  children?: ReactNode
}

/** A listing page's h1 ("Tattoo artists near Charlotte, NC") and its result count. */
export function ListingHeader({ title, place, suffix, countLine, children }: ListingHeaderProps) {
  return (
    <div className="mb-8 lg:mb-10">
      <h1 className="font-heading text-[34px] leading-[1.1] text-ink text-balance lg:text-[52px]">
        {title}
        {suffix ? (
          <> {suffix}</>
        ) : (
          place && (
            <>
              {" "}
              near <span className="font-place italic">{place}</span>
            </>
          )
        )}
      </h1>
      <p className="mt-2 min-h-[1.55em] text-base tabular-nums text-ink-muted lg:text-[19px]" aria-live="polite">
        {countLine}
      </p>
      {children}
    </div>
  )
}

/** "1 artist", "79 artists", "26,377 shops". */
export function countLabel(n: number, singular: string, plural = `${singular}s`) {
  return `${n.toLocaleString("en-US")} ${n === 1 ? singular : plural}`
}
