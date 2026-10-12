import { ALL_STYLES } from "@/app/styles/page"
import { SHARE_IMAGE_SIZE, SHARE_IMAGE_TYPE, shareImage } from "@/lib/og/share-image"
import { exactMasterSlug } from "@/lib/style-guide"

export const alt = "Tattoo style guide on TattooMaps"
export const size = SHARE_IMAGE_SIZE
export const contentType = SHARE_IMAGE_TYPE

export default async function StyleShareImage({ params }: { params: { styleName: string } }) {
  const style = ALL_STYLES.find((s) => s.slug === params.styleName)
  if (!style) return shareImage({ title: "Tattoo styles", line: "Find a tattoo artist near you." })
  return shareImage({
    title: `${style.name} tattoos`,
    line: `Find ${style.name.toLowerCase()} tattoo artists near you.`,
    styleSlug: exactMasterSlug(style.slug),
  })
}
