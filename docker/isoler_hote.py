"""Native Linux: prevent host TCP access to this TP's private container IPs."""
import argparse
import hashlib
import platform

from outils import PROJECT, containers, run

parser = argparse.ArgumentParser()
parser.add_argument('--remove', action='store_true')
args = parser.parse_args()
if platform.system() != 'Linux':
    raise SystemExit('Linux uniquement ; Docker Desktop isole déjà ses IP dans sa VM.')
chain = 'ITP_' + hashlib.sha256(PROJECT.encode()).hexdigest()[:12]


def iptables(*arguments, check=True):
    return run(['iptables', '--wait', *arguments], check=check)


if iptables('-C', 'OUTPUT', '-j', chain, check=False).returncode == 0:
    iptables('-D', 'OUTPUT', '-j', chain)
if args.remove:
    iptables('-F', chain, check=False)
    iptables('-X', chain, check=False)
    print('Filtrage du TP retiré.')
else:
    rows = containers()
    iptables('-N', chain, check=False)
    iptables('-F', chain)
    for service in ('metier', 'donnees'):
        for network in rows[service]['NetworkSettings']['Networks'].values():
            iptables('-A', chain, '-d', network['IPAddress'] + '/32', '-p', 'tcp',
                     '-j', 'REJECT', '--reject-with', 'tcp-reset')
    iptables('-I', 'OUTPUT', '1', '-j', chain)
    print('Filtrage hôte appliqué aux seules IP privées du TP ; réappliquer après recréation.')
