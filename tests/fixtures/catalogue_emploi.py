"""Fictitious catalogue-only seed, restricted to the ephemeral acceptance DB.

Run through manage.py shell after migrate/seed_dev; no external requests.
"""
import json
import os
from pathlib import Path

from django.conf import settings
from jobboard.integrations.public_catalogue import CatalogueSnapshot, _posting
from jobboard.models import Company, SourceBoard
from jobboard.services.catalogue import import_board

if settings.DATABASES['default']['NAME'] != 'intern_market_test':
    raise RuntimeError('Use the dedicated intern_market_test acceptance database.')
manifest = Path(os.environ['RECETTE_CATALOGUE_MANIFEST'])
company, _ = Company.objects.get_or_create(name='Entreprise fictive E1')
board, _ = SourceBoard.objects.get_or_create(
    provider='jobspy', instance='global', board_key='recette-e1-emploi',
    defaults={'company': company, 'base_url': 'https://example.test'},
)
rows = []
for contract, suffix in (
    ('internship', 'Intern'), ('apprenticeship', 'Alternance'),
    ('permanent', 'CDI'), ('fixed_term', 'CDD'),
    ('contractor', 'Freelance'), ('unknown', ''),
):
    title = f'E1 Backend Engineer {suffix}'.strip()
    raw = {'title': title, 'description': 'Build and maintain backend services with our software team.', 'contract_type': contract}
    row = _posting(raw, contract, title, raw['description'], f'https://example.test/e1/{contract}', f'https://example.test/e1/{contract}', ['Paris, France'])
    row['location_details'] = [{'name': 'Paris, France', 'country': 'FR'}]
    rows.append(row)
raw = {'title': 'E1 Marketing internship', 'description': 'Internship supporting marketing campaigns.', 'contract_type': 'internship'}
row = _posting(raw, 'outside-it', raw['title'], raw['description'], 'https://example.test/e1/outside-it', 'https://example.test/e1/outside-it', ['Paris, France'])
row['location_details'] = [{'name': 'Paris, France', 'country': 'FR'}]
rows.append(row)
import_board(board.pk, supplied_snapshot=CatalogueSnapshot(rows, complete=False))
manifest.write_text(json.dumps({source.external_id: {'id': source.offer_id, 'title': source.offer.title} for source in board.sources.select_related('offer')}))
print('Prepared 6 IT offers and 1 non-IT offer in the ephemeral database.')
