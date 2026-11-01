#!/usr/bin/env python3
"""检查帖子文件格式。用法：python3 tools/check_posts.py tools/jobs/job01.txt data/posts/j01-*.json
第一个参数是分配到的词表，后面是要检查的帖子文件。输出问题列表和完成情况。"""
import json, re, sys, glob

FIELDS = ["w", "title", "line", "stk", "body", "ex", "exCn", "pte", "tags", "cm"]
BANNED = ["高频", "必考", "常考", "超常见", "考试最爱", "出现率", "机经"]

def main():
    job, files = sys.argv[1], []
    for a in sys.argv[2:]:
        files += sorted(glob.glob(a))
    assigned = [l.split(" | ")[0].strip().lower() for l in open(job, encoding="utf-8") if l.strip()]
    skip_file = job.replace(".txt", ".skip")
    try:
        skipped = {l.strip().lower() for l in open(skip_file, encoding="utf-8") if l.strip()}
    except FileNotFoundError:
        skipped = set()
    done, problems = set(), []
    for f in files:
        try:
            posts = json.load(open(f, encoding="utf-8"))
        except Exception as e:
            problems.append(f"{f}: JSON 解析失败 {e}")
            continue
        if not isinstance(posts, list):
            problems.append(f"{f}: 顶层必须是数组")
            continue
        for i, p in enumerate(posts):
            tag = f"{f}#{i} {p.get('w', '?') if isinstance(p, dict) else '?'}"
            if not isinstance(p, dict):
                problems.append(f"{tag}: 不是对象"); continue
            miss = [k for k in FIELDS if k not in p]
            if miss: problems.append(f"{tag}: 缺少字段 {miss}")
            w = str(p.get("w", "")).lower()
            if w not in assigned: problems.append(f"{tag}: 这个词不在分配的词表里")
            if w in done: problems.append(f"{tag}: 重复")
            done.add(w)
            for k in ["title", "line", "body", "exCn", "pte"]:
                if not re.search(r"[一-龥]", str(p.get(k, ""))): problems.append(f"{tag}: {k} 应该是中文")
            if len(str(p.get("title", ""))) > 34: problems.append(f"{tag}: 标题太长")
            if len(str(p.get("line", ""))) > 12: problems.append(f"{tag}: 封面金句超过 12 字")
            body = str(p.get("body", ""))
            if body.count("\n") < 2 or len(body) < 90: problems.append(f"{tag}: 正文太短（至少 3 段）")
            if len(body) > 420: problems.append(f"{tag}: 正文太长")
            if w and w not in str(p.get("ex", "")).lower() and w[:-1] not in str(p.get("ex", "")).lower():
                problems.append(f"{tag}: 例句里没出现这个词（变形可以，但要能看出来）")
            for b in BANNED:
                if b in str(p.get("pte", "")) or b in str(p.get("tags", "")) or b in body:
                    problems.append(f"{tag}: 出现了不允许的说法「{b}」")
            cm = p.get("cm")
            if not (isinstance(cm, list) and len(cm) == 3 and all(isinstance(c, list) and len(c) == 3 for c in cm)):
                problems.append(f"{tag}: cm 必须是 3 条 [昵称, 内容, 点赞] ")
            if not re.fullmatch(r"#\S+( #\S+)+", str(p.get("tags", "")).strip()):
                problems.append(f"{tag}: tags 格式应为 \"#话题1 #话题2\"")
    left = [w for w in assigned if w not in done and w not in skipped]
    print(f"已写 {len(done)} / 跳过 {len(skipped)} / 分配 {len(assigned)}，还剩 {len(left)}")
    if left: print("未完成：", " ".join(left[:40]), "..." if len(left) > 40 else "")
    print(f"问题 {len(problems)} 个")
    for p in problems[:80]: print(" -", p)

if __name__ == "__main__":
    main()
