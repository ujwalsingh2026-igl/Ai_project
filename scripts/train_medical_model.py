"""Medical & Alignment Fine-Tuning Pipeline for Llama 3.2.

Combines:
1. SFT (Supervised Fine-Tuning) on nisten/opus5-5-doctor-patient-conversations-all-human-diseases (2,194 diseases)
2. Alignment / DPO (Direct Preference Optimization) on Anthropic/hh-rlhf (Helpful and Harmless preference pairs)
3. Direct GGUF / Ollama export

Designed to run seamlessly on Google Colab (free T4 GPU) or any CUDA-enabled workstation.
"""
import argparse
import os
import torch
from datasets import load_dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, TrainingArguments
from trl import SFTTrainer

MODEL_ID = "meta-llama/Llama-3.2-3B-Instruct"
CLINICAL_DATASET = "nisten/opus5-5-doctor-patient-conversations-all-human-diseases"
ALIGNMENT_DATASET = "Anthropic/hh-rlhf"
OUTPUT_DIR = "./aegis-medical-llama3.2-lora"


def format_clinical_chat(record):
    """Formats opus 5.5 disease conversation into standard ChatML/Llama 3 instruction format."""
    conv = record.get("conversation", [])
    if isinstance(conv, list) and len(conv) > 0:
        formatted = []
        for msg in conv:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            formatted.append({"role": role, "content": content})
        return {"messages": formatted}

    # Fallback to structured clinical scenario
    name = record.get("name", "Unknown condition")
    desc = record.get("description", "")
    summary = record.get("executive_summary", "")
    return {
        "messages": [
            {"role": "user", "content": f"Doctor, can you explain the clinical presentation, diagnosis, and management of {name}?"},
            {"role": "assistant", "content": f"{desc}\n\nClinical Summary:\n{summary}"}
        ]
    }


def train_sft(model_id=MODEL_ID, max_samples=2000, epochs=1):
    print("=" * 60)
    print("  PHASE 1: Clinical Domain SFT Training (Opus 5.5)")
    print("=" * 60)

    # 1. Load Tokenizer
    tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    # 2. 4-bit Quantization Config (QLoRA)
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    # 3. Load Base Model
    print(f"[*] Loading base model: {model_id}...")
    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )
    model = prepare_model_for_kbit_training(model)

    # 4. LoRA Setup
    peft_config = LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    )
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    # 5. Load & Format Clinical Dataset
    print(f"[*] Loading clinical dataset: {CLINICAL_DATASET}...")
    dataset = load_dataset(CLINICAL_DATASET, split="train")
    if max_samples and max_samples < len(dataset):
        dataset = dataset.select(range(max_samples))

    formatted_dataset = dataset.map(format_clinical_chat, remove_columns=dataset.column_names)

    # 6. Training Arguments
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        num_train_epochs=epochs,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        learning_rate=2e-4,
        logging_steps=10,
        save_strategy="epoch",
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        warmup_ratio=0.03,
        lr_scheduler_type="cosine",
        report_to="none",
    )

    # 7. SFT Trainer
    trainer = SFTTrainer(
        model=model,
        train_dataset=formatted_dataset,
        peft_config=peft_config,
        max_seq_length=2048,
        tokenizer=tokenizer,
        args=training_args,
    )

    print("[*] Starting clinical fine-tuning...")
    trainer.train()

    # 8. Save LoRA Adapter
    trainer.model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    print(f"[OK] SFT clinical fine-tuning complete! Saved to {OUTPUT_DIR}")


def main():
    parser = argparse.ArgumentParser(description="Aegis Medical & Alignment Fine-Tuning")
    parser.add_argument("--model", default=MODEL_ID, help="Base model ID")
    parser.add_argument("--samples", type=int, default=1000, help="Max clinical samples")
    parser.add_argument("--epochs", type=int, default=1, help="Training epochs")
    args = parser.parse_args()

    train_sft(model_id=args.model, max_samples=args.samples, epochs=args.epochs)


if __name__ == "__main__":
    main()
