"""Prove persistence after deleting containers, preserving the named volumes."""
import json
from datetime import datetime, timezone

from outils import ROOT, compose, containers

rows = containers()
volume = next(mount['Name'] for mount in rows['donnees']['Mounts']
              if mount['Destination'] == '/var/lib/postgresql/data')
old_id = rows['donnees']['Id']
marker = datetime.now(timezone.utc).isoformat()
compose('exec', '-T', 'donnees', 'sh', '-c',
        'printf "%s" "$1" > /var/lib/postgresql/data/tp-persistence', 'sh', marker)
compose('down', timeout=120)  # Deliberately no --volumes.
compose('up', '-d', '--no-build', '--wait', '--wait-timeout', '180', timeout=210)
rows = containers()
new_volume = next(mount['Name'] for mount in rows['donnees']['Mounts']
                  if mount['Destination'] == '/var/lib/postgresql/data')
assert old_id != rows['donnees']['Id']
assert new_volume == volume
assert compose('exec', '-T', 'donnees', 'cat',
               '/var/lib/postgresql/data/tp-persistence').stdout == marker
sql = compose('exec', '-T', 'metier', '.venv/bin/python', '/app/donnees/verifier.py').stdout
assert 'PASS' in sql and '34' in sql
report = {'timestamp_utc': datetime.now(timezone.utc).isoformat(),
          'volume': volume, 'old_container': old_id, 'new_container': rows['donnees']['Id'],
          'marker_preserved': True, 'sql_checks': 34, 'volume_deleted': False}
destination = ROOT / 'docker/docs'
destination.mkdir(parents=True, exist_ok=True)
(destination / 'persistance.json').write_text(json.dumps(report, indent=2) + '\n')
print('PASS — conteneurs recréés, même volume, marqueur conservé et 34 vérifications SQL.')
