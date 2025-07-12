"use client"

import { motion } from "framer-motion"
import type { HTMLMotionProps } from "framer-motion"
import type React from "react"

interface MotionViewProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  delay?: number
}

export function MotionView({ children, delay = 0, ...props }: MotionViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay }}
      {...props}
    >
      {children}
    </motion.div>
  )
}
