"""Defensive Cybersecurity & Intrusion Analysis Fine-Tuning Pipeline for Llama 3.2.

Combines:
1. Grounding in JunfengGo/Dataset-for-cybersecurity benchmark collection
2. SFT (Supervised Fine-Tuning) on NSL-KDD intrusion detection, FWAF WAF payloads, and MITRE ATT&CK mitigation
3. Strict defensive alignment preventing weaponized exploit generation while optimizing for SOC log analysis & threat hunting
4. Export to GGUF and direct Ollama deployment (aegis-defense)

Designed to run on Google Colab (free T4 GPU) or any CUDA-enabled workstation.
"""
import argparse
import json
import os
from pathlib import Path

MODEL_ID = "meta-llama/Llama-3.2-3B-Instruct"
LOCAL_DATASET_PATH = Path(__file__).resolve().parent.parent / "backend" / "data" / "security" / "cybersecurity_sft_sample.jsonl"
OUTPUT_DIR = "./aegis-defense-llama3.2-lora"


def train_cybersecurity_sft(
    model_id: str = MODEL_ID,
    dataset_path: str = str(LOCAL_DATASET_PATH),
    output_dir: str = OUTPUT_DIR,
    epochs: int = 2,
    batch_size: int = 2,
    gradient_accumulation_steps: int = 4,
    learning_rate: float = 2e-4,
):
    print("=" * 65)
    print(" Aegis Cybersecurity Defensive SFT Training Pipeline")
    print(f" Base Model: {model_id}")
    print(f" Dataset:    {dataset_path}")
    print("=" * 65)

    try:
        import torch
        from datasets import Dataset
        from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
        from transformers import (
            AutoModelForCausalLM,
            AutoTokenizer,
            BitsAndBytesConfig,
            TrainingArguments,
        )
        from trl import SFTTrainer
    except ImportError:
        print("[!] Missing training dependencies. In Google Colab or your GPU environment, run:")
        print("    pip install -q torch transformers datasets peft trl bitsandbytes accelerate")
        return

    # Check CUDA availability
    if not torch.cuda.is_available():
        print("[!] No CUDA GPU detected. Local training on CPU is extremely slow.")
        print("    Recommended: Run this on Google Colab with a free T4 GPU using:")
        print("    scripts/train_cybersecurity_llama3.ipynb")
        return

    # 1. Load Dataset
    print(f"[*] Loading training records from {dataset_path}...")
    records = []
    with open(dataset_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                records.append(json.loads(line.strip()))
    
    formatted_prompts = []
    for r in records:
        text = (
            f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n"
            f"{r['instruction']}<|eot_id|>\n"
            f"<|start_header_id|>user<|end_header_id|>\n"
            f"{r['input']}<|eot_id|>\n"
            f"<|start_header_id|>assistant<|end_header_id|>\n"
            f"{r['output']}<|eot_id|>"
        )
        formatted_prompts.append({"text": text})

    dataset = Dataset.from_list(formatted_prompts)
    print(f"[OK] Loaded {len(dataset)} instruction pairs.")

    # 2. Tokenizer
    tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    # 3. 4-bit Quantization Config (QLoRA)
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    print(f"[*] Loading {model_id} in 4-bit precision...")
    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )
    model = prepare_model_for_kbit_training(model)

    # 4. LoRA Adapter Configuration
    lora_config = LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # 5. Training Arguments
    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=epochs,
        per_device_train_batch_size=batch_size,
        gradient_accumulation_steps=gradient_accumulation_steps,
        learning_rate=learning_rate,
        logging_steps=10,
        save_strategy="epoch",
        fp16=True,
        optim="paged_adamw_8bit",
        report_to="none",
    )

    # 6. SFTTrainer
    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset,
        dataset_text_field="text",
        max_seq_length=2048,
        tokenizer=tokenizer,
        args=training_args,
    )

    print("[*] Starting SFT Training...")
    trainer.train()

    # 7. Save Adapter
    print(f"[*] Saving trained LoRA adapter to {output_dir}...")
    trainer.model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    print(f"[SUCCESS] Defensive cybersecurity adapter saved to {output_dir}")
    print("\nNext Steps:")
    print("1. Merge weights: python scripts/merge_lora.py (or export GGUF in Colab)")
    print("2. Deploy into Ollama: ollama create aegis-defense -f backend/data/security/Modelfile")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fine-tune Llama 3.2 on Defensive Cybersecurity Benchmarks")
    parser.add_argument("--model_id", type=str, default=MODEL_ID)
    parser.add_argument("--dataset_path", type=str, default=str(LOCAL_DATASET_PATH))
    parser.add_argument("--output_dir", type=str, default=OUTPUT_DIR)
    parser.add_argument("--epochs", type=int, default=2)
    args = parser.parse_args()

    train_cybersecurity_sft(
        model_id=args.model_id,
        dataset_path=args.dataset_path,
        output_dir=args.output_dir,
        epochs=args.epochs,
    )
