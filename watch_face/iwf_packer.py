import argparse
import struct
from pathlib import Path

from PIL import Image

HEADER_FMT = "<4sHH"
ENTRY_FMT = "<32sII"

IMAGE_EXTS = {".png", ".bmp"}


def pack_rgb565(r, g, b):
    r5 = (r >> 3) & 0x1F
    g6 = (g >> 2) & 0x3F
    b5 = (b >> 3) & 0x1F
    return (r5 << 11) | (g6 << 5) | b5


def convert_auto_png_to_veryfit_raw(path: Path, force_opaque_preview=False):
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    pixels = list(img.getdata())

    has_alpha = (
        not force_opaque_preview
        and any(a != 255 for _, _, _, a in pixels)
    )

    rgb565 = bytearray()
    for r, g, b, a in pixels:
        px = pack_rgb565(r, g, b)
        # Big-endian RGB565
        rgb565.append((px >> 8) & 0xFF)
        rgb565.append(px & 0xFF)

    alpha_a4 = bytearray()
    if has_alpha:
        for i in range(0, len(pixels), 2):
            a0 = pixels[i][3]
            a0_4 = (a0 * 15) // 255

            if i + 1 < len(pixels):
                a1 = pixels[i + 1][3]
                a1_4 = (a1 * 15) // 255
            else:
                a1_4 = 0

            alpha_a4.append((a0_4 << 4) | a1_4)

    header = bytearray(16)
    header[0:4] = b"RAW\x00"
    struct.pack_into("<H", header, 4, w)
    struct.pack_into("<H", header, 6, h)

    if has_alpha:
        header[8] = 0x85
        header[9] = 0x66
        rgb_size = w * h * 2
        struct.pack_into("<H", header, 12, rgb_size)
    else:
        header[8] = 0x85
        header[9] = 0x00

    return bytes(header + rgb565 + alpha_a4)


def load_file_data(path: Path):
    if path.suffix.lower() not in IMAGE_EXTS:
        return path.read_bytes()

    force_preview = path.stem.lower() == "preview"
    return convert_auto_png_to_veryfit_raw(path, force_opaque_preview=force_preview)


def collect_files(input_dir: Path):
    files = []

    for special in ("iwf.json", "iwf1.json", "font.json"):
        p = input_dir / special
        if p.exists():
            files.append((special, p.read_bytes()))

    reserved = {"iwf.json", "iwf1.json", "font.json"}

    root_files = []
    for p in input_dir.iterdir():
        if p.is_file() and p.name not in reserved:
            root_files.append(p)
    root_files.sort(key=lambda p: p.name.lower())

    for p in root_files:
        files.append((p.name, load_file_data(p)))

    for subdir in sorted(
        [d for d in input_dir.iterdir() if d.is_dir()],
        key=lambda d: d.name.lower(),
    ):
        for p in sorted(
            [f for f in subdir.iterdir() if f.is_file()],
            key=lambda f: f.name.lower(),
        ):
            virtual_name = f"{subdir.name}_{p.stem}"
            files.append((virtual_name, load_file_data(p)))

    return files


def build_iwf(files, output_file: Path):
    count = len(files)
    header_size = struct.calcsize(HEADER_FMT)
    entry_size = struct.calcsize(ENTRY_FMT)
    data_start = header_size + count * entry_size

    entries = []
    offset = data_start

    for name, data in files:
        name_bytes = name.encode("ascii")
        if len(name_bytes) >= 32:
            raise ValueError(f"Entry '{name}' exceeds 31 ASCII characters")

        entries.append((
            name_bytes.ljust(32, b"\x00"),
            offset,
            len(data),
        ))
        offset += len(data)

    with open(output_file, "wb") as f:
        f.write(struct.pack(HEADER_FMT, b"iwf\x00", 1, count))
        for entry in entries:
            f.write(struct.pack(ENTRY_FMT, *entry))
        for _, data in files:
            f.write(data)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input_dir")
    ap.add_argument("output_iwf")
    args = ap.parse_args()

    files = collect_files(Path(args.input_dir))
    build_iwf(files, Path(args.output_iwf))

    print(f"Packed {len(files)} files -> {args.output_iwf}")


if __name__ == "__main__":
    main()
