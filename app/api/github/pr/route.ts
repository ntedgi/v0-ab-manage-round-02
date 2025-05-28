import { type NextRequest, NextResponse } from "next/server"
import { Octokit } from "@octokit/rest"

export async function POST(request: NextRequest) {
  try {
    // Check if we're in a deployment environment
    const isDeployment = process.env.VERCEL === "1"

    // Log environment for debugging
    console.log("Environment:", {
      isVercel: process.env.VERCEL,
      hasGithubToken: !!process.env.GITHUB_TOKEN,
      hasRepoOwner: !!process.env.GITHUB_REPO_OWNER,
      hasRepoName: !!process.env.GITHUB_REPO_NAME,
    })

    const { config, experimentName } = await request.json()

    // Check if GitHub token is available
    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO_OWNER || !process.env.GITHUB_REPO_NAME) {
      console.error("Missing GitHub configuration:", {
        hasToken: !!process.env.GITHUB_TOKEN,
        hasOwner: !!process.env.GITHUB_REPO_OWNER,
        hasName: !!process.env.GITHUB_REPO_NAME,
      })

      return NextResponse.json(
        {
          success: false,
          message:
            "GitHub integration is not configured. Please set GITHUB_TOKEN, GITHUB_REPO_OWNER, and GITHUB_REPO_NAME environment variables.",
          missingVars: {
            GITHUB_TOKEN: !process.env.GITHUB_TOKEN,
            GITHUB_REPO_OWNER: !process.env.GITHUB_REPO_OWNER,
            GITHUB_REPO_NAME: !process.env.GITHUB_REPO_NAME,
          },
        },
        { status: 400 },
      )
    }

    // Extract owner and repo name correctly
    let repoOwner = process.env.GITHUB_REPO_OWNER
    let repoName = process.env.GITHUB_REPO_NAME

    // Clean up the values in case they contain full URLs
    if (repoOwner.includes("/")) {
      // Extract just the username from potential URL or path
      const parts = repoOwner.split("/")
      repoOwner = parts[parts.length - 1]
    }

    if (repoName.includes("/")) {
      // Extract just the repo name from potential URL or path
      const parts = repoName.split("/")
      repoName = parts[parts.length - 1]
    }

    // Remove .git suffix if present
    if (repoName.endsWith(".git")) {
      repoName = repoName.slice(0, -4)
    }

    console.log(`Using GitHub repo: ${repoOwner}/${repoName}`)

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    })

    const FILE_PATH = "ab.json"
    const BASE_BRANCH = "main"

    // Create a new branch
    const branchName = `experiment/${experimentName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`

    try {
      // First, check if we have access to the repository
      try {
        await octokit.rest.repos.get({
          owner: repoOwner,
          repo: repoName,
        })
      } catch (error: any) {
        if (error.status === 404) {
          return NextResponse.json(
            {
              error: "Repository not found",
              details: `Cannot access repository ${repoOwner}/${repoName}. Please check your GITHUB_REPO_OWNER and GITHUB_REPO_NAME environment variables.`,
            },
            { status: 404 },
          )
        } else if (error.status === 403) {
          return NextResponse.json(
            {
              error: "Access denied",
              details:
                "Your GitHub token doesn't have permission to access this repository. Please ensure your token has 'repo' scope.",
            },
            { status: 403 },
          )
        }
        throw error
      }

      // Get the latest commit SHA from main branch
      const { data: masterRef } = await octokit.rest.git.getRef({
        owner: repoOwner,
        repo: repoName,
        ref: `heads/${BASE_BRANCH}`,
      })

      // Create new branch
      await octokit.rest.git.createRef({
        owner: repoOwner,
        repo: repoName,
        ref: `refs/heads/${branchName}`,
        sha: masterRef.object.sha,
      })

      // Get current file to get its SHA
      const { data: currentFile } = await octokit.rest.repos.getContent({
        owner: repoOwner,
        repo: repoName,
        path: FILE_PATH,
        ref: BASE_BRANCH,
      })

      // Update file in new branch
      const content = JSON.stringify(config, null, 2)
      await octokit.rest.repos.createOrUpdateFileContents({
        owner: repoOwner,
        repo: repoName,
        path: FILE_PATH,
        message: `Add experiment: ${experimentName}`,
        content: Buffer.from(content).toString("base64"),
        branch: branchName,
        sha: "sha" in currentFile ? currentFile.sha : undefined,
      })

      // Create pull request
      const { data: pr } = await octokit.rest.pulls.create({
        owner: repoOwner,
        repo: repoName,
        title: `Add A/B Test Experiment: ${experimentName}`,
        head: branchName,
        base: BASE_BRANCH,
        body: `This PR adds a new A/B test experiment: **${experimentName}**

Generated automatically by A/B Test Manager.`,
      })

      return NextResponse.json({
        pullRequest: {
          number: pr.number,
          url: pr.html_url,
          title: pr.title,
        },
      })
    } catch (error: any) {
      console.error("GitHub API Error:", error.message, error.status, error.response?.data)

      if (error.status === 403) {
        return NextResponse.json(
          {
            error: "Permission denied",
            details:
              "Your GitHub token doesn't have sufficient permissions. Please ensure your token has 'repo' scope and write access to create branches and pull requests.",
            requiredScopes: ["repo"],
          },
          { status: 403 },
        )
      }

      if (error.status === 404) {
        return NextResponse.json(
          {
            error: "Not found",
            details: `Could not find the repository or branch. Please verify that ${repoOwner}/${repoName} exists and has a '${BASE_BRANCH}' branch.`,
          },
          { status: 404 },
        )
      }

      if (error.status === 422) {
        return NextResponse.json(
          {
            error: "Invalid request",
            details: "The branch name might already exist or the request is invalid.",
          },
          { status: 422 },
        )
      }

      // For any other error, return a generic error message
      return NextResponse.json(
        {
          error: "GitHub API error",
          details: error.message || "An error occurred while communicating with GitHub",
          status: error.status || 500,
        },
        { status: error.status || 500 },
      )
    }
  } catch (error: any) {
    console.error("Error creating PR:", error)
    return NextResponse.json(
      {
        error: "Failed to create pull request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
