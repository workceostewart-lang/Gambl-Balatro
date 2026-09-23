"""Audit the shipped asset bundle using Python's standard library.

Run: python scripts/audit_assets.py
Checks PNG integrity, local icon/manifest paths, and required release files.
"""
from pathlib import Path
import json
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]
art = ROOT / 'public' / 'casino-art.png'
data = art.read_bytes()
assert data[:8] == b'\x89PNG\r\n\x1a\n', 'Cover art must be a PNG'
offset = 8
while offset < len(data):
    length = struct.unpack('>I', data[offset:offset+4])[0]
    chunk = data[offset+4:offset+8+length]
    expected = struct.unpack('>I', data[offset+8+length:offset+12+length])[0]
    assert zlib.crc32(chunk) & 0xffffffff == expected, 'PNG checksum mismatch'
    offset += length + 12
width, height = struct.unpack('>II', data[16:24])
assert width >= 1024 and height >= 1024, 'Cover must be high resolution'
manifest = json.loads((ROOT / 'public' / 'manifest.webmanifest').read_text())
assert manifest['orientation'] == 'landscape'
for icon in manifest['icons']:
    assert (ROOT / 'public' / icon['src'].lstrip('/')).is_file()
for required in ['.agent', 'AGENTS.md', 'Gamble_Balatro_PRD.md', 'wrangler.jsonc']:
    assert (ROOT / required).is_file(), f'Missing {required}'
print(json.dumps({'asset_audit': 'passed', 'art_dimensions': [width, height], 'art_bytes': len(data), 'orientation': manifest['orientation']}))
