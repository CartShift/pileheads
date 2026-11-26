#!/usr/bin/env python3
"""Import the reviewed RC3 card art from three verified local Drive ZIPs.

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
SPRITES = "PILEHEADS_RC3_SPRITES.zip"
DIGITAL = "PILEHEADS_RC3_DIGITAL_CARDS.zip"
WEB = "PILEHEADS_WEBSITE_RC3.zip"
ARCHIVES = {
    SPRITES: "f76138692d2a185ca70c1cbabf8d7703eab498b08a9ffdbba9b8ae2254aea003",
    DIGITAL: "5096878dda9a0c0b9cbcbea648bc2008cfb64da548a316a27ded6f67c1041b5e",
    WEB: "ef682d468fde196a068ac24e185b93293aa3a8ac99b48384c4001a244c3424e8",
}
A = "dist/pilehead/assets/"
W = "apps/web/public/stack-media/"
LEGACY = "4d739a521736a4636aeb32d0055fab7c2d417742b85da92a4bbd43a34523b1fe"
LARGE = "3e135d338857081ac6506fabbc49aacd0797f60979181902605cdc94a4a9616d"
DESKTOP = "3fa7be9373dc62883bb35bd8d2bbaf5b84cf8137882ade6f2b979ffbeebeb1bb"
MOBILE = "0715bdab240698123cb882a9321207ee17915ecc5659597d6ade3ba2ed94e500"
BACK300 = "016e9301d892b788a1308a5b5e7ae87af7b15831601b94db7ecbfb1173898157"
BACK440 = "6cda1999f30cc205cf7b4679b7f0e4467131cef74382ffaa53d2ee4c3dae888a"
BACK504 = "d4e383786bab607d04472e8a5c05a01953b674c59e29dadcd649c14099fbda79"
FILES = [
    (A+"stack-characters.webp", SPRITES, "pileheads-faces-rc3-legacy-compat.webp", LEGACY, (1008,1420)),
    (A+"stack-characters-v2.webp", SPRITES, "pileheads-faces-rc3-large.webp", LARGE, (1600,2236)),
    (W+"stack-home-faces-v2.webp", WEB, "pileheads-home-faces-v2.webp", LARGE, (1600,2236)),
    (W+"stack-home-faces-web-desktop.webp", WEB, "pileheads-home-faces-web-desktop.webp", DESKTOP, (1200,1676)),
    (W+"stack-home-faces-web-mobile.webp", WEB, "pileheads-home-faces-web-mobile.webp", MOBILE, (800,1120)),
    (A+"stack-back.webp", DIGITAL, "pileheads-back-rc3-504.webp", BACK504, (504,704)),
    (A+"stack-back-v2.webp", DIGITAL, "pileheads-back-rc3-504.webp", BACK504, (504,704)),
    (W+"stack-home-back-web.webp", WEB, "pileheads-home-back-web.webp", BACK300, (300,419)),
    (W+"stack-home-back-v2.webp", WEB, "pileheads-home-back-v2.webp", BACK440, (440,615)),
    (W+"stack-home-box-web.webp", WEB, "pileheads-home-box-web.webp", "3ffff49708bda55de5a1c1b0ada9a824f96b953b2282c83a81025b213ded93fb", (440,607)),
    (W+"stack-home-box-v2.webp", WEB, "pileheads-home-box-v2.webp", "91335b1e72476ef43730df8aab9e2796c5c6318f3bbf346ddc6367fcdaef50bf", (660,910)),
    (W+"stack-home-box-side-v2.webp", WEB, "pileheads-home-box-side-v2.webp", "79ac8205686a6aea1a925353976266bda77217838fdfb6939387df1825d2eb4f", (242,1000)),
    (W+"stack-home-box-top-v2.webp", WEB, "pileheads-home-box-top-v2.webp", "fa635c36457cce77f68972e8a76afc7dad795476970809c5f348bae98e817e18", (720,240)),
]
# Exact web-only derivatives; download beside the three original ZIPs.
OPTIMIZED = {
    W+"stack-home-faces-web-desktop.webp": ("pileheads-home-faces-web-desktop-optimized.webp", "25aa986728334f33b54b741d8fd972c55a9c7083134ee9f09a4585984acaef2a", (1200,1676),450000),
    W+"stack-home-faces-web-mobile.webp": ("pileheads-home-faces-web-mobile-optimized.webp", "ca58f990836f2cbc49026436a3bf1d187ef2cd09e76c99ef83cfa8224a988044", (800,1120),250000),
}
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
NEW_CACHE = "production-rc3"

def sha(b): return hashlib.sha256(b).hexdigest()

def dimensions(b):
    if b[:4] != b"RIFF" or b[8:12] != b"WEBP":
        raise ValueError("Unexpected WebP format")
    if b[12:16] == b"VP8X":
        return (1+int.from_bytes(b[24:27],"little"),1+int.from_bytes(b[27:30],"little"))
    if b[12:16] == b"VP8 " and b[23:26] == bytes((157,1,42)):
        return (int.from_bytes(b[26:28],"little")&0x3fff,int.from_bytes(b[28:30],"little")&0x3fff)
    raise ValueError("Unsupported WebP header")

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
    for dest,(member,expected,size,budget) in OPTIMIZED.items():
        p=args.archive_directory/member
        require(p.is_file(),f"Missing optimized derivative: {member}")
        b=p.read_bytes()
        require(sha(b)==expected and dimensions(b)==size and len(b)<budget,f"Wrong optimized data: {member}")
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
        digest=sha(blobs[dest])
        require(old in t or digest in t, f"Test digest not found: {dest}")
        t=t.replace(old,digest)
    t=t.replace(OLD_CACHE,NEW_CACHE).replace("approved V7 sprites with V8 embedded card backs","reviewed RC3 sprites with V8 embedded card backs")
    edits[p]=t.encode()
    for p,b in edits.items():
        print(("UPDATE" if p.read_bytes()!=b else "OK"),p.relative_to(ROOT),sha(b))
    if args.apply:
        for p,b in edits.items():
            if p.read_bytes()!=b: p.write_bytes(b)
        print("Review git diff, run npm run test:pilehead-art, npm test, npm run build, and browser acceptance before merging.")
    else: print("Dry run only. No files written.")

if __name__ == "__main__": main()
