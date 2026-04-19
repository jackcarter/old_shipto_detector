#!/usr/bin/env python3

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
ICON_DIR = ROOT / "assets" / "icons"
STORE_DIR = ROOT / "assets" / "store"

NAVY = "#10213B"
NAVY_LIGHT = "#214270"
ORANGE = "#F97316"
CORAL = "#EF4444"
CREAM = "#FAF5EC"
SLATE = "#5E7187"
BG = "#F5F1E8"


def ensure_dirs() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    STORE_DIR.mkdir(parents=True, exist_ok=True)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica Neue.ttc",
        "/System/Library/Fonts/SFNS.ttf",
    ]
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
          return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def rounded(draw: ImageDraw.ImageDraw, box: tuple[float, float, float, float], radius: float, fill: str, outline: str | None = None, width: int = 1) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def gradient_fill(image: Image.Image, start: tuple[int, int, int], end: tuple[int, int, int], horizontal: bool = False) -> None:
    width, height = image.size
    overlay = Image.new("RGBA", image.size)
    pixels = overlay.load()
    for y in range(height):
        for x in range(width):
            mix = (x / max(width - 1, 1)) if horizontal else (y / max(height - 1, 1))
            color = tuple(int(start[idx] + (end[idx] - start[idx]) * mix) for idx in range(3)) + (255,)
            pixels[x, y] = color
    image.alpha_composite(overlay)


def draw_icon(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), NAVY)
    gradient_fill(image, (33, 66, 112), (16, 33, 59))
    draw = ImageDraw.Draw(image)

    draw.ellipse((size * 0.08, size * 0.06, size * 0.42, size * 0.24), fill=(255, 255, 255, 26))
    rounded(draw, (size * 0.2, size * 0.2, size * 0.68, size * 0.78), size * 0.08, CREAM)

    line_fill = "#7A8CA0"
    rounded(draw, (size * 0.28, size * 0.31, size * 0.48, size * 0.36), size * 0.02, line_fill)
    rounded(draw, (size * 0.28, size * 0.43, size * 0.56, size * 0.48), size * 0.02, line_fill)
    rounded(draw, (size * 0.28, size * 0.55, size * 0.46, size * 0.6), size * 0.02, line_fill)

    rounded(draw, (size * 0.55, size * 0.54, size * 0.82, size * 0.81), size * 0.07, ORANGE)
    font = load_font(max(8, int(size * 0.2)), bold=True)
    _, _, width, height = draw.textbbox((0, 0), "!", font=font)
    draw.text(((size * 0.685) - width / 2, (size * 0.675) - height / 2), "!", fill=NAVY, font=font)
    return image


def draw_mark(draw: ImageDraw.ImageDraw, rect: tuple[int, int, int, int]) -> None:
    rounded(draw, rect, (rect[2] - rect[0]) * 0.16, ORANGE)
    inner = (
        rect[0] + (rect[2] - rect[0]) * 0.18,
        rect[1] + (rect[3] - rect[1]) * 0.16,
        rect[2] - (rect[2] - rect[0]) * 0.22,
        rect[3] - (rect[3] - rect[1]) * 0.18,
    )
    rounded(draw, inner, (rect[2] - rect[0]) * 0.08, CREAM)
    line_fill = "#7A8CA0"
    step = (inner[3] - inner[1]) / 4
    rounded(draw, (inner[0] + step * 0.3, inner[1] + step * 0.6, inner[0] + step * 1.55, inner[1] + step * 0.95), step * 0.16, line_fill)
    rounded(draw, (inner[0] + step * 0.3, inner[1] + step * 1.45, inner[0] + step * 1.9, inner[1] + step * 1.8), step * 0.16, line_fill)
    rounded(draw, (inner[0] + step * 0.3, inner[1] + step * 2.3, inner[0] + step * 1.38, inner[1] + step * 2.65), step * 0.16, line_fill)
    badge = (rect[2] - step * 1.65, rect[3] - step * 1.55, rect[2] - step * 0.45, rect[3] - step * 0.35)
    rounded(draw, badge, step * 0.35, NAVY_LIGHT)
    font = load_font(int(step * 0.95), bold=True)
    draw.text((badge[0] + step * 0.34, badge[1] - step * 0.02), "!", fill=CREAM, font=font)


def draw_promo(size: tuple[int, int], title: str, subtitle: str, accent: str, outpath: Path) -> None:
    image = Image.new("RGBA", size, NAVY)
    gradient_fill(image, (33, 66, 112), (16, 33, 59))
    draw = ImageDraw.Draw(image)
    compact = size[0] < 600

    draw.ellipse(
        (
            size[0] * (0.78 if compact else 0.78),
            size[1] * 0.02,
            size[0] * (1.0 if compact else 1.01),
            size[1] * 0.86,
        ),
        fill=(249, 115, 22, 45),
    )
    draw.ellipse((-size[0] * 0.1, size[1] * 0.42, size[0] * 0.34, size[1] * 1.1), fill=(239, 68, 68, 40))
    draw_mark(
        draw,
        (
            int(size[0] * 0.08),
            int(size[1] * 0.2),
            int(size[0] * (0.27 if compact else 0.31)),
            int(size[1] * 0.8),
        ),
    )

    accent_font = load_font(max(16, int(size[1] * (0.05 if compact else 0.045))), bold=True)
    title_font = load_font(max(24, int(size[1] * (0.11 if compact else 0.105))), bold=True)
    subtitle_font = load_font(int(size[1] * (0.055 if compact else 0.058)))
    text_x = size[0] * (0.39 if compact else 0.42)

    draw.text((text_x, size[1] * 0.14), accent.upper(), fill=ORANGE, font=accent_font)
    draw.multiline_text((text_x, size[1] * 0.28), title, fill=CREAM, font=title_font, spacing=size[1] * 0.018)
    draw.multiline_text((text_x, size[1] * 0.62), subtitle, fill=CREAM, font=subtitle_font, spacing=size[1] * 0.015)

    image.save(outpath)


def draw_browser_frame(outpath: Path, headline: str, body: str, detail: str, variant: str) -> None:
    size = (1280, 800)
    image = Image.new("RGBA", size, BG)
    draw = ImageDraw.Draw(image)

    rounded(draw, (50, 56, 1230, 744), 24, "#FFFFFF", outline="#DADFE5")
    rounded(draw, (50, 56, 1230, 120), 24, "#F2F4F7")
    for index, color in enumerate((CORAL, ORANGE, SLATE)):
        draw.ellipse((76 + index * 24, 82, 88 + index * 24, 94), fill=color)

    heading_font = load_font(36, bold=True)
    copy_font = load_font(17)
    label_font = load_font(14, bold=True)
    button_font = load_font(17, bold=True)

    draw.text((92, 146), headline, fill=NAVY, font=heading_font)
    draw.text((92, 194), body, fill=SLATE, font=copy_font)

    labels = ("Name", "Shipping address", "City", "ZIP")
    for idx, top in enumerate((258, 344, 430, 516)):
        draw.text((92, top), labels[idx], fill=NAVY, font=label_font)
        rounded(draw, (92, top + 26, 700, top + 68), 12, "#F8FAFB", outline="#DDE3E8")

    rounded(draw, (92, 620, 272, 666), 14, ORANGE)
    draw.text((116, 633), "Review order", fill=CREAM, font=button_font)

    rounded(draw, (820, 184, 1160, 624), 20, "#FBFCFD", outline="#DDE3E8")
    draw.text((846, 212), detail, fill=NAVY, font=heading_font)

    fills = ["#CAD2DB", "#CAD2DB", "#CAD2DB"]
    if variant == "warning":
        fills[0] = "#FED7AA"
    if variant == "settings":
        fills[2] = "#FED7AA"

    for idx, fill in enumerate(fills):
      rounded(draw, (846, 292 + idx * 44, 1136, 308 + idx * 44), 8, fill)

    if variant == "warning":
        rounded(draw, (140, 118, 1120, 184), 18, NAVY_LIGHT)
        banner_title = load_font(18, bold=True)
        banner_copy = load_font(14, bold=True)
        draw.text((168, 134), "Watchlisted shipping address detected", fill=CREAM, font=banner_title)
        draw.text((168, 158), "123 Main St matches your watchlist.", fill=CREAM, font=banner_copy)

    if variant == "popup":
        rounded(draw, (930, 120, 1160, 310), 18, NAVY_LIGHT)
        popup_title = load_font(18, bold=True)
        popup_copy = load_font(14, bold=True)
        draw.text((946, 144), "Old Address Detector", fill=CREAM, font=popup_title)
        draw.multiline_text((954, 182), "2 watchlisted addresses\nNo current match on this page", fill=CREAM, font=popup_copy, spacing=8)

    image.save(outpath)


def main() -> None:
    ensure_dirs()

    for size in (16, 32, 48, 128):
        draw_icon(size).save(ICON_DIR / f"icon-{size}.png")

    draw_promo(
        (440, 280),
        "Old Address\nDetector",
        "Stop old address mistakes.",
        "Chrome add-on",
        STORE_DIR / "promo-small.png",
    )
    draw_promo(
        (1400, 560),
        "Old Address\nDetector",
        "Catch old shipping addresses before checkout.",
        "Chrome web store",
        STORE_DIR / "promo-marquee.png",
    )

    draw_browser_frame(
        STORE_DIR / "screenshot-1-warning-banner.png",
        "Checkout protection",
        "Detects old shipping addresses in live checkout flows and warns before an order goes through.",
        "Address alert",
        "warning",
    )
    draw_browser_frame(
        STORE_DIR / "screenshot-2-popup.png",
        "Per-site control",
        "Pause scanning, inspect the current page, and ignore specific sites from the toolbar popup.",
        "Popup status",
        "popup",
    )
    draw_browser_frame(
        STORE_DIR / "screenshot-3-settings.png",
        "Manage your watchlist",
        "Store address strings, clean up ignored domains, and export your saved settings.",
        "Settings view",
        "settings",
    )

    print("Generated icons and store assets in assets/.")


if __name__ == "__main__":
    main()
