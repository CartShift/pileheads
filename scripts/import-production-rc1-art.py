#!/usr/bin/env python3
"""Import the reviewed RC1 card art from three verified local Drive ZIPs.

Default: validate inputs and print proposed changes. --apply requires the
review branch (or another non-main branch). No network or dependency required.
This is intentionally not a deployment command.
"""
import argparse
import hashlib
import pathlib
import subprocess
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
SPRITES = "PILEHEADS_RC1_SPRITES.zip"
DIGITAL = "PILEHEADS_RC1_DIGITAL_CARDS.zip"
WEB = "PILEHEADS_WEBSITE_RC1.zip"
ARCHIVES = {
    SPRITES: "6fa6841f5979c5606f90d619586fb61aedf78274ddc7ef0d0624834ca90616de",
    DIGITAL: "97b0310106f8deea481821423e9907fafdd9793e6216bf764e8de7f521454776",
    WEB: "9d9d865b7b76ae880de750b043818db95a42b02b421bf86355782d77bf0d231c",
}
A = "dist/pilehead/assets/"
W = "apps/web/public/stack-media/"
LEGACY = "47911aba6fabeedb9e79fb41ae16e3716dfc0f1709729370fd2741414f33b0b7"
LARGE = "f6b08009942aaae5463adc48ddee5611914f6456a075a883aa830df17c24e6d5"
DESKTOP = "f42c81c25580fa955d5fa6543d57d4f1a809e0c2066e55f165475e9babf4f6f4"
MOBILE = "77938a59990c181523fdf687fe89270d281ab0f1d97a066c1c6f8d420cb27f56"
BACK300 = "016e9301d892b788a1308a5b5e7ae87af7b15831601b94db7ecbfb1173898157"
BACK440 = "6cda1999f30cc205cf7b4679b7f0e4467131cef74382ffaa53d2ee4c3dae888a"
BACK504 = "d4e383786bab607d04472e8a5c05a01953b674c59e29dadcd649c14099fbda79"
FILES = [
    (A+"stack-characters.webp", SPRITES, "pileheads-faces-rc1-legacy-compat.webp", LEGACY, (1008,1420)),
    (A+"stack-characters-v2.webp", SPRITES, "pileheads-faces-rc1-large.webp", LARGE, (1600,2236)),
    (W+"stack-home-faces-v2.webp", WEB, "pileheads-home-faces-v2.webp", LARGE, (1600,2236)),
    (W+"stack-home-faces-web-desktop.webp", WEB, "pileheads-home-faces-web-desktop.webp", DESKTOP, (1200,1676)),
    (W+"stack-home-faces-web-mobile.webp", WEB, "pileheads-home-faces-web-mobile.webp", MOBILE, (800,1120)),
    (A+"stack-back.webp", DIGITAL, "pileheads-back-rc1-440.webp", BACK440, (440,615)),
    (A+"stack-back-v2.webp", DIGITAL, "pileheads-back-rc1-504.webp", BACK504, (504,704)),
    (W+"stack-home-back-web.webp", WEB, "pileheads-home-back-web.webp", BACK300, (300,419)),
    (W+"stack-home-back-v2.webp", WEB, "pileheads-home-back-v2.webp", BACK440, (440,615)),
]
OLD = {
 A+"stack-characters.webp": "bf0000d9381a1866d25ae8c69f646775b3f30ae161cac516131139a333533bc5",
 A+"stack-characters-v2.webp": "ca6ee8d7012202b90362eb6e19f58c05e29fb36027cfa7a3900b56300de6674e",
 W+"stack-home-faces-v2.webp": "ca6ee8d7012202b90362eb6e19f58c05e29fb36027cfa7a3900b56300de6674e",
 W+"stack-home-faces-web-desktop.webp": "c9a2d653b7afb423022e709d418d4f9f6d39d520b938af8e530c4ea0e88a9b18",
 W+"stack-home-faces-web-mobile.webp": "b3a6213e2232f5d083d78eb145a71fd229ccb7bd767e34a09645f4db3a7c9ff3",
}
CACHE_FILES = ["apps/web/app/globals.css", "apps/web/app/official-home.module.css",
 W+"stack-design-system.css", "dist/pilehead/deck-raster.css", "dist/pilehead/deck-raster.js"]
TEST = "tests/pilehead-raster-assets.cjs"
OLD_CACHE = "white-border-v7.1-back-v8"
NEW_CACHE = "production-rc1"

def sha(b): return hashlib.sha256(b).hexdigest()

def dimensions(b):
    if b[:4] != b"RIFF" or b[8:12] != b"WEBP" or b[12:16] != b"VP8X":
        raise ValueError("Unexpected WebP format")
    return (1+int.from_bytes(b[24:27],"little"),1+int.from_bytes(b[27:30],"little"))

def require(ok, msg):
    if not ok: raise SystemExit(msg)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive_directory", type=pathlib.Path)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    require(not args.apply or subprocess.check_output(
        ["git","branch","--show-current"], cwd=ROOT, text=True).strip()
        not in ("main","master",""), "Use a review branch, not main or detached HEAD")
    blobs = {}
    for name,digest in ARCHIVES.items():
        p=args.archive_directory/name
        require(p.is_file() and sha(p.read_bytes())==digest, f"Archive missing or changed: {name}")
        with zipfile.ZipFile(p) as z:
            require(z.testzip() is None, f"Invalid archive: {name}")
            for dest,archive,member,expected,size in FILES:
                if archive != name: continue
                b=z.read(member)
                require(sha(b)==expected and dimensions(b)==size, f"Wrong data: {member}")
                blobs[dest]=b
    edits={}
    for dest,b in blobs.items():
        p=ROOT/dest
        require(p.is_file(), f"Missing current asset: {dest}")
        if dest in OLD:
            require(sha(p.read_bytes()) in (OLD[dest],sha(b)), f"Current art changed: {dest}; review manually")
        edits[p]=b
    for dest in CACHE_FILES:
        p=ROOT/dest; t=p.read_text()
        require(any(x in t for x in (OLD_CACHE,"white-border-v8",NEW_CACHE)), f"Cache marker missing: {dest}")
        edits[p]=t.replace(OLD_CACHE,NEW_CACHE).replace("white-border-v8",NEW_CACHE).encode()
    p=ROOT/TEST; t=p.read_text()
    for dest,_,_,digest,_ in FILES:
        if dest not in OLD: continue
        old=OLD[dest]
        require(old in t or digest in t, f"Test digest not found: {dest}")
        t=t.replace(old,digest)
    t=t.replace(OLD_CACHE,NEW_CACHE).replace("approved V7 sprites with V8 embedded card backs","reviewed RC1 sprites with V8 embedded card backs")
    edits[p]=t.encode()
    for p,b in edits.items():
        print(("UPDATE" if p.read_bytes()!=b else "OK"),p.relative_to(ROOT),sha(b))
    if args.apply:
        for p,b in edits.items():
            if p.read_bytes()!=b: p.write_bytes(b)
        print("Review git diff, run npm run test:pilehead-art, npm test, npm run build, and browser acceptance before merging.")
    else: print("Dry run only. No files written.")

if __name__ == "__main__": main()
