"""Pure-Python TF-IDF + SGD Softmax intent classifier.
Requires ZERO external C/C++ or SciPy dependencies (safe under Windows AppLocker / WDAC policies).
Trains on intents_train.jsonl, evaluates on val and test splits.

Run from datasets/:  python train_pure_baseline.py
"""
import collections
import json
import math
import random
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "data"


def load_split(split: str):
    path = DATA_DIR / f"intents_{split}.jsonl"
    rows = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    return [(r["text"], r["label"], r.get("lang", "en"), r) for r in rows]


def extract_features(text: str):
    """Generates word unigrams, word bigrams, and character 3-4 grams."""
    text_clean = " " + text.lower().strip() + " "
    words = text_clean.split()
    features = []
    for i in range(len(words)):
        features.append("w:" + words[i])
        if i < len(words) - 1:
            features.append("wb:" + words[i] + "_" + words[i + 1])
    for n in (3, 4):
        for i in range(len(text_clean) - n + 1):
            features.append("c:" + text_clean[i:i + n])
    return collections.Counter(features)


def main():
    train_data = load_split("train")
    val_data = load_split("val")
    test_data = load_split("test")

    print(f"Loaded datasets: Train={len(train_data)}, Val={len(val_data)}, Test={len(test_data)}")

    # 1. Document Frequency
    df = collections.defaultdict(int)
    for text, _, _, _ in train_data:
        for feat in set(extract_features(text)):
            df[feat] += 1

    # Filter features appearing at least twice
    vocab = {feat: idx for idx, (feat, count) in enumerate(df.items()) if count >= 2}
    classes = sorted(list({label for _, label, _, _ in train_data}))
    c2i = {c: i for i, c in enumerate(classes)}
    num_classes = len(classes)
    num_features = len(vocab)

    print(f"Vocabulary size: {num_features} n-gram features across {num_classes} intent classes")

    # 2. Inverse Document Frequency (IDF)
    num_train = len(train_data)
    idf = {feat: math.log((num_train + 1.0) / (df[feat] + 1.0)) + 1.0 for feat in vocab}

    def vectorize(text: str):
        feats = extract_features(text)
        vec = {}
        norm = 0.0
        for feat, count in feats.items():
            if feat in vocab:
                w = (1.0 + math.log(count)) * idf[feat]
                idx = vocab[feat]
                vec[idx] = w
                norm += w * w
        if norm > 0.0:
            norm_factor = math.sqrt(norm)
            for idx in vec:
                vec[idx] /= norm_factor
        return vec

    X_train = [(vectorize(t), c2i[l], lang, r) for t, l, lang, r in train_data]
    X_val = [(vectorize(t), c2i[l], lang, r) for t, l, lang, r in val_data]
    X_test = [(vectorize(t), c2i[l], lang, r) for t, l, lang, r in test_data]

    # 3. Softmax Logistic Regression with L2 Regularization & SGD
    weights = [collections.defaultdict(float) for _ in range(num_classes)]
    biases = [0.0] * num_classes

    lr = 0.5
    epochs = 40
    reg = 0.001

    print("Training pure-Python SGD Softmax model...")
    for epoch in range(epochs):
        indices = list(range(len(X_train)))
        random.seed(42 + epoch)
        random.shuffle(indices)

        for idx in indices:
            x, y_true, _, _ = X_train[idx]
            logits = [biases[c] + sum(weights[c][f] * v for f, v in x.items()) for c in range(num_classes)]
            max_logit = max(logits)
            exp_logits = [math.exp(l - max_logit) for l in logits]
            sum_exp = sum(exp_logits)
            probs = [e / sum_exp for e in exp_logits]

            for c in range(num_classes):
                error = probs[c] - (1.0 if c == y_true else 0.0)
                biases[c] -= lr * error
                for f, v in x.items():
                    weights[c][f] -= lr * (error * v + reg * weights[c][f])

        lr *= 0.95

    # 4. Evaluation helper
    def evaluate(split_name: str, dataset):
        correct = 0
        total = len(dataset)
        by_lang = collections.defaultdict(lambda: [0, 0])
        refuse_actual = 0
        refuse_correct = 0
        mistakes = []

        for x, y_true, lang, row in dataset:
            logits = [biases[c] + sum(weights[c][f] * v for f, v in x.items()) for c in range(num_classes)]
            pred = max(range(num_classes), key=lambda c: logits[c])
            true_label = classes[y_true]
            pred_label = classes[pred]

            if pred == y_true:
                correct += 1
                by_lang[lang][0] += 1
            else:
                mistakes.append((row["text"], true_label, pred_label, lang))

            by_lang[lang][1] += 1

            if true_label == "refuse":
                refuse_actual += 1
                if pred_label == "refuse":
                    refuse_correct += 1

        acc = correct / total
        refuse_recall = refuse_correct / refuse_actual if refuse_actual else 0.0

        print(f"\n--- Results on {split_name.upper()} split ---")
        print(f"Overall Accuracy: {acc:.2%} ({correct}/{total})")
        print(f"Refuse Safety Recall: {refuse_recall:.2%} ({refuse_correct}/{refuse_actual})")
        for lang, (c, t) in sorted(by_lang.items()):
            print(f"  [{lang}] Accuracy: {c / t:.2%} ({c}/{t})")

        return mistakes

    evaluate("Train", X_train)
    evaluate("Val", X_val)
    test_mistakes = evaluate("Test", X_test)

    print("\nSample Test Mistakes (First 10):")
    for text, true_lbl, pred_lbl, lang in test_mistakes[:10]:
        print(f"  [{lang}] {text!r} | Expected: {true_lbl} -> Predicted: {pred_lbl}")

    # Save model weights to JSON
    model_export = {
        "classes": classes,
        "vocab": vocab,
        "idf": idf,
        "biases": biases,
        "weights": [{str(f): w for f, w in weights[c].items()} for c in range(num_classes)],
    }
    out_file = DATA_DIR / "pure_intent_model.json"
    out_file.write_text(json.dumps(model_export, indent=2), encoding="utf-8")
    print(f"\nSaved trained model weights to {out_file}")


if __name__ == "__main__":
    main()
