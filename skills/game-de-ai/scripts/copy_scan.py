#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""copy_scan.py — 游戏文案确定性扫描（零依赖、零幻觉、毫秒级）

只做"机械可判定"的那一半：密度、词表、标点、占位符、长度预算。
需要判断力的部分（场景是否成立、人物像不像）由人/模型按 COPY_DEAI_GUIDE 的三层复核处理。

用法:
  python copy_scan.py --file strings.txt --type ui
  python copy_scan.py --json items.json --out report.json      # [{"id":"...","type":"button","text":"..."}]
  python copy_scan.py --file strings.txt --type button --max-len 6

输入:
  --file  一行一条玩家可见文案（空行与 # 开头忽略）
  --json  [{"id","type","text"}]；type ∈ button/nav/label/toast/tutorial/dialogue/narration/item/shop/ending/notice

输出: 控制台摘要 + JSON 报告（--out 指定；默认 <file>.copy_scan.json）

退出码: 0 = 扫完（是否"通过"由人判）；2 = 输入错误。
"""
import argparse
import json
import re
import sys

sys.stdout.reconfigure(errors="replace")

# ---------- 词表（识别线索，不是禁词表） ----------
CONNECTIVES = ["然而", "因此", "此外", "值得一提的是", "不仅", "而且", "与此同时",
               "综上所述", "总而言之", "毫无疑问"]
# 这些词只有在带逗号、做「段首枚举」时才算连接词；「最后一轮」里的「最后」不算
ENUM_ADVERBS = re.compile(r"(首先|其次|最后|另外|同时)[，,]")
CUSTOMER_SERVICE = ["抱歉", "请稍候", "您的", "我们将", "未能", "顺利完成", "操作失败",
                    "感谢您的", "如有疑问", "敬请", "温馨提示"]
PROMO = ["全新", "重磅", "震撼", "极致", "沉浸", "打造", "赋能", "无缝", "一站式",
         "颠覆", "匠心", "诚意之作", "不容错过", "沉浸式"]
EXPLAIN = ["正如你所见", "如你所知", "我们已经", "你已经知道", "众所周知", "相信你",
           "你会发现", "值得注意的是"]
EMPTY_EVAL = ["令人难忘", "深受喜爱", "广受好评", "别具一格", "独具匠心", "美轮美奂",
              "氛围感", "高级感", "很有质感", "沉浸感"]
CORRELATIVE = [r"不是.{1,12}而是", r"既.{1,10}又", r"一边.{1,10}一边", r"越是.{1,10}越是",
               r"不仅.{1,12}还"]
HIGH_IDIOMS = ["匠心独运", "别具一格", "独具匠心", "别出心裁", "精益求精", "无可挑剔",
               "令人难忘", "美轮美奂", "栩栩如生", "跃然纸上", "身临其境", "一览无余",
               "目不暇接", "琳琅满目", "应有尽有", "前所未有", "无处不在", "回味无穷",
               "垂涎欲滴", "宾至如归", "温馨舒适", "沉浸其中", "流连忘返", "叹为观止"]

LEN_BUDGET = {
    "button": 6, "nav": 6, "label": 8, "toast": 40, "tutorial": 60,
    "dialogue": 80, "narration": 120, "item": 60, "shop": 40, "ending": 400, "notice": 60,
}
PLACEHOLDER = re.compile(r"(\{[^{}]{0,24}\}|%[sdif]|\{\{[^{}]{0,24}\}\}|\$\w+|<\/?[a-zA-Z][^>]{0,40}>)")


def scan_item(it):
    """返回 [(rule_id, 级别, 证据, 建议)]"""
    hits = []
    text = it["text"]
    t = it.get("type", "ui")
    n = len(text)
    if not n:
        return hits

    # 1 长度预算
    budget = LEN_BUDGET.get(t, 40)
    if n > budget:
        hits.append(("G01", "P1", f"{n} 字 > {t} 预算 {budget} 字", "按类型拆句或删解释"))

    # 2 连接词密度
    cc = sum(text.count(w) for w in CONNECTIVES) + len(ENUM_ADVERBS.findall(text))
    if cc and (cc >= 2 or (n <= 40 and cc >= 1)):
        found = [w for w in CONNECTIVES if w in text] + ENUM_ADVERBS.findall(text)
        hits.append(("G02", "P1" if cc >= 2 else "P2", f"连接词 {cc} 个: " + ",".join(found),
                     "删连接词，靠语序承接"))

    # 3 客服腔
    cs = [w for w in CUSTOMER_SERVICE if w in text]
    if cs:
        hits.append(("G03", "P1", "客服腔: " + ",".join(cs), "改成「发生了什么 + 下一步」"))

    # 4 宣传腔
    pr = [w for w in PROMO if w in text]
    if pr:
        hits.append(("G04", "P1", "宣传腔: " + ",".join(pr), "改成可核对的事实"))

    # 5 解释已知信息
    ex = [w for w in EXPLAIN if w in text]
    if ex:
        hits.append(("G05", "P2", "解释已知: " + ",".join(ex), "删掉，让玩家自己发现"))

    # 6 空评价
    ev = [w for w in EMPTY_EVAL if w in text]
    if ev:
        hits.append(("G06", "P2", "无事实评价: " + ",".join(ev), "换成一个具体事实或细节"))

    # 7 对仗/关联句式
    cor = [p for p in CORRELATIVE if re.search(p, text)]
    if cor:
        hits.append(("G07", "P2", f"关联句式 {len(cor)} 处", "保留一处，其余直陈"))

    # 8 套话四字格（只查高疑似清单；普通四字短语不算，避免把正常句子判成堆砌）
    idm = [w for w in HIGH_IDIOMS if w in text]
    if idm:
        hits.append(("G08", "P2" if len(idm) >= 2 or n < 30 else "P3",
                     "套话四字格: " + ",".join(idm), "换成具体动作或物件，别用评价词"))

    # 9 标点
    if text.count("——") >= 2 or (text.count("—") >= 2 and n < 60):
        hits.append(("G09", "P2", f"破折号 {text.count('—')} 个", "换逗号或句号"))
    if text.count("！") + text.count("!") >= 2:
        hits.append(("G09", "P2", "感叹号 ≥2", "一个提示最多一个感叹号"))
    if text.count("…") >= 3:
        hits.append(("G09", "P3", "省略号 ≥3", "一屏最多一处"))

    # 10 形容词/名词粗估（仅中文长串时可靠）
    if n >= 12:
        adj = len(re.findall(r"[\u4e00-\u9fa5](的)", text))
        if adj >= 3:
            hits.append(("G10", "P2", f"「的」结构 {adj} 处（≈形容词密度）", "删修饰，落到动作"))

    # 11 全角空格/半角混排/多余标点
    if re.search(r"[ \t]{2,}", text):
        hits.append(("G11", "P3", "连续空格", "清掉"))
    if re.search(r"[，。！？；：]{2,}", text):
        hits.append(("G11", "P3", "标点连用", "只留一个"))

    # 12 中英混排装饰
    if re.search(r"[\u4e00-\u9fa5]\s?[A-Za-z]{2,}", text) and not PLACEHOLDER.search(text):
        hits.append(("G12", "P3", "中文句里夹英文词", "除非人物设定如此，否则删"))

    # 13 占位符（不计问题，只登记，供改写时核对）
    ph = PLACEHOLDER.findall(text)
    if ph:
        hits.append(("G13", "INFO", "占位符: " + " ".join(ph[:6]), "改写时必须原样保留"))

    return hits


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file")
    ap.add_argument("--json")
    ap.add_argument("--type", default="ui")
    ap.add_argument("--out", default="")
    args = ap.parse_args()

    items = []
    if args.json:
        items = json.load(open(args.json, encoding="utf-8-sig"))
        for i, it in enumerate(items):
            it.setdefault("id", f"item{i}")
            it.setdefault("type", args.type)
    elif args.file:
        lines = [l.rstrip("\n") for l in open(args.file, encoding="utf-8-sig")]
        for i, l in enumerate(lines, 1):
            if not l.strip() or l.lstrip().startswith("#"):
                continue
            items.append({"id": f"L{i}", "type": args.type, "text": l.strip()})
    else:
        print("[copy_scan] 需要 --file 或 --json", file=sys.stderr)
        sys.exit(2)

    report = {"items": [], "summary": {}}
    lvl_count = {"P1": 0, "P2": 0, "P3": 0, "INFO": 0}
    rule_count = {}
    for it in items:
        hits = scan_item(it)
        if hits:
            report["items"].append({"id": it["id"], "type": it.get("type"),
                                    "text": it["text"], "hits": [
                                        {"rule": h[0], "level": h[1], "evidence": h[2], "fix": h[3]}
                                        for h in hits]})
            for h in hits:
                lvl_count[h[1]] = lvl_count.get(h[1], 0) + 1
                rule_count[h[0]] = rule_count.get(h[0], 0) + 1

    report["summary"] = {"total": len(items), "flagged": len(report["items"]),
                         "by_level": lvl_count, "by_rule": rule_count}

    # 控制台只输出 ASCII，避免 Windows 控制台 GBK 编码把中文打成乱码；中文证据一律看 JSON
    print(f"[copy_scan] items={len(items)} flagged={len(report['items'])} "
          f"P1={lvl_count['P1']} P2={lvl_count['P2']} P3={lvl_count['P3']} (details in JSON)")
    for rid, c in sorted(rule_count.items(), key=lambda x: -x[1]):
        print(f"  {rid}: {c}")

    out = args.out or ((args.file or args.json) + ".copy_scan.json")
    json.dump(report, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"[copy_scan] report: {out}")


if __name__ == "__main__":
    main()
