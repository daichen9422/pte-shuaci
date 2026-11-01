#!/usr/bin/env python3
"""汇总 data/posts 下所有帖子源文件：去掉坏文件和重复，合并成每包 400 篇的 bundle-NN.json，
写 index.json（app 只加载这些合并包，请求数少），并更新离线缓存版本号。"""
import json, glob, os, re, time

os.chdir(os.path.join(os.path.dirname(__file__), ".."))
words = {r[0].lower() for r in json.load(open("data/words.json", encoding="utf-8"))}
# 只收录 tools/jobs/done.txt 里登记过（已检查完成）的批次，p*.json 总是收录
done = {l.strip() for l in open("tools/jobs/done.txt", encoding="utf-8") if l.strip()} if os.path.exists("tools/jobs/done.txt") else set()
seen, files, bad, allposts = set(), [], [], []
for f in sorted(glob.glob("data/posts/*.json")):
    name = os.path.basename(f)
    if name == "index.json" or name.startswith("bundle-"):
        continue
    m = re.match(r"j(\d+)-", name)
    if m and m.group(1) not in done:
        continue
    try:
        posts = json.load(open(f, encoding="utf-8"))
        assert isinstance(posts, list)
    except Exception as e:
        bad.append(f"{name}: {e}")
        continue
    keep = [p for p in posts if isinstance(p, dict) and str(p.get("w", "")).lower() in words and str(p.get("w", "")).lower() not in seen]
    for p in keep:
        seen.add(str(p["w"]).lower())
    allposts.extend(keep)
for old in glob.glob("data/posts/bundle-*.json"):
    os.remove(old)
for i in range(0, len(allposts), 400):
    name = f"bundle-{i // 400 + 1:02d}.json"
    json.dump(allposts[i:i + 400], open("data/posts/" + name, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    files.append(name)
json.dump(files, open("data/posts/index.json", "w", encoding="utf-8"), ensure_ascii=False)
sw = open("sw.js", encoding="utf-8").read()
sw = re.sub(r'const CACHE = "pte-shuaci-[^"]*";', f'const CACHE = "pte-shuaci-{int(time.time())}";', sw)
open("sw.js", "w", encoding="utf-8").write(sw)
print(f"{len(files)} 个合并包，{len(seen)} 篇帖子")
for b in bad:
    print("跳过坏文件：", b)
