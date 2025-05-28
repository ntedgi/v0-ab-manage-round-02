"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface Experiment {
  landingID: number
  landingName: string
  enabled: boolean
  userClusters?: number[]
  toggles: any
  sdkToggles: any
}

interface ExperimentListProps {
  experiments: Experiment[]
  onSync: () => void
  isLoading?: boolean
}

export function ExperimentList({ experiments, onSync, isLoading }: ExperimentListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Running Experiments</h2>
        <Button onClick={onSync} disabled={isLoading} variant="default">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Sync from GitHub
        </Button>
      </div>

      <div className="grid gap-4">
        {experiments.map((experiment) => (
          <Card key={experiment.landingID}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{experiment.landingName}</CardTitle>
                  <CardDescription>Landing ID: {experiment.landingID}</CardDescription>
                </div>
                <Badge variant={experiment.enabled ? "default" : "secondary"}>
                  {experiment.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {experiment.userClusters && experiment.userClusters.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">User Clusters:</h4>
                    <div className="flex flex-wrap gap-1">
                      {experiment.userClusters.map((cluster) => (
                        <Badge key={cluster} variant="outline" className="text-xs">
                          {cluster}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {Object.keys(experiment.toggles).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Toggles:</h4>
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                      {JSON.stringify(experiment.toggles, null, 2)}
                    </pre>
                  </div>
                )}

                {Object.keys(experiment.sdkToggles).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">SDK Toggles:</h4>
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                      {JSON.stringify(experiment.sdkToggles, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
