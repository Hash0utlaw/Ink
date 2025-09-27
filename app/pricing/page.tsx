"use client"

import { useState } from "react"
import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Calculator,
  DollarSign,
  Clock,
  Palette,
  MapPin,
  Star,
  TrendingUp,
  Users,
  Zap,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react"

export default function PricingGuidePage() {
  const [calculatorData, setCalculatorData] = useState({
    size: 2, // inches
    style: "",
    complexity: "medium",
    location: "arm",
    experience: "medium",
    sessions: 1,
  })

  const calculatePrice = () => {
    const basePrice = 150 // Base hourly rate

    // Size multiplier
    const sizeMultiplier =
      calculatorData.size <= 2 ? 1 : calculatorData.size <= 4 ? 1.5 : calculatorData.size <= 6 ? 2.5 : 4

    // Style multiplier
    const styleMultipliers: { [key: string]: number } = {
      "fine-line": 1.2,
      traditional: 1,
      realism: 1.8,
      japanese: 1.6,
      watercolor: 1.4,
      blackwork: 1.1,
      geometric: 1.3,
    }

    // Complexity multiplier
    const complexityMultipliers = {
      simple: 0.8,
      medium: 1,
      complex: 1.5,
    }

    // Experience multiplier
    const experienceMultipliers = {
      apprentice: 0.7,
      medium: 1,
      master: 1.8,
    }

    const styleMultiplier = styleMultipliers[calculatorData.style] || 1
    const complexityMultiplier = complexityMultipliers[calculatorData.complexity as keyof typeof complexityMultipliers]
    const experienceMultiplier = experienceMultipliers[calculatorData.experience as keyof typeof experienceMultipliers]

    const estimatedHours = Math.max(1, calculatorData.size * 0.5 * complexityMultiplier)
    const totalPrice =
      basePrice *
      sizeMultiplier *
      styleMultiplier *
      complexityMultiplier *
      experienceMultiplier *
      calculatorData.sessions

    return {
      hourlyRate: Math.round(basePrice * styleMultiplier * experienceMultiplier),
      estimatedHours: Math.round(estimatedHours * 10) / 10,
      totalPrice: Math.round(totalPrice),
      priceRange: {
        min: Math.round(totalPrice * 0.8),
        max: Math.round(totalPrice * 1.3),
      },
    }
  }

  const priceEstimate = calculatePrice()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 px-4 text-center bg-gradient-to-b from-background to-muted/20">
          <div className="container mx-auto max-w-4xl">
            <Badge variant="secondary" className="mb-4">
              <Info className="w-4 h-4 mr-2" />
              Complete Pricing Guide
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Tattoo Pricing Guide
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Understand tattoo costs, factors affecting pricing, and get accurate estimates for your next tattoo. Make
              informed decisions with our comprehensive pricing breakdown.
            </p>
          </div>
        </section>

        {/* Quick Price Calculator */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-3">
                <Calculator className="w-8 h-8 text-accent" />
                Price Calculator
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Get an instant estimate for your tattoo based on size, style, and complexity
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Calculator Inputs */}
              <Card className="pricing-calculator">
                <CardHeader>
                  <CardTitle>Tattoo Details</CardTitle>
                  <CardDescription>Adjust these factors to get your price estimate</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Size (inches): {calculatorData.size}"</Label>
                    <Slider
                      value={[calculatorData.size]}
                      onValueChange={(value) => setCalculatorData({ ...calculatorData, size: value[0] })}
                      max={12}
                      min={1}
                      step={0.5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1" (Small)</span>
                      <span>12" (Large)</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tattoo Style</Label>
                    <Select
                      value={calculatorData.style}
                      onValueChange={(value) => setCalculatorData({ ...calculatorData, style: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fine-line">Fine Line (+20%)</SelectItem>
                        <SelectItem value="traditional">Traditional (Base)</SelectItem>
                        <SelectItem value="realism">Realism (+80%)</SelectItem>
                        <SelectItem value="japanese">Japanese (+60%)</SelectItem>
                        <SelectItem value="watercolor">Watercolor (+40%)</SelectItem>
                        <SelectItem value="blackwork">Blackwork (+10%)</SelectItem>
                        <SelectItem value="geometric">Geometric (+30%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Complexity</Label>
                    <Select
                      value={calculatorData.complexity}
                      onValueChange={(value) => setCalculatorData({ ...calculatorData, complexity: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simple (-20%)</SelectItem>
                        <SelectItem value="medium">Medium (Base)</SelectItem>
                        <SelectItem value="complex">Complex (+50%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Artist Experience</Label>
                    <Select
                      value={calculatorData.experience}
                      onValueChange={(value) => setCalculatorData({ ...calculatorData, experience: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apprentice">Apprentice (-30%)</SelectItem>
                        <SelectItem value="medium">Experienced (Base)</SelectItem>
                        <SelectItem value="master">Master Artist (+80%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Number of Sessions: {calculatorData.sessions}</Label>
                    <Slider
                      value={[calculatorData.sessions]}
                      onValueChange={(value) => setCalculatorData({ ...calculatorData, sessions: value[0] })}
                      max={5}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Price Estimate */}
              <Card className="pricing-card-featured">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-accent" />
                    Price Estimate
                  </CardTitle>
                  <CardDescription>Based on your specifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center p-6 bg-accent/10 rounded-lg border border-accent/20">
                    <div className="text-4xl font-bold text-accent mb-2">
                      ${priceEstimate.priceRange.min} - ${priceEstimate.priceRange.max}
                    </div>
                    <p className="text-muted-foreground">Estimated Total Cost</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-semibold">${priceEstimate.hourlyRate}</div>
                      <p className="text-sm text-muted-foreground">Per Hour</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-semibold">{priceEstimate.estimatedHours}h</div>
                      <p className="text-sm text-muted-foreground">Est. Time</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Base Rate:</span>
                      <span>${Math.round(150 * (calculatorData.sessions || 1))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Size Factor:</span>
                      <span>
                        ×
                        {calculatorData.size <= 2
                          ? 1
                          : calculatorData.size <= 4
                            ? 1.5
                            : calculatorData.size <= 6
                              ? 2.5
                              : 4}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Style Factor:</span>
                      <span>
                        ×
                        {calculatorData.style
                          ? calculatorData.style === "realism"
                            ? 1.8
                            : calculatorData.style === "japanese"
                              ? 1.6
                              : 1.2
                          : 1}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2 font-semibold">
                      <span>Total Estimate:</span>
                      <span>${priceEstimate.totalPrice}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-yellow-500">Estimate Only</p>
                        <p className="text-muted-foreground">
                          Final prices may vary based on artist, location, and specific design requirements.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing Tiers */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Pricing Tiers</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Understanding the different price ranges in the tattoo industry
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Budget Tier */}
              <Card className="pricing-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-green-500">Budget</CardTitle>
                    <Badge variant="outline">$</Badge>
                  </div>
                  <CardDescription>$80 - $150 per hour</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold">
                    $80-150<span className="text-base font-normal text-muted-foreground">/hour</span>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Apprentice or newer artists
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Simple designs and flash work
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Basic traditional styles
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Smaller tattoos (under 4 inches)
                    </li>
                  </ul>
                  <Button variant="outline" className="w-full bg-transparent">
                    Find Budget Artists
                  </Button>
                </CardContent>
              </Card>

              {/* Mid-Range Tier */}
              <Card className="pricing-card pricing-card-featured">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-accent">Mid-Range</CardTitle>
                    <Badge>$$</Badge>
                  </div>
                  <CardDescription>$150 - $250 per hour</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold">
                    $150-250<span className="text-base font-normal text-muted-foreground">/hour</span>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent" />
                      Experienced artists (3-8 years)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent" />
                      Custom designs and consultations
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent" />
                      Multiple styles and techniques
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent" />
                      Medium to large pieces
                    </li>
                  </ul>
                  <Button className="w-full">Find Mid-Range Artists</Button>
                </CardContent>
              </Card>

              {/* Premium Tier */}
              <Card className="pricing-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-yellow-500">Premium</CardTitle>
                    <Badge variant="outline">$$$</Badge>
                  </div>
                  <CardDescription>$250+ per hour</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold">
                    $250+<span className="text-base font-normal text-muted-foreground">/hour</span>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-yellow-500" />
                      Master artists and celebrities
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-yellow-500" />
                      Highly detailed realism work
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-yellow-500" />
                      Award-winning portfolios
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-yellow-500" />
                      Exclusive and waitlisted artists
                    </li>
                  </ul>
                  <Button variant="outline" className="w-full bg-transparent">
                    Find Premium Artists
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Factors Affecting Price */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">What Affects Tattoo Pricing?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Multiple factors influence the final cost of your tattoo
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="pricing-step">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                    <Palette className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-semibold">Style & Complexity</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Realistic portraits and detailed work cost more than simple line work or traditional designs.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Fine Line:</span>
                    <span className="text-accent">+20%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Realism:</span>
                    <span className="text-accent">+80%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Traditional:</span>
                    <span className="text-muted-foreground">Base Rate</span>
                  </div>
                </div>
              </Card>

              <Card className="pricing-step">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-semibold">Size & Placement</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Larger tattoos and difficult body placements require more time and skill.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Small (1-2"):</span>
                    <span className="text-green-500">$100-300</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Medium (3-5"):</span>
                    <span className="text-yellow-500">$300-800</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Large (6"+):</span>
                    <span className="text-red-500">$800+</span>
                  </div>
                </div>
              </Card>

              <Card className="pricing-step">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                    <Star className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-semibold">Artist Experience</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Established artists with strong portfolios command higher rates.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Apprentice:</span>
                    <span className="text-green-500">$80-120/hr</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Experienced:</span>
                    <span className="text-yellow-500">$150-250/hr</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Master:</span>
                    <span className="text-red-500">$250+/hr</span>
                  </div>
                </div>
              </Card>

              <Card className="pricing-step">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-semibold">Time Required</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Most artists charge by the hour, with minimum session fees.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Minimum:</span>
                    <span className="text-accent">2-3 hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Session:</span>
                    <span className="text-accent">4-6 hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Large Pieces:</span>
                    <span className="text-accent">Multiple sessions</span>
                  </div>
                </div>
              </Card>

              <Card className="pricing-step">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-semibold">Location & Demand</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Urban areas and high-demand artists typically charge more.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Rural Areas:</span>
                    <span className="text-green-500">Lower rates</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Major Cities:</span>
                    <span className="text-yellow-500">Higher rates</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Celebrity Artists:</span>
                    <span className="text-red-500">Premium rates</span>
                  </div>
                </div>
              </Card>

              <Card className="pricing-step">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-semibold">Additional Costs</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Don't forget about consultation fees, touch-ups, and aftercare.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Consultation:</span>
                    <span className="text-accent">$50-150</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Design Fee:</span>
                    <span className="text-accent">$100-500</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Touch-ups:</span>
                    <span className="text-green-500">Often free</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Tips Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Money-Saving Tips</h2>
              <p className="text-muted-foreground">Smart strategies to get quality work within your budget</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-accent" />
                  Research Artists
                </h3>
                <p className="text-sm text-muted-foreground">
                  Look for artists whose style matches your vision. A perfect style match often means better value and
                  results.
                </p>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-accent" />
                  Book During Off-Peak
                </h3>
                <p className="text-sm text-muted-foreground">
                  Weekday appointments and off-season bookings may offer better rates and more artist availability.
                </p>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-accent" />
                  Consider Flash Work
                </h3>
                <p className="text-sm text-muted-foreground">
                  Pre-designed flash tattoos are typically less expensive than custom work and can still be high
                  quality.
                </p>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibent mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-accent" />
                  Plan for Multiple Sessions
                </h3>
                <p className="text-sm text-muted-foreground">
                  Large pieces done over multiple sessions allow you to budget over time and ensure the best quality
                  work.
                </p>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
