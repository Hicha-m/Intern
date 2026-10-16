"""Run this TP's Compose with Docker or Podman and portable health waiting."""
import sys

from outils import compose

if len(sys.argv) == 1:
    raise SystemExit('Usage: python3 docker/lancer.py up -d --build --wait')
result = compose(*sys.argv[1:], timeout=900)
print(result.stdout, end='')
print(result.stderr, end='', file=sys.stderr)
