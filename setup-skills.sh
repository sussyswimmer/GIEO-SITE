#!/usr/bin/env bash
# Installs the Promptkura skills/agents/rules this project uses into ./.claude
# Run from the project root. Windows: run in Git Bash, or copy the npx lines into PowerShell.
set -euo pipefail

# One-time browser sign-in (skip if `npx promptkura whoami` already shows your account)
npx -y promptkura whoami || npx -y promptkura login

ITEMS=(
  # 3D web + scroll (skip any you already have via the god-site-skill plugin)
  sickn33/premium-3d-website
  davila7/3d-web-experience
  davila7/scroll-experience
  github/gsap-framer-scroll-animation
  sickn33/pro-motion
  # Blender + Adobe
  davila7/3d-artist
  patrickjs/blender-python-addon
  f/blender-object-maker
  github/adobe-creative-cloud
)

for item in "${ITEMS[@]}"; do
  echo "==> $item"
  npx -y promptkura add "$item" || echo "   (failed: check the slug with: npx promptkura search \"${item#*/}\")"
done

echo
echo "Done. Installed items are in ./.claude (skills/agents/rules). Restart Claude Code to load them."
