"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { RefreshCw, GitPullRequest } from "lucide-react"

interface GitHubSyncAlertProps {
  onSync: () => void
  isLoading?: boolean
}

export function GitHubSyncAlert({ onSync, isLoading }: GitHubSyncAlertProps) {
  return (
    <Alert className="bg-blue-50 border-blue-200">
      <GitPullRequest className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-800">GitHub Changes Detected</AlertTitle>
      <AlertDescription className="text-blue-700 flex items-center justify-between">
        <span>Changes have been made to the configuration in GitHub. Sync now to see the latest version.</span>
        <Button onClick={onSync} disabled={isLoading} size="sm" className="mt-2">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Sync Now
        </Button>
      </AlertDescription>
    </Alert>
  )
}
