"""Vérifie le blueprint dans une transaction intégralement annulée.

Usage : DATABASE_URL='postgresql://...' .venv/bin/python docs/database/verify_schema.py
Le compte doit pouvoir créer un schéma et écrire dans auth_user.
Ne lit/imprime aucune donnée personnelle ; utilisateurs de test à IDs négatifs explicites.
"""
import os
from pathlib import Path
import secrets

import psycopg


def verify(dsn):
    passed = []
    with psycopg.connect(dsn, autocommit=False) as conn:
        try:
            conn.execute("SET LOCAL lock_timeout = '3s'")
            conn.execute("SET LOCAL statement_timeout = '20s'")
            conn.execute(Path(__file__).with_name('schema.sql').read_text())
            table_count = conn.execute("SELECT count(*) FROM information_schema.tables WHERE table_schema='intern_blueprint'").fetchone()[0]
            passed.append(f'DDL complet : {table_count} tables créées')

            # IDs explicites : ne pas avancer la séquence de la vraie table auth_user.
            ids = [-secrets.randbelow(1_000_000_000) - 1 for _ in range(2)]
            for uid in ids:
                conn.execute('''INSERT INTO public.auth_user
                    (id,username,password,is_superuser,first_name,last_name,email,is_staff,is_active,date_joined)
                    VALUES (%s,%s,'!',false,'','','',false,false,now())''',
                    (uid, f'blueprint_check_{secrets.token_hex(12)}'))
            owner, other = ids

            def insert(table, **values):
                from psycopg import sql
                statement = sql.SQL('INSERT INTO {} ({}) VALUES ({}) RETURNING id').format(
                    sql.Identifier(table),
                    sql.SQL(',').join(map(sql.Identifier, values)),
                    sql.SQL(',').join(sql.Placeholder() for _ in values),
                )
                return conn.execute(statement, list(values.values())).fetchone()[0]

            def rejects(label, error, operation):
                try:
                    with conn.transaction():
                        operation()
                except error:
                    passed.append(label)
                else:
                    raise AssertionError(f'Contrainte absente : {label}')

            h = 'a' * 64
            company = insert('company', name='Blueprint test')
            offer = insert('offer', company_id=company, title='Test', description_text='Python Django')
            other_offer = insert('offer', company_id=company, title='Other', description_text='Other')
            board = insert('source_board', provider='test', board_key='test', base_url='https://example.invalid')
            source = insert('offer_source', offer_id=offer, board_id=board, external_id='1', origin_url='https://example.invalid/1', apply_url='https://example.invalid/1/apply', content_hash=h)
            doc = insert('document', owner_id=owner, kind='resume', origin='upload', bucket='test', object_key='resume', mime_type='application/pdf', byte_size=10, sha256=h, status='ready')
            foreign_doc = insert('document', owner_id=other, kind='resume', origin='upload', bucket='test', object_key='foreign', mime_type='application/pdf', byte_size=10, sha256=h)
            letter = insert('document', owner_id=owner, kind='cover_letter', origin='generated', bucket='test', object_key='letter', mime_type='application/pdf', byte_size=10, sha256=h)
            profile = insert('candidate_profile', user_id=owner, full_name='Test', current_resume_id=doc)
            app = insert('application', user_id=owner, offer_id=offer, source_id=source)
            rev = insert('application_revision', application_id=app, user_id=owner, revision_no=1, profile_snapshot='{}', offer_snapshot='{}', form_snapshot='{}', content_hash=h, sealed_at='2026-09-28T10:00:00Z')
            insert('revision_document', revision_id=rev, user_id=owner, document_id=doc, purpose='resume')
            auth = insert('submission_authorization', revision_id=rev, application_id=app, user_id=owner, approved_hash=h, granted_at='2026-09-28T10:00:00Z', expires_at='2026-09-29T10:00:00Z')
            run = insert('agent_run', application_id=app, user_id=owner, revision_id=rev, authorization_id=auth, purpose='submit', attempt_no=1)
            passed.append('Parcours valide profil/document/offre/révision/autorisation/run')

            rejects('CV courant d’un autre propriétaire refusé', psycopg.errors.ForeignKeyViolation,
                    lambda: conn.execute('UPDATE candidate_profile SET current_resume_id=%s WHERE id=%s', (foreign_doc, profile)))
            rejects('Lettre utilisée comme CV courant refusée', psycopg.errors.ForeignKeyViolation,
                    lambda: conn.execute('UPDATE candidate_profile SET current_resume_id=%s WHERE id=%s', (letter, profile)))
            rejects('Double candidature même utilisateur/offre refusée', psycopg.errors.UniqueViolation,
                    lambda: insert('application', user_id=owner, offer_id=offer, source_id=source))
            rejects('Source liée à une autre offre refusée', psycopg.errors.ForeignKeyViolation,
                    lambda: insert('application', user_id=other, offer_id=other_offer, source_id=source))
            rejects('Révision d’un autre propriétaire refusée', psycopg.errors.ForeignKeyViolation,
                    lambda: insert('application_revision', application_id=app, user_id=other, revision_no=2, profile_snapshot='{}', offer_snapshot='{}', form_snapshot='{}'))
            rejects('Document étranger dans révision refusé', psycopg.errors.ForeignKeyViolation,
                    lambda: conn.execute('UPDATE revision_document SET document_id=%s WHERE revision_id=%s', (foreign_doc, rev)))
            rejects('Numéro de révision dupliqué refusé', psycopg.errors.UniqueViolation,
                    lambda: insert('application_revision', application_id=app, user_id=owner, revision_no=1, profile_snapshot='{}', offer_snapshot='{}', form_snapshot='{}'))
            rejects('Autorisation attribuée à un autre propriétaire refusée', psycopg.errors.ForeignKeyViolation,
                    lambda: insert('submission_authorization', revision_id=rev, application_id=app, user_id=other, approved_hash=h, granted_at='2026-09-28', expires_at='2026-09-29', revoked_at='2026-09-28'))
            rejects('Deux runs actifs refusés', psycopg.errors.UniqueViolation,
                    lambda: insert('agent_run', application_id=app, user_id=owner, revision_id=rev, authorization_id=auth, purpose='submit', attempt_no=2))
            conn.execute("UPDATE agent_run SET status='uncertain' WHERE id=%s", (run,))
            rejects('Run incertain bloque un nouvel essai', psycopg.errors.UniqueViolation,
                    lambda: insert('agent_run', application_id=app, user_id=owner, revision_id=rev, authorization_id=auth, purpose='submit', attempt_no=2))
            conn.execute("UPDATE agent_run SET status='failed' WHERE id=%s", (run,))
            rejects('Envoi sans autorisation refusé', psycopg.errors.CheckViolation,
                    lambda: insert('agent_run', application_id=app, user_id=owner, revision_id=rev, purpose='submit', attempt_no=2))
            rejects('Salaire maximum inférieur au minimum refusé', psycopg.errors.CheckViolation,
                    lambda: insert('compensation_band', offer_id=offer, source_id=source, minimum=200, maximum=100, currency='EUR', period='month'))
            rejects('Salaire négatif refusé', psycopg.errors.CheckViolation,
                    lambda: insert('compensation_band', offer_id=offer, source_id=source, minimum=-1, currency='EUR', period='month'))
            rejects('Expérience aux dates inversées refusée', psycopg.errors.CheckViolation,
                    lambda: insert('experience', profile_id=profile, company_name='Test', title='Test', start_date='2026-02-01', end_date='2026-01-01'))
            rejects('Préférence salaire partiellement renseignée refusée', psycopg.errors.CheckViolation,
                    lambda: insert('search_preference', profile_id=profile, minimum_salary=100))
            rejects('Suppression d’une offre avec candidatures refusée', psycopg.errors.ForeignKeyViolation,
                    lambda: conn.execute('DELETE FROM offer WHERE id=%s', (offer,)))
            rejects('Source externe dupliquée dans le même board refusée', psycopg.errors.UniqueViolation,
                    lambda: insert('offer_source', offer_id=other_offer, board_id=board, external_id='1', origin_url='https://example.invalid', apply_url='https://example.invalid', content_hash=h))
            insert('saved_offer', user_id=owner, offer_id=offer)
            rejects('Favori dupliqué refusé', psycopg.errors.UniqueViolation,
                    lambda: insert('saved_offer', user_id=owner, offer_id=offer))
            found = conn.execute("SELECT id FROM offer WHERE search_vector @@ websearch_to_tsquery('simple','Django')").fetchall()
            assert (offer,) in found
            passed.append('Vecteur de recherche généré et recherche texte opérationnels')
        finally:
            conn.rollback()
        assert conn.execute("SELECT to_regnamespace('intern_blueprint')").fetchone()[0] is None
        conn.rollback()
        passed.append('ROLLBACK vérifié : aucun schéma blueprint persistant')
    return passed


if __name__ == '__main__':
    results = verify(os.environ['DATABASE_URL'])
    for result in results:
        print(f'OK — {result}')
    print(f'{len(results)} vérifications réussies.')
