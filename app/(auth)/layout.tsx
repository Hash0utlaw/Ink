import type React from "react"
import Link from "next/link"
import Image from "next/image"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary p-4">
      <div className="absolute top-8 left-8">
        <Link href="/" className="flex items-center space-x-2 text-foreground/80 hover:text-foreground">
          <Image src="/logo.png" alt="Inkfinder Logo" width={28} height={28} />
          <span className="font-bold">Inkfinder</span>
        </Link>
      </div>
      {children}
    </div>
  )
}
