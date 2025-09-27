"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import type { MapboxLocation } from "@/lib/mapbox"
import { MapPin, Phone, Globe, Clock, Star, Heart, Share2, Navigation, Calendar, MessageCircle, X } from "lucide-react"

interface LocationDetailsProps {
  location: MapboxLocation
  isOpen: boolean
  onClose: () => void
}

export function LocationDetails({ location, isOpen, onClose }: LocationDetailsProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isFavorited, setIsFavorited] = useState(false)

  const portfolioImages = [
    location.image || "/placeholder.svg",
    "/fine-line-tattoo-1.png",
    "/botanical-tattoo-1.png",
    "/japanese-dragon-tattoo.png",
  ]

  const handleBook = () => {
    // TODO: Implement booking flow
    console.log("Book appointment with", location.name)
  }

  const handleMessage = () => {
    // TODO: Implement messaging
    console.log("Message", location.name)
  }

  const handleGetDirections = () => {
    const [lng, lat] = location.coordinates
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    window.open(url, "_blank")
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: location.name,
          text: `Check out ${location.name} on TattooMaps`,
          url: window.location.href,
        })
      } catch (error) {
        console.log("Error sharing:", error)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
    }
  }

  const handleFavorite = () => {
    setIsFavorited(!isFavorited)
    // TODO: Implement favorite functionality
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <DialogTitle className="text-xl font-bold">{location.name}</DialogTitle>
                <Badge variant={location.type === "artist" ? "default" : "secondary"}>{location.type}</Badge>
              </div>
              <div className="flex items-center gap-1 mb-2">
                <div className="flex items-center">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(location.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{location.rating}</span>
                <span className="text-sm text-gray-500">({location.reviewCount} reviews)</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{location.address}</span>
                {location.distance && (
                  <span className="text-gray-500">
                    •{" "}
                    {location.distance < 1
                      ? `${(location.distance * 5280).toFixed(0)} ft away`
                      : `${location.distance.toFixed(1)} mi away`}
                  </span>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Portfolio Gallery */}
          <div>
            <h3 className="font-semibold mb-3">Portfolio</h3>
            <Carousel className="w-full">
              <CarouselContent>
                {portfolioImages.map((image, index) => (
                  <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                    <div className="aspect-square">
                      <img
                        src={image || "/placeholder.svg"}
                        alt={`${location.name} portfolio ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">About</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{location.description}</p>
          </div>

          {/* Specialties */}
          <div>
            <h3 className="font-semibold mb-3">Specialties</h3>
            <div className="flex flex-wrap gap-2">
              {location.specialties.map((specialty) => (
                <Badge key={specialty} variant="outline">
                  {specialty}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Contact & Hours */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Info */}
            <div>
              <h3 className="font-semibold mb-3">Contact</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>(555) 123-4567</span>
                </div>
                {location.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <a
                      href={location.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-burgundy-600 hover:underline"
                    >
                      Visit Website
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Hours */}
            <div>
              <h3 className="font-semibold mb-3">Hours</h3>
              <div className="space-y-1">
                {Object.entries(location.hours).map(([day, hours]) => (
                  <div key={day} className="flex justify-between text-sm">
                    <span className="capitalize">{day}</span>
                    <span className="text-gray-600">{hours}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <Badge variant={location.isOpen ? "default" : "secondary"} className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {location.isOpen ? "Open Now" : "Closed"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h3 className="font-semibold mb-3">Pricing</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Price Range:</span>
              <div className="flex">
                {Array.from({ length: 3 }).map((_, i) => (
                  <span
                    key={i}
                    className={`text-sm ${
                      i < (location.priceRange === "low" ? 1 : location.priceRange === "medium" ? 2 : 3)
                        ? "text-green-600"
                        : "text-gray-300"
                    }`}
                  >
                    $
                  </span>
                ))}
              </div>
              <span className="text-sm text-gray-500 capitalize">({location.priceRange})</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <Button onClick={handleBook} className="flex-1 min-w-[120px]">
              <Calendar className="w-4 h-4 mr-2" />
              Book Appointment
            </Button>
            <Button variant="outline" onClick={handleMessage} className="flex-1 min-w-[120px] bg-transparent">
              <MessageCircle className="w-4 h-4 mr-2" />
              Message
            </Button>
            <Button variant="outline" onClick={handleGetDirections}>
              <Navigation className="w-4 h-4 mr-2" />
              Directions
            </Button>
            <Button
              variant="outline"
              onClick={handleFavorite}
              className={isFavorited ? "text-red-500 border-red-500" : ""}
            >
              <Heart className={`w-4 h-4 mr-2 ${isFavorited ? "fill-current" : ""}`} />
              {isFavorited ? "Favorited" : "Favorite"}
            </Button>
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
