"""
Aegis Autonomous Command Center - Android Launcher & Play Store Icon Generator.
Generates all official Android mipmap densities (legacy, round, adaptive foreground/background)
and the 512x512 Google Play Store listing asset according to Google Play Console specifications.
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

# Base paths
ROOT_DIR = Path(__file__).resolve().parents[1]
RES_DIR = ROOT_DIR / "frontend" / "android" / "app" / "src" / "main" / "res"
PUBLIC_DIR = ROOT_DIR / "frontend" / "public"
PLAY_STORE_ROOT = ROOT_DIR / "play_store_512.png"
PLAY_STORE_RES = ROOT_DIR / "frontend" / "android" / "app" / "src" / "main" / "play_store_512.png"

# Supersample factor for anti-aliasing
SUPER_SIZE = 2048

def draw_shield_path(draw, cx, cy, width, height, fill_color, outline_color=None, outline_width=0):
    """Draws a sleek tactical security shield polygon."""
    top_y = cy - height * 0.48
    shoulder_y = cy - height * 0.36
    side_y = cy + height * 0.05
    bottom_y = cy + height * 0.48
    
    left_x = cx - width * 0.42
    right_x = cx + width * 0.42
    
    # Generate smooth shield contour
    points = [
        (cx, top_y),
        (cx + width * 0.28, top_y + height * 0.02),
        (right_x, shoulder_y),
        (right_x, side_y),
    ]
    # Arc down to bottom point
    steps = 16
    for i in range(1, steps + 1):
        t = i / steps
        # Bezier interpolation from side_y to bottom_y
        x = right_x + (cx - right_x) * (t ** 1.3)
        y = side_y + (bottom_y - side_y) * (math.sin(t * math.pi / 2))
        points.append((x, y))
        
    points.append((cx, bottom_y))
    
    for i in range(steps, 0, -1):
        t = i / steps
        x = left_x + (cx - left_x) * (t ** 1.3)
        y = side_y + (bottom_y - side_y) * (math.sin(t * math.pi / 2))
        points.append((x, y))
        
    points.extend([
        (left_x, side_y),
        (left_x, shoulder_y),
        (cx - width * 0.28, top_y + height * 0.02),
    ])
    
    if fill_color:
        draw.polygon(points, fill=fill_color)
    if outline_color and outline_width > 0:
        draw.polygon(points, outline=outline_color, width=outline_width)
    return points

def draw_check_crest(draw, cx, cy, size, color, width):
    """Draws a bold, tactical verification checkmark crest."""
    # Points for checkmark
    start_x = cx - size * 0.32
    start_y = cy + size * 0.02
    
    mid_x = cx - size * 0.08
    mid_y = cy + size * 0.25
    
    end_x = cx + size * 0.38
    end_y = cy - size * 0.26
    
    draw.line([(start_x, start_y), (mid_x, mid_y)], fill=color, width=width)
    draw.line([(mid_x, mid_y), (end_x, end_y)], fill=color, width=width)
    # Add rounded end caps
    r = width // 2
    draw.ellipse([start_x - r, start_y - r, start_x + r, start_y + r], fill=color)
    draw.ellipse([mid_x - r, mid_y - r, mid_x + r, mid_y + r], fill=color)
    draw.ellipse([end_x - r, end_y - r, end_x + r, end_y + r], fill=color)

def create_master_emblem(size=2048, is_foreground_only=False):
    """Creates high-resolution master emblem image."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = size // 2, size // 2

    if not is_foreground_only:
        # Background: Dark cyber tactical base (#0A0C10 to #141824 radial gradient effect)
        bg = Image.new("RGBA", (size, size), (10, 12, 16, 255))
        bg_draw = ImageDraw.Draw(bg)
        
        # Subtle radial ambient glow in center
        for r in range(size // 2, 0, -16):
            alpha = int(45 * (1 - r / (size // 2)))
            # Cyan/teal subtle ambient light
            bg_draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(0, 240, 255, alpha))
        
        img.paste(bg, (0, 0))
        draw = ImageDraw.Draw(img)

        # Subtle tactical crosshair / reticle lines
        grid_col = (0, 229, 163, 16)
        draw.line([(0, cy), (size, cy)], fill=grid_col, width=4)
        draw.line([(cx, 0), (cx, size)], fill=grid_col, width=4)
        draw.ellipse([cx - size * 0.4, cy - size * 0.4, cx + size * 0.4, cy + size * 0.4], outline=grid_col, width=4)

    # Calculate shield sizing
    if is_foreground_only:
        # Adaptive icon safe zone: 72dp out of 108dp = 66.6% safe circle
        shield_w = size * 0.58
        shield_h = size * 0.64
    else:
        shield_w = size * 0.72
        shield_h = size * 0.80

    # 1. Outer Neon Glow Shield
    glow_color = (0, 240, 255, 120) if is_foreground_only else (0, 240, 255, 90)
    draw_shield_path(draw, cx, cy, shield_w * 1.05, shield_h * 1.05, fill_color=None, outline_color=glow_color, outline_width=int(size * 0.025))

    # 2. Main Outer Shield Rim (Neon Cyan to Emerald #00F0FF / #00E5A3)
    rim_color = (0, 229, 163, 255)
    draw_shield_path(draw, cx, cy, shield_w, shield_h, fill_color=(14, 20, 30, 255), outline_color=rim_color, outline_width=int(size * 0.032))

    # 3. Inner Carbon Armor Plate
    plate_color = (20, 28, 42, 255)
    plate_rim = (0, 240, 255, 180)
    draw_shield_path(draw, cx, cy, shield_w * 0.86, shield_h * 0.86, fill_color=plate_color, outline_color=plate_rim, outline_width=int(size * 0.012))

    # 4. Central Core Crest (Defense Verification Checkmark)
    crest_size = shield_w * 0.65
    # Glow behind checkmark
    draw_check_crest(draw, cx, cy, crest_size, (0, 240, 255, 100), width=int(size * 0.065))
    # Sharp checkmark
    draw_check_crest(draw, cx, cy, crest_size, (0, 229, 163, 255), width=int(size * 0.045))
    # High-intensity white center highlight
    draw_check_crest(draw, cx, cy, crest_size, (255, 255, 255, 240), width=int(size * 0.022))

    # 5. Top cyber notch accent
    notch_w = shield_w * 0.22
    notch_h = size * 0.02
    notch_y = cy - shield_h * 0.44
    draw.rectangle([cx - notch_w // 2, notch_y, cx + notch_w // 2, notch_y + notch_h], fill=(0, 240, 255, 255))

    return img

def create_round_icon(full_icon):
    """Crops a full icon into a circle with an anti-aliased mask."""
    size = full_icon.size[0]
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse([0, 0, size, size], fill=255)
    
    round_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    round_img.paste(full_icon, (0, 0), mask=mask)
    return round_img

def main():
    print("[*] Generating master Aegis high-resolution assets...")
    master_full = create_master_emblem(SUPER_SIZE, is_foreground_only=False)
    master_foreground = create_master_emblem(SUPER_SIZE, is_foreground_only=True)
    master_round = create_round_icon(master_full)

    # 1. Google Play Store Listing Icon (512x512 PNG, RGBA, 32-bit, max 1024KB)
    print("[*] Generating Google Play Store 512x512 icon...")
    play_icon = master_full.resize((512, 512), Image.Resampling.LANCZOS)
    play_icon.save(PLAY_STORE_ROOT, "PNG", optimize=True)
    play_icon.save(PLAY_STORE_RES, "PNG", optimize=True)
    play_icon.save(PUBLIC_DIR / "icon-512.png", "PNG", optimize=True)
    print(f"    -> Saved {PLAY_STORE_ROOT}")
    print(f"    -> Saved {PLAY_STORE_RES}")

    # 2. Android Density Specifications
    # Adaptive Foreground (108dp base canvas)
    # Legacy Square / Round (48dp base canvas)
    densities = {
        "mipmap-mdpi": {"legacy": 48, "foreground": 108},
        "mipmap-hdpi": {"legacy": 72, "foreground": 162},
        "mipmap-xhdpi": {"legacy": 96, "foreground": 216},
        "mipmap-xxhdpi": {"legacy": 144, "foreground": 324},
        "mipmap-xxxhdpi": {"legacy": 192, "foreground": 432},
    }

    print("[*] Generating Android mipmap densities...")
    for folder, specs in densities.items():
        target_dir = RES_DIR / folder
        target_dir.mkdir(parents=True, exist_ok=True)
        
        legacy_sz = specs["legacy"]
        fg_sz = specs["foreground"]
        
        # ic_launcher.png (Legacy square)
        img_legacy = master_full.resize((legacy_sz, legacy_sz), Image.Resampling.LANCZOS)
        img_legacy.save(target_dir / "ic_launcher.png", "PNG", optimize=True)
        
        # ic_launcher_round.png (Legacy round)
        img_round = master_round.resize((legacy_sz, legacy_sz), Image.Resampling.LANCZOS)
        img_round.save(target_dir / "ic_launcher_round.png", "PNG", optimize=True)
        
        # ic_launcher_foreground.png (Adaptive foreground)
        img_fg = master_foreground.resize((fg_sz, fg_sz), Image.Resampling.LANCZOS)
        img_fg.save(target_dir / "ic_launcher_foreground.png", "PNG", optimize=True)
        
        print(f"    -> {folder}: ic_launcher ({legacy_sz}px), ic_launcher_round ({legacy_sz}px), ic_launcher_foreground ({fg_sz}px)")

    # 3. Web favicon / PWA icons
    pwa_192 = master_full.resize((192, 192), Image.Resampling.LANCZOS)
    pwa_192.save(PUBLIC_DIR / "icon-192.png", "PNG", optimize=True)
    print("    -> Updated web PWA icon-192.png and icon-512.png")

    print("[+] All Android & Play Store icons generated successfully!")

if __name__ == "__main__":
    main()
