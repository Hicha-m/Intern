"""Generate private configuration for the local TP, without overwriting it."""
import os
import secrets
from pathlib import Path

destination = Path(__file__).resolve().parent / '.env'
flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
try:
    descriptor = os.open(destination, flags, 0o600)
except FileExistsError:
    print('docker/.env existe : configuration conservée.')
else:
    with os.fdopen(descriptor, 'w') as output:
        output.write('TP_PORT=8080\n')
        for name in ('DB_ADMIN_PASSWORD', 'APP_DB_PASSWORD', 'DJANGO_SECRET_KEY'):
            output.write(f'{name}={secrets.token_hex(32)}\n')
    print('docker/.env créé (mode 0600), sans affichage des secrets.')
