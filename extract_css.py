import json
path = "/Users/alekespinosa/.cursor/projects/Users-alekespinosa-Documents-CIS-Courses-CIS-4375-CIS-4375-Project/agent-transcripts/f2bd04c4-813c-408c-a765-9a22e491b15a/f2bd04c4-813c-408c-a765-9a22e491b15a.jsonl"
with open(path, "r", encoding="utf-8", errors="replace") as f:
    for line in f:
        if len(line) < 30000:
            continue
        o = json.loads(line)
        msg = o.get("message", {})
        content = msg.get("content")
        if isinstance(content, list):
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    t = block.get("text", "")
                    if "Home — General_Dashboard" in t and len(t) > 5000:
                        idx = t.find("/* Home —")
                        if idx >= 0:
                            with open("/tmp/extracted2.css", "w", encoding="utf-8") as out:
                                out.write(t[idx:])
                            print("found", len(t))
                            raise SystemExit(0)
print("not found")
