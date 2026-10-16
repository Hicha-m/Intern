"""Shared paths and bounded Compose commands for the TP evidence scripts."""
import json
import os
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROJECT = os.environ.get('COMPOSE_PROJECT_NAME', 'intern-tp')
ENGINE = os.environ.get('CONTAINER_ENGINE', 'docker')
if ENGINE not in ('docker', 'podman'):
    raise ValueError('CONTAINER_ENGINE must be docker or podman')
COMPOSE = [ENGINE, 'compose', '--project-name', PROJECT, '--env-file',
           str(ROOT / 'docker/.env'), '-f', str(ROOT / 'docker/compose.yaml')]
if ENGINE == 'podman':
    COMPOSE.insert(2, '--in-pod=false')


def run(args, *, timeout=120, check=True):
    result = subprocess.run(args, text=True, capture_output=True, timeout=timeout)
    if check and result.returncode:
        raise RuntimeError(f'{args[:4]}: {result.stderr[-2000:]}')
    return result


def compose(*args, **kwargs):
    arguments = list(args)
    wait = ENGINE == 'podman' and '--wait' in arguments
    if wait:
        arguments.remove('--wait')
        if '--wait-timeout' in arguments:
            index = arguments.index('--wait-timeout')
            wait_seconds = int(arguments[index + 1])
            del arguments[index:index + 2]
        else:
            wait_seconds = 180
    result = run(COMPOSE + arguments, **kwargs)
    if wait:
        deadline = time.monotonic() + wait_seconds
        while time.monotonic() < deadline:
            ids = run(COMPOSE + ['ps', '-q']).stdout.split()
            if len(ids) == 3:
                rows = json.loads(run([ENGINE, 'inspect', *ids]).stdout)
                if all(health(row) == 'healthy' for row in rows):
                    return result
            time.sleep(1)
        raise TimeoutError('Three services did not become healthy')
    return result


def health(row):
    state = row['State']
    return state.get('Health', state.get('Healthcheck', {})).get('Status')


def containers():
    ids = compose('ps', '-q').stdout.split()
    if len(ids) != 3:
        raise AssertionError(f'Expected exactly 3 running services, got {len(ids)}')
    data = json.loads(run([ENGINE, 'inspect', *ids]).stdout)
    return {row['Config']['Labels']['com.docker.compose.service']: row for row in data}


def port():
    values = dict(line.split('=', 1) for line in (ROOT / 'docker/.env').read_text().splitlines()
                  if '=' in line and not line.startswith('#'))
    return int(os.environ.get('TP_PORT', values.get('TP_PORT', '8080')))
