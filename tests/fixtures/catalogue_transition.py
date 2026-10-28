"""Replay fictitious historical offers in the isolated acceptance DB only.

Run with manage.py shell; RECETTE_TRANSITION_MANIFEST is a local output path.
"""
import json
import os
from io import StringIO
from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.utils import timezone
from jobboard import models as m

if settings.DATABASES['default']['NAME'] != 'intern_market_test':
    raise RuntimeError('Use the dedicated intern_market_test acceptance database.')
manifest = Path(os.environ['RECETTE_TRANSITION_MANIFEST'])
company = m.Company.objects.create(name=f'Entreprise fictive E14 {uuid4().hex[:8]}')
board = m.SourceBoard.objects.create(company=company, provider='greenhouse', board_key=f'e14-{company.pk}')
location, _ = m.Location.objects.get_or_create(canonical_key='recette-e14-paris', defaults={'name': 'Paris, France', 'country_code': 'FR'})
cases = []
for contract, seniority, label in [
    ('internship', 'entry', 'Stage'), ('apprenticeship', 'entry', 'Alternance'),
    ('permanent', 'senior', 'CDI'), ('fixed_term', 'mid', 'CDD'),
    ('contractor', 'lead', 'Mission indépendante'),
    ('employment', 'unknown', 'Emploi salarié (durée non précisée)'),
    ('temporary', 'unknown', 'Temporaire (durée non précisée)'),
    ('unknown', 'unknown', 'Contrat non précisé'),
    ('internship', 'unknown', 'outside-it'),
]:
    title = f'E14 Junior Backend Engineer {contract}' if label != 'outside-it' else 'E14 Marketing internship'
    offer = m.Offer.objects.create(company=company, title=title, contract_type=contract, seniority=seniority, description='Duration: 6 months. Build our product.')
    offer.locations.add(location)
    source = m.OfferSource.objects.create(offer=offer, board=board, external_id=contract + label, origin_url=f'https://example.test/e14/{offer.pk}', apply_url=f'https://example.test/e14/{offer.pk}/apply', content_hash='a'*64, last_checked_at=timezone.now())
    m.SourceRevision.objects.create(source=source, raw_hash='a'*64, semantic_hash='b'*64, payload={'title': title, 'description': offer.description})
    m.OfferEnrichment.objects.create(offer=offer, content_version=1, extractor_version='historical-internship', classification='confirmed', europe_status='in_scope')
    cases.append({'id': offer.pk, 'contract': contract, 'seniority': seniority, 'label': label, 'title': title})
user = get_user_model().objects.get(email='alice@example.test')
saved = m.SavedOffer.objects.create(user=user, offer_id=cases[5]['id'])
application = m.Application.objects.create(user=user, offer_id=cases[5]['id'], source=m.OfferSource.objects.get(offer_id=cases[5]['id']))
ids = [case['id'] for case in cases]

def retained():
    result = {}
    for model, query in [(m.Offer, {'pk__in': ids}), (m.OfferSource, {'offer_id__in': ids}), (m.SourceRevision, {'source__offer_id__in': ids}), (m.Application, {'pk': application.pk}), (m.SavedOffer, {'pk': saved.pk})]:
        rows = list(model.objects.filter(**query).order_by('pk').values())
        if model is m.Offer:
            rows = [{k: v for k, v in row.items() if not k.startswith('taxonomy_') and k != 'job_subdomain_id'} for row in rows]
        result[model.__name__] = rows
    return result

before = retained()
upper = ids[-1]
first_output = StringIO()
call_command('re_enrich_catalogue', after_id=ids[0]-1, through_id=upper, limit=2, stdout=first_output)
assert f'Next batch: --after-id {ids[1]}' in first_output.getvalue()
call_command('re_enrich_catalogue', after_id=ids[1], through_id=upper, limit=2, all=True)
assert retained() == before
versions = list(m.OfferEnrichment.objects.filter(offer_id__in=ids).order_by('pk').values())
call_command('re_enrich_catalogue', after_id=ids[0]-1, through_id=upper, limit=3, all=True)
assert list(m.OfferEnrichment.objects.filter(offer_id__in=ids).order_by('pk').values()) == versions
assert retained() == before
manifest.write_text(json.dumps({'company_id': company.pk, 'cases': cases, 'application_id': application.pk, 'saved_id': saved.pk}))
print('PASS bounded historical replay, unchanged source data/private links and idempotent second pass on 9 fictitious offers.')
