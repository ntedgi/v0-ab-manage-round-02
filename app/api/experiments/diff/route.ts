import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { oldConfig, newConfig, experimentName } = await request.json()

    // Convert configs to strings for comparison
    const originalContent = JSON.stringify(oldConfig, null, 2)
    const newContent = JSON.stringify(newConfig, null, 2)

    // Generate the diff
    const diff = generateDiff(originalContent, newContent)

    // If we have an experiment name, try to highlight it in the diff
    if (experimentName) {
      highlightExperimentInDiff(diff, experimentName)
    }

    return NextResponse.json({
      original: originalContent,
      modified: newContent,
      diff,
    })
  } catch (error) {
    console.error("Error generating diff:", error)
    return NextResponse.json({ error: "Failed to generate diff" }, { status: 500 })
  }
}

function generateDiff(
  original: string,
  modified: string,
): Array<{
  type: "added" | "removed" | "unchanged"
  content: string
  lineNumber: number
  hasChange: boolean
  isExperiment?: boolean
}> {
  const originalLines = original.split("\n")
  const modifiedLines = modified.split("\n")
  const diff: Array<{
    type: "added" | "removed" | "unchanged"
    content: string
    lineNumber: number
    hasChange: boolean
    isExperiment?: boolean
  }> = []

  let originalIndex = 0
  let modifiedIndex = 0

  while (originalIndex < originalLines.length || modifiedIndex < modifiedLines.length) {
    if (originalIndex >= originalLines.length) {
      // Added lines
      const content = modifiedLines[modifiedIndex]
      diff.push({
        type: "added",
        content,
        lineNumber: modifiedIndex + 1,
        hasChange: content.trim() !== "", // Only mark as having change if not just whitespace
      })
      modifiedIndex++
    } else if (modifiedIndex >= modifiedLines.length) {
      // Removed lines
      const content = originalLines[originalIndex]
      diff.push({
        type: "removed",
        content,
        lineNumber: originalIndex + 1,
        hasChange: content.trim() !== "", // Only mark as having change if not just whitespace
      })
      originalIndex++
    } else if (originalLines[originalIndex] === modifiedLines[modifiedIndex]) {
      // Unchanged lines
      diff.push({
        type: "unchanged",
        content: originalLines[originalIndex],
        lineNumber: originalIndex + 1,
        hasChange: false,
      })
      originalIndex++
      modifiedIndex++
    } else {
      // Changed lines - mark as removed and added
      const originalContent = originalLines[originalIndex]
      const modifiedContent = modifiedLines[modifiedIndex]

      // Check if this is just a whitespace change
      const isWhitespaceChange =
        originalContent.trim() === modifiedContent.trim() &&
        (originalContent.trim() !== originalContent || modifiedContent.trim() !== modifiedContent)

      diff.push({
        type: "removed",
        content: originalContent,
        lineNumber: originalIndex + 1,
        hasChange: !isWhitespaceChange,
      })
      diff.push({
        type: "added",
        content: modifiedContent,
        lineNumber: modifiedIndex + 1,
        hasChange: !isWhitespaceChange,
      })
      originalIndex++
      modifiedIndex++
    }
  }

  return diff
}

// Function to highlight the experiment in the diff
function highlightExperimentInDiff(
  diff: Array<{
    type: string
    content: string
    lineNumber: number
    hasChange: boolean
    isExperiment?: boolean
  }>,
  experimentName: string,
) {
  // Create a regex pattern to find the experiment name in the diff
  const pattern = new RegExp(`"landingName":\\s*"${experimentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`)

  // Find the start of the experiment in the diff
  let experimentStartIndex = -1
  for (let i = 0; i < diff.length; i++) {
    if (diff[i].type === "added" && pattern.test(diff[i].content)) {
      experimentStartIndex = i
      break
    }
  }

  // If we found the experiment, mark all related lines
  if (experimentStartIndex >= 0) {
    // Mark the experiment start
    diff[experimentStartIndex].isExperiment = true

    // Count braces to find the end of the experiment object
    let braceCount = 0
    let inExperiment = true

    // Count opening braces in the first line
    const firstLine = diff[experimentStartIndex].content
    braceCount += (firstLine.match(/{/g) || []).length
    braceCount -= (firstLine.match(/}/g) || []).length

    // Mark subsequent lines until we find the end of the experiment object
    for (let i = experimentStartIndex + 1; i < diff.length && inExperiment; i++) {
      const line = diff[i]

      if (line.type === "added") {
        // Count braces to track object nesting
        braceCount += (line.content.match(/{/g) || []).length
        braceCount -= (line.content.match(/}/g) || []).length

        // Mark this line as part of the experiment
        line.isExperiment = true

        // If braces are balanced and we've seen at least one closing brace, we've reached the end
        if (braceCount === 0 && line.content.includes("}")) {
          inExperiment = false
        }
      }
    }
  }
}
