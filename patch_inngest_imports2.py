import os
import re
root = os.path.join(os.getcwd(), 'src')
changed = []
for dirpath, dirnames, filenames in os.walk(root):
    for name in filenames:
        if not name.endswith(('.ts', '.tsx')):
            continue
        path = os.path.join(dirpath, name)
        with open(path, 'r', encoding='utf-8') as f:
            text = f.read()
        orig = text
        text = re.sub(r'import \{ sendWorkflowExecution \} from "@/inngest/utils";', 'import { sendToQueue } from "@/lib/sqs";', text)
        text = re.sub(r'import \{ inngest \} from "@/inngest/client";\r?\n', '', text)
        text = re.sub(r'import \{ getSubscriptionToken, type Realtime \} from "@inngest/realtime";', 'import { sendToQueue } from "@/lib/sqs";', text)
        text = re.sub(r'import type \{ Realtime \} from "@inngest/realtime";\r?\n', '', text)
        text = re.sub(r'import type \{ GetStepTools, Inngest \} from "inngest";\r?\n', '', text)
        text = re.sub(r'export type\s+(\w+)\s*=\s*Realtime\.Token<[^>]+>;', r'export type \1 = any;', text)
        text = re.sub(r'import \{([^}]+)\} from "@/inngest/channels/[^"]*";', r'import {\1} from "@/lib/inngest-stubs";', text)
        text = re.sub(r'const token = await getSubscriptionToken\(inngest, \{(?:[^}]|\n)*?\}\);\s*\r?\n\s*return token;', 'await sendToQueue({ type: "fetchRealtimeToken" });\n  return {} as any;', text, flags=re.DOTALL)
        if text != orig:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(text)
            changed.append(path)
print('changed files:')
for p in changed:
    print(p)
