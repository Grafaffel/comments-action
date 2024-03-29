# comments-action

GitHub Action for posting commit comments in the Devportal-Datamining repo.

## Setup

`.github/workflows/comments.yml`

```yml
name: Commit comments
on:
  push:
    branches:
      - master

jobs:
  comments:
    name: Commit comments
    runs-on: ubuntu-latest
    steps:
      - name: Install Node.js
        uses: actions/setup-node@v2
        with:
          node-version: "20"
      - name: Comment on commit
        uses: Grafaffel/comments-action@main
        env:
          PAT: ${{ secrets.PAT }}
```
