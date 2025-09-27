"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { MapboxLocation } from "@/lib/mapbox"
import { MapPin, Phone, Globe, Clock, Star, Heart, Share2, Navigation, Calendar, MessageCircle, X } from "lucide-react"

interface LocationDetailsProps {
  location: MapboxLocation
  isOpen: boolean
  onClose: () => void
}

export function LocationDetails({ location, isOpen, onClose }: LocationDetailsProps) {
  const [isFavorited, setIsFavorited] = useState(false)

  const portfolioImages = [
    location.image || "/tattoo-portfolio.jpg",
    "/fine-line-tattoo.jpg",
    "/botanical-tattoo.jpg",
    "/japanese-dragon-tattoo.png",
  ]

  const handleBook = () => {
    console.log("Book appointment with", location.name)
  }

  const handleMessage = () => {
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
      navigator.clipboard.writeText(window.location.href)
    }
  }

  const handleFavorite = () => {
    setIsFavorited(!isFavorited)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <DialogTitle className="text-2xl font-bold text-gray-900">{location.name}</DialogTitle>
                <Badge variant={location.type === "artist" ? "default" : "secondary"} className="text-sm">
                  {location.type}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(location.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-lg font-semibold">{location.rating}</span>
                <span className="text-gray-500">({location.reviewCount} reviews)</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-5 h-5" />
                <span className="text-lg">{location.address}</span>
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
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-8">
          {/* Portfolio Gallery */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">Portfolio</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {portfolioImages.map((image, index) => (
                  <div key={index} className="aspect-square">
                    <img
                      src={image || "/placeholder.svg"}
                      alt={`${location.name} portfolio ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg hover:scale-105 transition-transform cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-3">About</h3>
              <p className="text-gray-600 leading-relaxed">{location.description}</p>
            </CardContent>
          </Card>

          {/* Specialties */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">Specialties</h3>
              <div className="flex flex-wrap gap-2">
                {location.specialties.map((specialty) => (
                  <Badge key={specialty} variant="outline" className="text-sm py-1 px-3">
                    {specialty}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contact & Hours */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Info */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Contact</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <span className="text-lg">(555) 123-4567</span>
                  </div>
                  {location.website && (
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-gray-400" />
                      <a
                        href={location.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-burgundy-600 hover:underline text-lg"
                      >
                        Visit Website
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Hours */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Hours</h3>
                <div className="space-y-2">
                  {Object.entries(location.hours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between">
                      <span className="capitalize font-medium">{day}</span>
                      <span className="text-gray-600">{hours}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Badge variant={location.isOpen ? "default" : "secondary"} className="text-sm">
                    <Clock className="w-4 h-4 mr-2" />
                    {location.isOpen ? "Open Now" : "Closed"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Price Range */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">Pricing</h3>
              <div className="flex items-center gap-3">
                <span className="text-gray-600">Price Range:</span>
                <div className="flex">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span
                      key={i}
                      className={`text-xl ${
                        i < (location.priceRange === "low" ? 1 : location.priceRange === "medium" ? 2 : 3)
                          ? "text-green-600"
                          : "text-gray-300"
                      }`}
                    >
                      $
                    </span>
                  ))}
                </div>
                <span className="text-gray-500 capitalize">({location.priceRange})</span>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Button onClick={handleBook} className="col-span-2 md:col-span-2">
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Appointment
                </Button>
                <Button variant="outline" onClick={handleMessage}>
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
                  {isFavorited ? "Saved" : "Save"}
                </Button>
              </div>
              <Button variant="outline" onClick={handleShare} className="w-full mt-3 bg-transparent">
                <Share2 className="w-4 h-4 mr-2" />
                Share Location
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
