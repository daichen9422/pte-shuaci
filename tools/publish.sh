#!/bin/bash
# 用法：tools/publish.sh 01 02 ...  —— 检查这些批次，登记完成，重新打包并推送
set -e
cd "$(dirname "$0")/.."
for j in "$@"; do
  out=$(python3 tools/check_posts.py tools/jobs/job$j.txt "data/posts/j$j-*.json")
  echo "job$j: $(echo "$out" | head -1) | $(echo "$out" | sed -n 2p)"
  echo "$out" | grep -q "还剩 0" && echo "$out" | grep -q "问题 0 个" || { echo "job$j 未通过检查，跳过"; continue; }
  grep -qx "$j" tools/jobs/done.txt || echo "$j" >> tools/jobs/done.txt
  git add data/posts/j$j-*.json; [ -f tools/jobs/job$j.skip ] && git add tools/jobs/job$j.skip
done
python3 tools/build_index.py
git add -A data/posts/bundle-*.json data/posts/index.json sw.js tools/jobs/done.txt tools/publish.sh
git -c user.name="daichen9422" -c user.email="daichen9422@users.noreply.github.com" commit -qm "新增帖子：job $*

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Ust5YfxwEHEoxhwxrk1npN"
git push -q origin main && git log --oneline | head -1
