"""Verify the actual topology, data, negative connections and HTTP session."""
import hashlib
import json
import platform
import socket
import urllib.error
import urllib.request
from datetime import datetime, timezone
from http.cookiejar import CookieJar

from outils import ENGINE, ROOT, compose, containers, health, port, run

proofs = []
rows = containers()
assert set(rows) == {'proxy', 'metier', 'donnees'}
for name, row in rows.items():
    assert row['State']['Running'] and health(row) == 'healthy', name
    assert row['RestartCount'] == 0, name
    assert len(row['NetworkSettings']['Networks']) == (2 if name == 'metier' else 1), name
    if name != 'proxy':
        assert not any(row['HostConfig']['PortBindings'].values()), name
proxy_networks = set(rows['proxy']['NetworkSettings']['Networks'])
data_networks = set(rows['donnees']['NetworkSettings']['Networks'])
assert not proxy_networks.intersection(data_networks)
assert proxy_networks | data_networks == set(rows['metier']['NetworkSettings']['Networks'])
network_name = next(iter(data_networks))
network = json.loads(run([ENGINE, 'network', 'inspect', network_name]).stdout)[0]
assert network.get('Internal', network.get('internal', False))
proofs.append('PASS — exactement trois services sains, deux réseaux, seul proxy publié')


def address(service, network):
    return rows[service]['NetworkSettings']['Networks'][network]['IPAddress']


front = next(iter(proxy_networks))
targets = {'proxy': (address('proxy', front), 80),
           'metier': (address('metier', front), 8000),
           'donnees': (address('donnees', network_name), 5432)}
matrix = []
expected = {'proxy': {'metier': True, 'donnees': False},
            'metier': {'proxy': True, 'donnees': True},
            'donnees': {'proxy': False, 'metier': True}}
for source, destinations in expected.items():
    for target, allowed in destinations.items():
        host, tcp_port = targets[target]
        if source == 'donnees' and target == 'metier':
            host = address('metier', network_name)
        if source == 'metier':
            code = f'import socket; socket.create_connection(({host!r},{tcp_port}),timeout=2).close()'
            result = compose('exec', '-T', source, '.venv/bin/python', '-c', code, check=False)
        elif source == 'proxy':
            result = compose('exec', '-T', source, 'nc', '-z', '-w', '2', host, str(tcp_port), check=False)
        else:
            result = compose('exec', '-T', source, 'bash', '-c',
                             f'timeout 2 bash -c "</dev/tcp/{host}/{tcp_port}"', check=False)
        success = result.returncode == 0
        assert success == allowed, (source, target, result.stderr)
        matrix.append({'from': source, 'to': target, 'allowed': allowed,
                       'connected': success, 'returncode': result.returncode})
for target in ('metier', 'donnees'):
    host, tcp_port = targets[target]
    try:
        socket.create_connection((host, tcp_port), timeout=2).close()
    except OSError:
        success = False
    else:
        success = True
    assert not success, f'Host reaches {target}; on native Linux run isoler_hote.py first'
    matrix.append({'from': 'host', 'to': target, 'allowed': False, 'connected': False})
proofs.append('PASS — huit connexions TCP positives/négatives, services démarrés')

sql = compose('exec', '-T', 'metier', '.venv/bin/python', '/app/donnees/verifier.py').stdout
assert 'PASS' in sql and '34' in sql
proofs.append('PASS — 34 vérifications SQL, écritures de contrôle annulées')
role = compose('exec', '-T', 'metier', '.venv/bin/python', '-c',
               'import psycopg; c=psycopg.connect(""); '
               'print(c.execute("SELECT rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname=current_user").fetchone())').stdout
assert '(False, False, False)' in role
compose('exec', '-T', 'metier', '.venv/bin/python', 'app/manage.py', 'seed_dev', '--help')
compose('exec', '-T', 'metier', '.venv/bin/python', 'app/manage.py', 'migrate', '--check')
proofs.append('PASS — rôle SQL sans privilèges administrateur, migrations et ressources seed disponibles')

base = f'http://127.0.0.1:{port()}'
client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))


def request(path, body=None, csrf=None, expected_status=200):
    headers = {'Content-Type': 'application/json'}
    if csrf:
        headers['X-CSRFToken'] = csrf
    req = urllib.request.Request(base + path, headers=headers,
                                 data=json.dumps(body).encode() if body is not None else None)
    try:
        response = client.open(req, timeout=15)
    except urllib.error.HTTPError as error:
        response = error
    assert response.code == expected_status, (path, response.code)
    return response.read()


assert json.loads(request('/health/ready/'))['status'] == 'ok'
matrix.append({'from': 'host', 'to': 'proxy', 'allowed': True,
               'connected': True, 'protocol': 'HTTP', 'status': 200})
assert json.loads(request('/api/v1/offers/'))['count'] == 4
request('/api/v1/auth/me/', expected_status=401)
request('/api/v1/auth/login/', {'username': 'alice@example.test', 'password': 'Intern-Demo-2026!'}, expected_status=403)
csrf = json.loads(request('/api/v1/auth/csrf/'))['csrf_token']
request('/api/v1/auth/login/', {'username': 'alice@example.test', 'password': 'Intern-Demo-2026!'}, csrf)
me = json.loads(request('/api/v1/auth/me/'))
assert me['user']['role'] == 'candidate'
applications = json.loads(request('/api/v1/applications/'))
assert applications['count'] == 1
request('/api/v1/applications/999999/', expected_status=404)
request('/api/v1/profile/')
# Check the three seeded files independently of API serializer field names.
pdf_checks = compose('exec', '-T', 'metier', '.venv/bin/python', '-c',
                    'from pathlib import Path; import hashlib; '
                    'p=Path("/app/donnees/cv_fictif.pdf"); '
                    'assert all(hashlib.sha256(Path("/app/.private-media/dev",a,"cv.pdf").read_bytes()).digest()==hashlib.sha256(p.read_bytes()).digest() for a in ("alice","bob","vide")); print("PDF OK")').stdout
assert 'PDF OK' in pdf_checks
request('/register')
request('/static/admin/css/base.css')
proofs.append('PASS — proxy, catalogue, session, CSRF, consultation protégée, fichiers CV et statiques')

destination = ROOT / 'docker/docs'
destination.mkdir(parents=True, exist_ok=True)
report = {'timestamp_utc': datetime.now(timezone.utc).isoformat(),
          'engine': ENGINE,
          'host': {'system': platform.system(), 'release': platform.release(), 'machine': platform.machine()},
          'matrix': matrix, 'checks': proofs,
          'images': {name: {'id': row['Image'], 'reference': row['Config']['Image']}
                     for name, row in rows.items()},
          'inputs_sha256': {str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest()
                            for path in [ROOT / 'donnees/schema.sql', ROOT / 'donnees/data.sql']}}
(destination / 'verification.json').write_text(json.dumps(report, indent=2) + '\n')
(destination / 'verification.txt').write_text('\n'.join(proofs) + '\n\n' + sql)
print('\n'.join(proofs))
