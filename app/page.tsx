"use client"

import { useState, useEffect } from "react"
import { ExperimentForm } from "@/components/experiment-form"
import { ExperimentList } from "@/components/experiment-list"
import { DiffViewer } from "@/components/diff-viewer"
import { GitHubSetupGuide } from "@/components/github-setup-guide"
import { GitHubSyncAlert } from "@/components/github-sync-alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GitPullRequest, Loader2, AlertCircle, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ConfigError } from "@/components/config-error"

interface ABConfig {
  default: any
  experiments: any[]
  filters: any[]
}

export default function ABTestManager() {
  const [config, setConfig] = useState<ABConfig | null>(null)
  const [diff, setDiff] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingPR, setIsCreatingPR] = useState(false)
  const [lastCreatedExperiment, setLastCreatedExperiment] = useState<string>("")
  const [configError, setConfigError] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [showGitHubGuide, setShowGitHubGuide] = useState(false)
  const [githubChangesDetected, setGithubChangesDetected] = useState(false)
  const [lastLoadedConfig, setLastLoadedConfig] = useState<string>("")
  const { toast } = useToast()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [prError, setPrError] = useState<string | null>(null)

  useEffect(() => {
    loadExperiments()
    handleDeploymentIssues()

    // Set up an interval to check for changes every 30 seconds
    const intervalId = setInterval(() => {
      checkForChanges()
    }, 30000)

    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId)
  }, [])

  const checkForChanges = async () => {
    try {
      const response = await fetch(`/api/experiments?check=true`)
      if (response.ok) {
        const data = await response.json()
        const configString = JSON.stringify(data)

        if (lastLoadedConfig && configString !== lastLoadedConfig) {
          setGithubChangesDetected(true)
        }
      }
    } catch (error) {
      console.error("Error checking for changes:", error)
    }
  }

  const loadExperiments = async (sync = false) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/experiments${sync ? "?sync=true" : ""}`)

      if (!response.ok) {
        const contentType = response.headers.get("content-type")

        if (contentType && contentType.includes("application/json")) {
          const error = await response.json()
          setErrorMessage(error.error || "Failed to load experiments")
        } else {
          const text = await response.text()
          setErrorMessage(`Server error: ${response.status} ${response.statusText}`)
          console.error("Server returned non-JSON response:", text.substring(0, 500) + "...")
        }

        setConfigError(true)
        throw new Error("API request failed")
      }

      const data = await response.json()
      setConfig(data)
      setLastLoadedConfig(JSON.stringify(data))
      setGithubChangesDetected(false)
      setConfigError(false)

      if (sync) {
        toast({
          title: "Synced successfully",
          description: `Found ${data.experiments.length} experiments`,
        })
      }
    } catch (error) {
      console.error("Load Error:", error)
      setConfigError(true)

      if (!errorMessage) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load experiments")
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const createExperiment = async (experimentData: any) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(experimentData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create experiment")
      }

      const { experiment, config: newConfig } = await response.json()
      setConfig(newConfig)
      setLastLoadedConfig(JSON.stringify(newConfig))
      setLastCreatedExperiment(experiment.landingName)

      const diffResponse = await fetch("/api/experiments/diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldConfig: config,
          newConfig,
          experimentName: experiment.landingName,
        }),
      })

      if (diffResponse.ok) {
        const diffData = await diffResponse.json()
        setDiff(diffData.diff)
        setHasUnsavedChanges(true)
      }

      toast({
        title: "Experiment created",
        description: `${experiment.landingName} has been created successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create experiment",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const createPullRequest = async () => {
    if (!config || !lastCreatedExperiment) return

    setIsCreatingPR(true)
    setShowGitHubGuide(false)
    setPrError(null)

    try {
      const response = await fetch("/api/github/pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          experimentName: lastCreatedExperiment,
        }),
      })

      // Check if the response is JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        // Handle non-JSON response
        const text = await response.text()
        console.error("Non-JSON response:", text.substring(0, 500) + "...")
        throw new Error("Server returned an invalid response. Please try again later.")
      }

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403) {
          setShowGitHubGuide(true)
          toast({
            title: "GitHub Permission Error",
            description: "Please check the setup guide for instructions on fixing this issue.",
            variant: "destructive",
          })
          return
        }

        if (data.missingVars) {
          const missing = Object.keys(data.missingVars).filter((key) => data.missingVars[key])
          toast({
            title: "GitHub Configuration Error",
            description: `Missing environment variables: ${missing.join(", ")}`,
            variant: "destructive",
            duration: 10000,
          })
          setShowGitHubGuide(true)
          return
        }

        throw new Error(data.error || data.message || "Failed to create pull request")
      }

      const { pullRequest } = data
      toast({
        title: "Pull Request created",
        description: `PR #${pullRequest.number} has been created`,
      })

      window.open(pullRequest.url, "_blank")
      setHasUnsavedChanges(false)
      setDiff(null)
    } catch (error) {
      console.error("PR Creation Error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to create pull request"
      setPrError(errorMessage)
      toast({
        title: "Error Creating Pull Request",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsCreatingPR(false)
    }
  }

  const downloadConfig = () => {
    if (!config) return

    const dataStr = JSON.stringify(config, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)

    const exportFileDefaultName = `ab-config-${new Date().toISOString().split("T")[0]}.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  const handleDeploymentIssues = () => {
    // Check if we're in a deployment environment
    const isDeployment = typeof window !== "undefined" && window.location.hostname !== "localhost"

    if (isDeployment) {
      toast({
        title: "Deployment Notice",
        description:
          "When deploying, make sure to set GITHUB_TOKEN, GITHUB_REPO_OWNER, and GITHUB_REPO_NAME in your environment variables.",
        duration: 10000,
      })
    }
  }

  if (isLoading && !config) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold">Loading experiments...</h2>
        </div>
      </div>
    )
  }

  if (configError) {
    return <ConfigError message={errorMessage} />
  }

  if (showGitHubGuide) {
    return (
      <div className="container mx-auto py-8 space-y-4">
        <Button variant="outline" onClick={() => setShowGitHubGuide(false)}>
          ← Back to A/B Test Manager
        </Button>
        <GitHubSetupGuide />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">A/B Test Manager</h1>
        <p className="text-muted-foreground">Manage backend experiments with GitHub integration</p>
      </div>

      {githubChangesDetected && <GitHubSyncAlert onSync={() => loadExperiments(true)} isLoading={isLoading} />}

      <Tabs defaultValue="experiments" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="experiments">Experiments</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
          <TabsTrigger value="diff" className="relative">
            Changes
            {hasUnsavedChanges && <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="experiments" className="space-y-4">
          {config && (
            <ExperimentList
              experiments={config.experiments}
              onSync={() => loadExperiments(true)}
              isLoading={isLoading}
            />
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <div className="flex justify-center">
            <ExperimentForm onSubmit={createExperiment} defaultConfig={config?.default} />
          </div>
        </TabsContent>

        <TabsContent value="diff" className="space-y-4">
          {diff ? (
            <div className="space-y-4">
              <DiffViewer diff={diff} experimentName={lastCreatedExperiment} />
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Create Pull Request</CardTitle>
                    <CardDescription>Create a GitHub Pull Request with these changes</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button onClick={createPullRequest} disabled={isCreatingPR} className="w-full">
                      {isCreatingPR ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <GitPullRequest className="w-4 h-4 mr-2" />
                      )}
                      Create Pull Request
                    </Button>

                    {prError && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{prError}</AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Download Configuration</CardTitle>
                    <CardDescription>Save the updated configuration locally</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={downloadConfig} variant="outline" className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      Download JSON
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  If you can't create a pull request, you can download the configuration and manually commit it to your
                  repository.
                </AlertDescription>
              </Alert>
            </div>
          ) : hasUnsavedChanges && lastCreatedExperiment ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Unsaved Changes</CardTitle>
                  <CardDescription>
                    You have created an experiment "{lastCreatedExperiment}" that hasn't been pushed to GitHub yet.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your changes are saved locally but not yet in GitHub. Create a pull request to save them
                      permanently.
                    </AlertDescription>
                  </Alert>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Create Pull Request</CardTitle>
                        <CardDescription>Push your changes to GitHub</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Button onClick={createPullRequest} disabled={isCreatingPR} className="w-full">
                          {isCreatingPR ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <GitPullRequest className="w-4 h-4 mr-2" />
                          )}
                          Create Pull Request
                        </Button>

                        {prError && (
                          <Alert variant="destructive" className="mt-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{prError}</AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Download Configuration</CardTitle>
                        <CardDescription>Save the updated configuration locally</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button onClick={downloadConfig} variant="outline" className="w-full">
                          <Download className="w-4 h-4 mr-2" />
                          Download JSON
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No changes to display. Create an experiment to see the diff.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
