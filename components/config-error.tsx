import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ConfigErrorProps {
  message?: string
}

export function ConfigError({ message }: ConfigErrorProps) {
  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Configuration Error</CardTitle>
          <CardDescription>Unable to load A/B test configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load configuration</AlertTitle>
            <AlertDescription className="mt-2">
              {message && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800">
                  <strong>Error:</strong> {message}
                </div>
              )}

              <p>There was an error loading the A/B test configuration. This could be due to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  The <code className="text-sm bg-muted px-1 py-0.5 rounded">ab.json</code> file is missing or invalid
                </li>
                <li>An error occurred while processing the configuration</li>
              </ul>
              <div className="mt-4">
                Please check:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>That the ab.json file exists in the project root</li>
                  <li>That the file contains valid JSON</li>
                  <li>
                    That the file has the correct structure with "default", "experiments", and "filters" properties
                  </li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
