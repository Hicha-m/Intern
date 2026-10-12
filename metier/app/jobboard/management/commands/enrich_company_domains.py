from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q

from jobboard.integrations.greenhouse_catalogue import CatalogueImportError
from jobboard.models import Company
from jobboard.services.company_domains import enrich_company_domain


class Command(BaseCommand):
    help = "Complete missing employer domains from known websites, source metadata or public pages."

    def add_arguments(self, parser):
        parser.add_argument("--company-id", type=int)
        parser.add_argument("--page-url", help="Verified employer page for one company")
        parser.add_argument("--provider")
        parser.add_argument("--limit", type=int, default=25)
        parser.add_argument("--after-id", type=int, default=0)
        parser.add_argument(
            "--metadata-only", action="store_true", help="Do not make network requests"
        )

    def handle(self, *args, **options):
        if not 1 <= options["limit"] <= 500 or options["after_id"] < 0:
            raise CommandError(
                "--limit must be between 1 and 500; --after-id must be non-negative."
            )
        if options["page_url"] and (
            not options["company_id"] or options["metadata_only"]
        ):
            raise CommandError(
                "--page-url requires --company-id and public page reads."
            )
        companies = Company.objects.order_by("pk")
        if options["company_id"]:
            companies = companies.filter(pk=options["company_id"])
        else:
            companies = companies.filter(
                Q(domain__isnull=True) | Q(domain=""),
                pk__gt=options["after_id"],
            )
        if options["provider"]:
            companies = companies.filter(
                source_boards__provider=options["provider"]
            ).distinct()
        completed = unresolved = 0
        last_id = options["after_id"]
        for company in companies[: options["limit"]]:
            last_id = company.pk
            try:
                domain = enrich_company_domain(
                    company,
                    page_url=options["page_url"],
                    metadata_only=options["metadata_only"],
                )
                completed += 1
                self.stdout.write(f"OK {company.pk}: {domain}")
            except CatalogueImportError:
                unresolved += 1
                self.stdout.write(f"UNRESOLVED {company.pk}")
        self.stdout.write(
            f"Completed: {completed}; unresolved: {unresolved}; last company ID: {last_id}"
        )
