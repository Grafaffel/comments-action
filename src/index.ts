import { debug, info, isDebug, setFailed } from "@actions/core"
import { env } from 'process';
import { context, getOctokit } from "@actions/github"
import type { PushEvent } from "@octokit/webhooks-types"

const token = process.env.PAT

async function run() {
    try {
        info(JSON.stringify(process.env))

        if (!token) return setFailed("Invalid PAT")


        const octokit = getOctokit(token)
        const { owner, repo } = context.repo

        const commitFiles = [];

        let buildHash: string;
        let buildNumber: string;

        if (context.eventName !== "push") return

        const payload = context.payload as PushEvent
        const commitSha = payload.after

        const commit = await octokit.rest.repos.getCommit({
            owner,
            repo,
            ref: commitSha
        })

        if (!commit) {
            return setFailed("commit not found")
        }

        if (commit.data.author.login !== 'github-actions[bot]') return

        commit.data.files?.forEach(file => {
            commitFiles.push(file.raw_url);
        });

        commitFiles.forEach(async file => {
            const response = await fetch(file);
            const currentScript = await response.text();

            const matchedHash = currentScript.match(/,release:"discord_developers-([^"]+)"/)
            const matchedBuildNumber = currentScript.match(/var .=parseInt\(null!==\(.="(\d+)"\)/)

            if (matchedHash) {
                buildHash = matchedHash[1];
            } else {
                buildHash = 'unknown';
            }

            if (buildHash !== 'unknown') {
                info(`Found build hash: ${buildHash}\n`);
            }

            if (matchedBuildNumber) {
                buildNumber = matchedBuildNumber[1];
            } else {
                buildNumber = 'unknown';
            }

            if (buildNumber !== 'unknown') {
                info(`Found build number: ${buildNumber}\n`);
            }
        });

        const added = commit.data.files.map((file) => file.status == "added" && file.filename.split('/').reverse()[0].split('.').reverse()[0] === 'js' ? "+ " + file.filename.split('/').reverse()[0] : "").filter((msg) => msg !== "");
        const removed = commit.data.files.map((file) => file.status == "removed" && file.filename.split('/').reverse()[0].split('.').reverse()[0] === 'js' ? "- " + file.filename.split('/').reverse()[0] : "").filter((msg) => msg !== "");
        const modified = commit.data.files.map((file) => file.status == "modified" && file.filename.split('/').reverse()[0].split('.').reverse()[0] === 'js' ? "* " + file.filename.split('/').reverse()[0] : "").filter((msg) => msg !== "");

        const scriptChangelog = [...added, ...removed, ...modified].join("\n");

        await octokit.rest.repos.createCommitComment({
            owner,
            repo,
            commit_sha: commitSha,
            body: `# New Devportal Build!

            ## Build Number
            \`\`\`${buildNumber}\`\`\`
            
            ## Build Hash
            \`\`\`${buildHash}\`\`\`
            
            ## Scripts
            \`\`\`diff
            ${scriptChangelog}
            \`\`\``
        })
        return info("created commit comment")
    } catch (error) {
        setFailed(isDebug() ? error.stack : error.message)
    }
}
run()
