"""Three stop/start trials and raw metrics; never deletes the TP volumes."""
import hashlib
import json
import os
import platform
import statistics
import time
import urllib.request
from datetime import datetime, timezone

from outils import ENGINE, ROOT, compose, containers, health, port, run

destination = ROOT / 'docker/docs'
destination.mkdir(parents=True, exist_ok=True)
rows = containers()
for name, row in rows.items():
    assert health(row) == 'healthy', name
marker = 'intern-tp-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
compose('exec', '-T', 'donnees', 'sh', '-c',
        'printf "%s" "$1" > /var/lib/postgresql/data/tp-persistence', 'sh', marker)
images = {}
for name, row in rows.items():
    data = json.loads(run([ENGINE, 'image', 'inspect', row['Image']]).stdout)[0]
    images[name] = {'id': data['Id'], 'bytes': data['Size'],
                    'reference': row['Config']['Image'], 'digests': data.get('RepoDigests', [])}
volumes = {mount['Name']: mount['Source'] for row in rows.values()
           for mount in row['Mounts'] if mount['Type'] == 'volume'}
host = {'system': platform.system(), 'release': platform.release(),
        'machine': platform.machine(), 'processor': platform.processor()}
if platform.system() == 'Linux':
    from pathlib import Path
    for line in Path('/proc/cpuinfo').read_text().splitlines():
        if line.startswith('model name'):
            host['cpu'] = line.split(':', 1)[1].strip()
            break
    host['distribution'] = platform.freedesktop_os_release().get('PRETTY_NAME', '')
    meminfo = Path('/proc/meminfo').read_text().splitlines()
    host['memory_bytes'] = int(meminfo[0].split()[1]) * 1024
    host['docker_desktop_vm_accounted'] = 'not applicable: native Linux'
else:
    host['docker_desktop_vm_accounted'] = False
    host['limitation'] = 'Relever séparément la mémoire et le disque de la VM Docker Desktop.'

url = f'http://127.0.0.1:{port()}/api/v1/offers/'


def consult():
    started = time.perf_counter()
    headers = {'Host': os.environ['TP_COMPARISON_HOST']} if os.environ.get('TP_COMPARISON_HOST') else {}
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=5) as response:
        data = json.load(response)
        assert response.geturl() == url, 'External redirect: not a local measurement'
        assert response.status == 200 and data['count'] == 4
    return (time.perf_counter() - started) * 1000


trials = []
for trial in range(1, 4):
    compose('stop', timeout=120)
    ids = compose('ps', '-q').stdout.split()
    if ids:
        assert not any(row['State']['Running'] for row in json.loads(run([ENGINE, 'inspect', *ids]).stdout))
    started = time.perf_counter()
    # Start in the background, and measure the first successful catalogue, like the VM protocol.
    compose('up', '-d', '--no-build', timeout=180)
    deadline = time.monotonic() + 180
    while True:
        try:
            consult()
            break
        except Exception:
            if time.monotonic() > deadline:
                raise
            time.sleep(0.5)
    startup_s = time.perf_counter() - started
    time.sleep(30)
    compose('up', '-d', '--no-build', '--wait', '--wait-timeout', '120', timeout=150)
    assert compose('exec', '-T', 'donnees', 'cat',
                   '/var/lib/postgresql/data/tp-persistence').stdout == marker
    current = containers()
    ids = [row['Id'] for row in current.values()]
    stats = run([ENGINE, 'stats', '--no-stream', '--format', '{{json .}}', *ids]).stdout
    statistics_raw = [json.loads(line) for line in stats.splitlines() if line.strip()]
    allocated = {}
    if platform.system() == 'Linux':
        for service, row in current.items():
            for mount in row['Mounts']:
                if mount['Type'] == 'volume' and mount['Name'] not in allocated:
                    value = compose('exec', '-T', '--user', '0', service, 'du', '-sk', mount['Destination']).stdout
                    allocated[mount['Name']] = int(value.split()[0]) * 1024
    engine = run(['ps', '-eo', 'comm=,rss=']).stdout
    engine_rss = sum(int(line.split()[-1]) * 1024 for line in engine.splitlines()
                     if line.split() and any(word in line.split()[0]
                     for word in ('dockerd', 'containerd', 'rootlesskit', 'conmon', 'pasta', 'aardvark-dns')))
    latencies = [consult() for _ in range(10)]
    result = {'trial': trial, 'startup_s': startup_s, 'latencies_ms': latencies,
              'latency_median_ms': statistics.median(latencies),
              'container_stats': statistics_raw, 'engine_rss_bytes_shared': engine_rss,
              'volume_allocated_bytes': allocated, 'persistence_marker_preserved': True}
    trials.append(result)
    print(f'Trial {trial}: startup={startup_s:.3f}s, latency={result["latency_median_ms"]:.3f}ms', flush=True)

report = {'finished_utc': datetime.now(timezone.utc).isoformat(), 'host': host,
          'engine': ENGINE,
          'engine_version': run([ENGINE, 'version', '--format', 'json' if ENGINE == 'podman' else '{{json .Server}}']).stdout.strip(),
          'compose_version': run([ENGINE, 'compose', 'version']).stdout.strip(),
          'protocol': {'trials': 3, 'idle_s': 30, 'requests_per_trial': 10, 'url': url,
                       'startup': 'From three stopped containers to the first complete HTTP 200 catalogue.',
                       'cache': 'Host disk cache retained; no persistent HTTP connection.',
                       'memory': 'Raw Docker stats plus native engine RSS; engine shared with other projects.',
                       'disk': 'Logical image sizes and allocated bytes of this project volumes, separately.'},
          'images': images, 'trials': trials,
          'medians': {'startup_s': statistics.median(t['startup_s'] for t in trials),
                      'latency_ms': statistics.median(t['latency_median_ms'] for t in trials)},
          'inputs_sha256': {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
                            for p in [ROOT / 'donnees/schema.sql', ROOT / 'donnees/data.sql']},
          'limitations': ['Comparer uniquement sur le même hôte que les VM.',
                          'Le moteur natif est partagé : sa RSS entière ne mesure pas un coût attribuable au TP.',
                          'Les tailles logiques des images comptent potentiellement des couches partagées.',
                          'Pas une campagne JMeter ; aucun débit ni saturation mesuré.']}
(destination / 'mesures-docker.json').write_text(json.dumps(report, indent=2) + '\n')
print('Trois séries terminées ; volume conservé, JSON brut enregistré.')
