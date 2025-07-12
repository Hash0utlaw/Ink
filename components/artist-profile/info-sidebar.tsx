"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Clock, MapPin } from "lucide-react"

import type { Artist } from "@/types/artist"

const availableTimes = ["11:00 AM", "12:30 PM", "02:00 PM", "03:30 PM", "05:00 PM"]

export function InfoSidebar({ artist }: { artist: Artist }) {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  return (
    <div className="space-y-8 sticky top-20">
      <Card className="bg-muted/50 border-border/50">
        <CardHeader>
          <CardTitle>Book an Appointment</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar mode="single" selected={date} onSelect={setDate} className="p-0" />
          <div className="mt-4">
            <h4 className="font-semibold mb-2 text-sm">Select a time</h4>
            <div className="grid grid-cols-3 gap-2">
              {availableTimes.map((time) => (
                <Button
                  key={time}
                  variant={selectedTime === time ? "default" : "outline"}
                  onClick={() => setSelectedTime(time)}
                  className="text-xs"
                >
                  {time}
                </Button>
              ))}
            </div>
          </div>
          <Button className="w-full mt-6" disabled={!date || !selectedTime}>
            Request to Book
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-muted/50 border-border/50">
        <CardHeader>
          <CardTitle>Shop Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex gap-3">
            <MapPin className="w-4 h-4 mt-1 text-accent" />
            <div>
              <p className="font-semibold">{artist.shopName}</p>
              <p className="text-muted-foreground">{artist.location.address}</p>
              <p className="text-muted-foreground">{artist.location.city}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Clock className="w-4 h-4 mt-1 text-accent" />
            <div>
              <p className="font-semibold">Hours</p>
              <ul className="text-muted-foreground">
                {Object.entries(artist.hours).map(([day, hours]) => (
                  <li key={day}>
                    <span className="font-medium text-foreground">{day}:</span> {hours}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
