"""Fictitious, structured salary fixture restricted to the acceptance database."""
import json
import os
from pathlib import Path
from uuid import uuid4
from django.conf import settings
from jobboard.models import DiscoveryQuery, OfferSource
from jobboard.services.jobspy_collection import ingest
from jobboard.tests.test_jobspy_collection import record
from jobboard.tests.test_salary_normalization import salary

if settings.DATABASES['default']['NAME'] != 'intern_market_test':
    raise RuntimeError('Use the isolated intern_market_test database.')
identity = uuid4().hex
query = DiscoveryQuery.objects.create(provider='jobspy_indeed', country='FR', language='fr', term=identity)
raw = record(title=f'Salary {identity} Backend Engineer', company=f'Entreprise fictive salaire {identity}', url=f'https://www.indeed.com/viewjob?jk={identity}', compensation=salary()['compensation'])
assert ingest(query, [raw]) == 1
source = OfferSource.objects.get(board__board_key__contains='indeed', raw_payload__company=raw['company'])
assert source.salary_projection['status'] == 'published'
assert source.compensation_bands.get().source_revision.source_id == source.pk
Path(os.environ['RECETTE_SALARY_MANIFEST']).write_text(json.dumps({'offer_id': source.offer_id, 'source_id': source.pk, 'revision_id': source.compensation_bands.get().source_revision_id, 'title': raw['title']}))
print('Prepared one fictitious published hourly salary with retained source revision.')
