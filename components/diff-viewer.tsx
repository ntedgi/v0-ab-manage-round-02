"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface DiffLine {
  type: "added" | "removed" | "unchanged"
  content: string
  lineNumber: number
  hasChange?: boolean
  isExperiment?: boolean
}

interface DiffViewerProps {
  diff: DiffLine[]
  title?: string
  experimentName?: string
}

export function DiffViewer({ diff, title = "Changes", experimentName }: DiffViewerProps) {
  const [hideWhitespace, setHideWhitespace] = useState(true)
  const [showOnlyExperiment, setShowOnlyExperiment] = useState(true)

  if (!diff || diff.length === 0) {
    return null
  }

  // Filter the diff to focus on relevant changes
  let filteredDiff = diff

  // Filter out whitespace-only changes if hideWhitespace is true
  if (hideWhitespace) {
    filteredDiff = filteredDiff.filter((line) => line.type === "unchanged" || line.hasChange !== false)
  }

  // Filter to show only experiment-related changes if showOnlyExperiment is true
  if (showOnlyExperiment && experimentName) {
    // Find lines marked as part of the experiment
    const experimentLines = filteredDiff.filter((line) => line.isExperiment)

    if (experimentLines.length > 0) {
      // Find the start and end indices
      const startIndex = filteredDiff.findIndex((line) => line.isExperiment)
      const endIndex = filteredDiff.length - 1 - [...filteredDiff].reverse().findIndex((line) => line.isExperiment)

      // Add some context lines
      const contextLines = 5
      const start = Math.max(0, startIndex - contextLines)
      const end = Math.min(filteredDiff.length - 1, endIndex + contextLines)

      filteredDiff = filteredDiff.slice(start, end + 1)
    } else {
      // If we can't find the experiment by isExperiment flag, try to find it by name
      const experimentPattern = new RegExp(
        `"landingName":\\s*"${experimentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`,
      )

      let experimentStartIndex = -1
      for (let i = 0; i < filteredDiff.length; i++) {
        if (filteredDiff[i].type === "added" && experimentPattern.test(filteredDiff[i].content)) {
          experimentStartIndex = i
          break
        }
      }

      if (experimentStartIndex >= 0) {
        // Add some context lines
        const contextLines = 5
        const start = Math.max(0, experimentStartIndex - contextLines)

        // Find the end of the experiment (look for the closing brace)
        let braceCount = 0
        let experimentEndIndex = experimentStartIndex

        // Count opening braces in the first line
        const firstLine = filteredDiff[experimentStartIndex].content
        braceCount += (firstLine.match(/{/g) || []).length
        braceCount -= (firstLine.match(/}/g) || []).length

        // Find the end of the experiment
        for (let i = experimentStartIndex + 1; i < filteredDiff.length; i++) {
          const line = filteredDiff[i]
          if (line.type === "added") {
            braceCount += (line.content.match(/{/g) || []).length
            braceCount -= (line.content.match(/}/g) || []).length

            if (braceCount === 0 && line.content.includes("}")) {
              experimentEndIndex = i
              break
            }
          }
        }

        const end = Math.min(filteredDiff.length - 1, experimentEndIndex + contextLines)
        filteredDiff = filteredDiff.slice(start, end + 1)
      }
    }
  }

  // Group consecutive unchanged lines to show context
  const groupedDiff: (DiffLine | { type: "context"; count: number })[] = []
  let unchangedCount = 0
  let lastLineWasUnchanged = false

  filteredDiff.forEach((line, index) => {
    if (line.type === "unchanged") {
      // Show 3 lines of context before and after changes
      const prevLine = index > 0 ? filteredDiff[index - 1] : null
      const nextLine = index < filteredDiff.length - 1 ? filteredDiff[index + 1] : null
      const isContextLine =
        (prevLine && prevLine.type !== "unchanged") ||
        (nextLine && nextLine.type !== "unchanged") ||
        index < 3 ||
        index > filteredDiff.length - 4

      if (isContextLine) {
        // This is a context line, show it
        if (unchangedCount > 0) {
          groupedDiff.push({ type: "context", count: unchangedCount })
          unchangedCount = 0
        }
        groupedDiff.push(line)
        lastLineWasUnchanged = true
      } else {
        // This is a non-context unchanged line, count it
        unchangedCount++
        lastLineWasUnchanged = true
      }
    } else {
      // This is a changed line
      if (unchangedCount > 0) {
        groupedDiff.push({ type: "context", count: unchangedCount })
        unchangedCount = 0
      }
      groupedDiff.push(line)
      lastLineWasUnchanged = false
    }
  })

  // Add any remaining unchanged lines
  if (unchangedCount > 0) {
    groupedDiff.push({ type: "context", count: unchangedCount })
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Review the changes that will be made to the configuration file</CardDescription>
          </div>
          {experimentName && (
            <Badge variant="outline" className="ml-2">
              {experimentName}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Switch id="hide-whitespace" checked={hideWhitespace} onCheckedChange={setHideWhitespace} />
            <Label htmlFor="hide-whitespace">Hide whitespace changes</Label>
          </div>
          {experimentName && (
            <div className="flex items-center space-x-2">
              <Switch id="show-only-experiment" checked={showOnlyExperiment} onCheckedChange={setShowOnlyExperiment} />
              <Label htmlFor="show-only-experiment">Focus on new experiment</Label>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted px-3 py-2 text-sm font-medium border-b">ab.json</div>
          <div className="max-h-96 overflow-y-auto">
            {groupedDiff.map((item, index) => {
              if ("count" in item) {
                // This is a collapsed context indicator
                return (
                  <div key={`context-${index}`} className="text-center py-1 text-xs text-muted-foreground bg-muted/30">
                    ... {item.count} unchanged line{item.count !== 1 ? "s" : ""} ...
                  </div>
                )
              }

              // This is a diff line
              const line = item as DiffLine
              return (
                <div
                  key={`${line.type}-${index}`}
                  className={`flex text-sm font-mono ${
                    line.type === "added"
                      ? line.isExperiment
                        ? "bg-green-100 text-green-900"
                        : "bg-green-50 text-green-800"
                      : line.type === "removed"
                        ? "bg-red-50 text-red-800"
                        : "bg-white"
                  }`}
                >
                  <div className="w-12 px-2 py-1 text-xs text-muted-foreground border-r bg-muted/50">
                    {line.lineNumber}
                  </div>
                  <div className="flex-1 px-3 py-1">
                    <span
                      className={`inline-block w-4 ${
                        line.type === "added" ? "text-green-600" : line.type === "removed" ? "text-red-600" : ""
                      }`}
                    >
                      {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                    </span>
                    {line.content}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
