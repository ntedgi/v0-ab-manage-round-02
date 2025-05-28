"use client"

import { AlertCircle, CheckCircle2, Copy, ExternalLink } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function GitHubSetupGuide() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>GitHub Integration Setup</CardTitle>
        <CardDescription>Follow these steps to enable GitHub integration for deployment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Permission Error</AlertTitle>
          <AlertDescription>
            Your GitHub token doesn't have sufficient permissions to create pull requests. Please follow the steps below
            to fix this.
          </AlertDescription>
        </Alert>

        <Alert className="mb-4 bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Deployment Notice</AlertTitle>
          <AlertDescription className="text-yellow-700">
            When deploying to Vercel, you must add these environment variables in your Vercel project settings.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Create a GitHub Personal Access Token</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>
                Go to{" "}
                <a
                  href="https://github.com/settings/tokens/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  GitHub Token Settings
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>Give your token a descriptive name (e.g., "A/B Test Manager")</li>
              <li>
                Select the following scopes:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">repo</code> - Full control of private
                    repositories
                  </li>
                </ul>
              </li>
              <li>Click "Generate token" and copy the token</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. Update Environment Variables</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Add these environment variables to your Vercel project settings or .env.local file:
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <code className="text-sm">GITHUB_TOKEN=your_token_here</code>
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard("GITHUB_TOKEN=")}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <code className="text-sm">GITHUB_REPO_OWNER=ntedgi</code>
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard("GITHUB_REPO_OWNER=ntedgi")}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <code className="text-sm">GITHUB_REPO_NAME=v0-ab-manage-round-02</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard("GITHUB_REPO_NAME=v0-ab-manage-round-02")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. Verify Repository Access</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Ensure you have write access to the repository</li>
              <li>Check that the repository has a 'main' branch</li>
              <li>Verify that branch protection rules allow PR creation</li>
            </ul>
          </div>
        </div>

        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Alternative: Local-Only Mode</AlertTitle>
          <AlertDescription className="text-green-700">
            You can continue using the A/B Test Manager without GitHub integration. Your changes will be saved locally
            and you can manually copy the configuration when needed.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
