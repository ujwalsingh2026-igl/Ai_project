import collections
import json
from pathlib import Path

p = Path(__file__).resolve().parent / "assistant_training_dataset"
all_ex = [json.loads(line) for line in (p / "all_examples.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]
print(f"Total records in all_examples.jsonl: {len(all_ex)}")

tasks = collections.Counter(r.get("task") for r in all_ex)
print("\nTasks distribution:")
for task, count in tasks.most_common():
    print(f"  {task:20s}: {count:3d} examples")

print("\nSample records per task:")
seen = set()
for r in all_ex:
    t = r.get("task")
    if t not in seen:
        seen.add(t)
        print(f"\n--- Task [{t}] ---")
        print(f"ID:    {r.get('id')}")
        print(f"Label: {r.get('label')}")
        print(f"Input: {r.get('input')}")
        print(f"Expected Output: {r.get('expected_output')[:100]}...")
        if r.get("context"):
            print(f"Context: {r.get('context')[:80]}...")
        if r.get("safety_note"):
            print(f"Safety Note: {r.get('safety_note')}")

train_ex = [json.loads(line) for line in (p / "train.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]
test_ex = [json.loads(line) for line in (p / "test.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]
print(f"\nSplits check: Train={len(train_ex)}, Test={len(test_ex)}, Sum={len(train_ex) + len(test_ex)}")
