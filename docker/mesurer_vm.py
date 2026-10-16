"""Repeat the reference VM protocol on the comparison host, without editing guests."""
import argparse
import json
import os
import platform
import statistics
import subprocess
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from outils import ROOT

parser = argparse.ArgumentParser()
parser.add_argument('vm_directory', type=Path)
args = parser.parse_args()
names = ('vm-donnees', 'vm-metier', 'vm-proxy')


def vbox(*arguments):
    return subprocess.check_output(['VBoxManage', *arguments], text=True, timeout=60)


def info(name):
    return {key.strip('"'): value.strip('"') for key, value in
            (line.split('=', 1) for line in vbox('showvminfo', name, '--machinereadable').splitlines()
             if '=' in line)}


def stop_all():
    for name in names:
        if info(name)['VMState'] == 'running':
            vbox('controlvm', name, 'acpipowerbutton')
    deadline = time.monotonic() + 120
    while any(info(name)['VMState'] != 'poweroff' for name in names):
        if time.monotonic() > deadline:
            raise TimeoutError('Graceful VM shutdown failed; no forced poweroff used')
        time.sleep(2)


configuration = {name: info(name) for name in names}
url = 'http://127.0.0.1:8080/api/v1/offers/'
headers = {'Host': os.environ['TP_COMPARISON_HOST']} if os.environ.get('TP_COMPARISON_HOST') else {}


def consult():
    start = time.perf_counter()
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=5) as response:
        data = json.load(response)
        assert response.geturl() == url, 'External redirect: not a local measurement'
        assert response.status == 200 and data['count'] == 4
    return (time.perf_counter() - start) * 1000


def memory():
    result = {}
    for directory in Path('/proc').iterdir():
        if not directory.name.isdigit():
            continue
        try:
            command = (directory / 'cmdline').read_bytes().split(b'\0')
            if not command or Path(command[0].decode()).name not in ('VBoxHeadless', 'VirtualBoxVM'):
                continue
            for name in names:
                if configuration[name]['UUID'].encode() in command:
                    line = next(line for line in (directory / 'status').read_text().splitlines()
                                if line.startswith('VmRSS:'))
                    result[name] = int(line.split()[1]) * 1024
        except (OSError, StopIteration):
            continue
    assert set(result) == set(names)
    return result


trials = []
for trial in range(1, 4):
    stop_all()
    start = time.perf_counter()
    for name in names:
        vbox('startvm', name, '--type', 'headless')
    deadline = time.monotonic() + 240
    while True:
        try:
            consult()
            break
        except Exception:
            if time.monotonic() > deadline:
                raise
            time.sleep(0.5)
    startup = time.perf_counter() - start
    time.sleep(30)
    ram = memory()
    disks = []
    for name in names:
        for path in (args.vm_directory / 'machines' / name).rglob('*'):
            if path.suffix.lower() in ('.vdi', '.vmdk', '.vhd'):
                stat = path.stat()
                disks.append({'file': str(path.relative_to(args.vm_directory)),
                              'bytes': stat.st_size, 'allocated_bytes': stat.st_blocks * 512})
    latencies = [consult() for _ in range(10)]
    result = {'trial': trial, 'startup_s': startup, 'memory': ram,
              'rss_bytes': sum(ram.values()), 'disk': disks,
              'latencies_ms': latencies, 'latency_median_ms': statistics.median(latencies)}
    trials.append(result)
    print(f'VM trial {trial}: startup={startup:.3f}s, latency={result["latency_median_ms"]:.3f}ms', flush=True)
stop_all()
report = {'finished_utc': datetime.now(timezone.utc).isoformat(),
          'host': {'system': platform.system(), 'release': platform.release(),
                   'cpu': next(line.split(':', 1)[1].strip() for line in Path('/proc/cpuinfo').read_text().splitlines()
                               if line.startswith('model name'))},
          'virtualbox': vbox('--version').strip(),
          'configuration': {name: {key: row[key] for key in ('UUID', 'memory', 'cpus', 'paravirtprovider', 'effparavirtprovider')}
                            for name, row in configuration.items()},
          'protocol': {'trials': 3, 'idle_s': 30, 'requests_per_trial': 10,
                       'url': url, 'host_header': headers.get('Host'),
                       'shutdown': 'ACPI, no forced poweroff', 'cache': 'Host disk cache retained'},
          'trials': trials,
          'medians': {'startup_s': statistics.median(t['startup_s'] for t in trials),
                      'latency_ms': statistics.median(t['latency_median_ms'] for t in trials),
                      'rss_bytes': statistics.median(t['rss_bytes'] for t in trials),
                      'disk_file_bytes': statistics.median(sum(d['bytes'] for d in t['disk']) for t in trials),
                      'disk_allocated_bytes': statistics.median(sum(d['allocated_bytes'] for d in t['disk']) for t in trials)}}
destination = ROOT / 'docker/docs'
destination.mkdir(parents=True, exist_ok=True)
(destination / 'mesures-vm-fedora.json').write_text(json.dumps(report, indent=2) + '\n')
print('VM off; three reference trials recorded.')
