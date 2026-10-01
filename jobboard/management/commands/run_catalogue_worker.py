import time

from django.core.management.base import BaseCommand
from django.db import close_old_connections

from jobboard.services.company_logos import process_logo_jobs
from jobboard.services.engine_collection import process_one, schedule_due


class Command(BaseCommand):
    help = "Schedule and consume board.sync only; also evaluate internal daily alerts/private links."

    def add_arguments(self, parser):
        parser.add_argument("--once", action="store_true")
        parser.add_argument("--limit", type=int, default=100)
        parser.add_argument("--poll-interval", type=float, default=10)

    def handle(self, *args, **options):
        limit = max(1, min(options["limit"], 1000))
        while True:
            close_old_connections()
            logos = process_logo_jobs(limit=min(limit, 5))
            queued = schedule_due(limit)
            processed = 0
            for _ in range(limit):
                if not process_one():
                    break
                processed += 1
            from jobboard.services.engine_alerts import run_alerts
            from jobboard.services.engine_discovery import run_discovery
            from jobboard.services.engine_external import process_external_opportunities
            from jobboard.services.engine_search_discovery import run_search_discovery

            run_discovery(limit=limit)
            run_search_discovery(limit=2, resolve_limit=8)
            run_alerts(limit=limit)
            process_external_opportunities(limit=limit)
            if options["once"]:
                self.stdout.write(
                    f"Queued {queued}; processed {processed} board imports; checked {logos} company logos."
                )
                return
            time.sleep(max(1, options["poll_interval"]))
