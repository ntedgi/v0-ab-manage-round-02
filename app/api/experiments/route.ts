import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

interface ABConfig {
  default: any
  experiments: Array<{
    landingID: number
    landingName: string
    enabled: boolean
    userClusters?: number[]
    toggles: any
    sdkToggles: any
  }>
  filters: any[]
}

// Initialize with empty config, will be loaded on first request
let cachedConfig: ABConfig | null = null
let lastLoadTime = 0

function mergeWithDefaults(experiment: any, defaults: any): any {
  return {
    ...defaults,
    ...experiment,
    toggles: {
      ...defaults.toggles?.both,
      ...(defaults.toggles?.[experiment.platform] || {}),
      ...experiment.toggles,
    },
    sdkToggles: {
      ...defaults.sdkToggles?.both,
      ...(defaults.sdkToggles?.[experiment.platform] || {}),
      ...experiment.sdkToggles,
    },
  }
}

// Load config from file
function loadConfigFromFile(forceReload = false): ABConfig | null {
  try {
    const currentTime = Date.now()
    const filePath = path.join(process.cwd(), "ab.json")

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`)
      return null
    }

    // Check if we need to reload the file
    // Force reload if requested or if it's been more than 5 seconds since last load
    if (forceReload || !cachedConfig || currentTime - lastLoadTime > 5000) {
      console.log("Loading config from file (fresh load)")

      // Get file stats to check modification time
      const stats = fs.statSync(filePath)

      // Read and parse the file
      const fileContent = fs.readFileSync(filePath, "utf8")
      const parsedConfig = JSON.parse(fileContent) as ABConfig

      // Update cache and timestamp
      cachedConfig = parsedConfig
      lastLoadTime = currentTime

      console.log(`Loaded config with ${parsedConfig.experiments.length} experiments`)
      return parsedConfig
    }

    console.log("Using cached config")
    return cachedConfig
  } catch (error) {
    console.error("Error loading config from file:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if we should force a reload from disk
    const sync = request.nextUrl.searchParams.get("sync") === "true"

    // Load config, forcing reload if sync=true
    const config = loadConfigFromFile(sync)

    if (!config) {
      return NextResponse.json({ error: "Failed to load configuration file" }, { status: 500 })
    }

    const experimentsWithDefaults = config.experiments.map((exp) => mergeWithDefaults(exp, config.default))

    return NextResponse.json({
      ...config,
      experiments: experimentsWithDefaults,
    })
  } catch (error) {
    console.error("Error in GET /api/experiments:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch experiments",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Force reload from disk to get the latest version
    const config = loadConfigFromFile(true)

    if (!config) {
      return NextResponse.json({ error: "Failed to load configuration file" }, { status: 500 })
    }

    const newExperiment = await request.json()

    // Generate new landingID
    const maxId = Math.max(...config.experiments.map((exp) => exp.landingID), config.default.landingID)
    newExperiment.landingID = maxId + 1

    // Add to experiments array
    const updatedConfig = {
      ...config,
      experiments: [...config.experiments, newExperiment],
    }

    cachedConfig = updatedConfig

    return NextResponse.json({
      experiment: mergeWithDefaults(newExperiment, config.default),
      config: updatedConfig,
    })
  } catch (error) {
    console.error("Error in POST /api/experiments:", error)
    return NextResponse.json(
      {
        error: "Failed to create experiment",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
