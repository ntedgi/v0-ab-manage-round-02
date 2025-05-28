"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { X, Plus } from "lucide-react"

interface ExperimentFormProps {
  onSubmit: (experiment: any) => void
  defaultConfig?: any
}

export function ExperimentForm({ onSubmit, defaultConfig }: ExperimentFormProps) {
  const [formData, setFormData] = useState({
    landingName: "",
    enabled: true,
    userClusters: [] as number[],
    toggles: "{}",
    sdkToggles: "{}",
  })

  const [newCluster, setNewCluster] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const experiment = {
        ...formData,
        toggles: JSON.parse(formData.toggles || "{}"),
        sdkToggles: JSON.parse(formData.sdkToggles || "{}"),
      }
      onSubmit(experiment)

      // Reset form after successful submission
      setFormData({
        landingName: "",
        enabled: true,
        userClusters: [],
        toggles: "{}",
        sdkToggles: "{}",
      })
    } catch (error) {
      alert("Invalid JSON in toggles or sdkToggles")
    }
  }

  const addUserCluster = () => {
    const cluster = Number.parseInt(newCluster)
    if (!isNaN(cluster) && !formData.userClusters.includes(cluster)) {
      setFormData((prev) => ({
        ...prev,
        userClusters: [...prev.userClusters, cluster].sort((a, b) => a - b),
      }))
      setNewCluster("")
    }
  }

  const removeUserCluster = (cluster: number) => {
    setFormData((prev) => ({
      ...prev,
      userClusters: prev.userClusters.filter((c) => c !== cluster),
    }))
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Create New Experiment</CardTitle>
        <CardDescription>
          Define a new A/B test experiment. Missing fields will use default configuration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="landingName">Experiment Name</Label>
            <Input
              id="landingName"
              value={formData.landingName}
              onChange={(e) => setFormData((prev) => ({ ...prev, landingName: e.target.value }))}
              placeholder="e.g., Test new checkout flow"
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="enabled"
              checked={formData.enabled}
              onCheckedChange={(enabled) => setFormData((prev) => ({ ...prev, enabled }))}
            />
            <Label htmlFor="enabled">Enabled</Label>
          </div>

          <div className="space-y-2">
            <Label>User Clusters</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={newCluster}
                onChange={(e) => setNewCluster(e.target.value)}
                placeholder="Enter cluster number"
                className="flex-1"
              />
              <Button type="button" onClick={addUserCluster} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.userClusters.map((cluster) => (
                <Badge key={cluster} variant="secondary" className="flex items-center gap-1">
                  {cluster}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => removeUserCluster(cluster)} />
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="toggles">Toggles (JSON)</Label>
            <Textarea
              id="toggles"
              value={formData.toggles}
              onChange={(e) => setFormData((prev) => ({ ...prev, toggles: e.target.value }))}
              placeholder='{"featureFlag": true, "threshold": 0.5}'
              className="font-mono text-sm"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sdkToggles">SDK Toggles (JSON)</Label>
            <Textarea
              id="sdkToggles"
              value={formData.sdkToggles}
              onChange={(e) => setFormData((prev) => ({ ...prev, sdkToggles: e.target.value }))}
              placeholder='{"both": {}, "ios": {}, "android": {}}'
              className="font-mono text-sm"
              rows={4}
            />
          </div>

          <Button type="submit" className="w-full">
            Create Experiment
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
