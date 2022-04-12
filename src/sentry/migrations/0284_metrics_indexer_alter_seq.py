# Generated by Django 2.2.27 on 2022-04-06 16:58

from django.db import migrations

from sentry.new_migrations.migrations import CheckedMigration


class Migration(CheckedMigration):
    # This flag is used to mark that a migration shouldn't be automatically run in production. For
    # the most part, this should only be used for operations where it's safe to run the migration
    # after your code has deployed. So this should not be used for most operations that alter the
    # schema of a table.
    # Here are some things that make sense to mark as dangerous:
    # - Large data migrations. Typically we want these to be run manually by ops so that they can
    #   be monitored and not block the deploy for a long period of time while they run.
    # - Adding indexes to large tables. Since this can take a long time, we'd generally prefer to
    #   have ops run this and not block the deploy. Note that while adding an index is a schema
    #   change, it's completely safe to run the operation after the code has deployed.
    is_dangerous = False

    # This flag is used to decide whether to run this migration in a transaction or not. Generally
    # we don't want to run in a transaction here, since for long running operations like data
    # back-fills this results in us locking an increasing number of rows until we finally commit.
    atomic = False

    dependencies = [
        ("sentry", "0283_extend_externalissue_key"),
    ]

    operations = [
        migrations.RunSQL(
            """
            ALTER SEQUENCE sentry_stringindexer_id_seq START WITH 65536;
            ALTER SEQUENCE sentry_stringindexer_id_seq RESTART;
            """,
            hints={"tables": ["sentry_stringindexer"]},
            reverse_sql="""
            ALTER SEQUENCE sentry_stringindexer_id_seq START WITH 1;
            ALTER SEQUENCE sentry_stringindexer_id_seq RESTART;
            """,
        )
    ]
