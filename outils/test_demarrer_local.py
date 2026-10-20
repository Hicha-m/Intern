"""Regression checks for the execution guide's reported launcher failures."""

import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('demarrer_local', Path(__file__).with_name('demarrer_local.py'))
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)


class LauncherTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.runtime = Path(self.directory.name)
        self.runtime_patch = patch.object(launcher, 'RUNTIME', self.runtime)
        self.runtime_patch.start()
        self.addCleanup(self.runtime_patch.stop)

    def test_engine_file_and_database_configuration_are_loaded(self):
        (self.runtime / 'moteur.env').write_text(
            'export DOCKER_BIN="/existing engine/docker"\n'
            'export DOCKER_HOST=unix:///existing/docker.sock\n')
        (self.runtime / 'local.env').write_text(
            'POSTGRES_PORT=5544\nPOSTGRES_USER=custom_user\nPOSTGRES_PASSWORD=custom_password\n')
        with patch.dict(os.environ, {'VIRTUAL_ENV': '/another/venv'}):
            env = launcher.local_environment('http://localhost:5173', 'http://localhost:8000')
        self.assertNotIn('VIRTUAL_ENV', env)
        self.assertEqual(env['DOCKER_BIN'], '/existing engine/docker')
        self.assertEqual(env['DOCKER_HOST'], 'unix:///existing/docker.sock')
        self.assertEqual(launcher.postgres_environment(env)['PGPORT'], '5544')
        self.assertEqual(launcher.postgres_environment(env)['PGUSER'], 'custom_user')

    def test_sql_uses_config_and_requested_database_without_preparation(self):
        (self.runtime / 'local.env').write_text('POSTGRES_PORT=5544\nPOSTGRES_PASSWORD=custom_password\n')
        with patch('sys.argv', ['demarrer_local.py', 'sql', '--database', 'dedicated']), \
                patch.object(launcher.shutil, 'which', return_value='/bin/psql'), \
                patch.object(launcher, 'run') as run:
            launcher.main()
        run.assert_called_once()
        self.assertEqual(run.call_args.args, ('psql', '-X'))
        self.assertEqual(run.call_args.kwargs['env']['PGDATABASE'], 'dedicated')
        self.assertEqual(run.call_args.kwargs['env']['PGPORT'], '5544')

    def test_podman_has_specific_diagnostic_and_never_starts_compose(self):
        probe = subprocess.CompletedProcess([], 1)
        info = subprocess.CompletedProcess([], 1, '', 'Emulate Docker CLI using podman')
        with patch('sys.argv', ['demarrer_local.py', 'metier']), \
                patch.object(launcher.shutil, 'which', return_value='/bin/tool'), \
                patch.object(launcher, 'occupied', return_value=False), \
                patch.object(launcher.subprocess, 'run', side_effect=[probe, info]), \
                patch.object(launcher, 'run') as run:
            with self.assertRaisesRegex(SystemExit, 'utilise Podman'):
                launcher.main()
        # Only dependency sync is allowed before the failure, no Compose mutation.
        run.assert_called_once()
        self.assertEqual(run.call_args.args, ('uv', 'sync', '--project', 'metier', '--frozen'))
        self.assertNotIn('VIRTUAL_ENV', run.call_args.kwargs['env'])

    def test_invalid_local_configuration_reports_line(self):
        (self.runtime / 'local.env').write_text('POSTGRES_PORT\n')
        with self.assertRaisesRegex(SystemExit, 'local.env:1'):
            launcher.local_environment('http://localhost:5173', 'http://localhost:8000')

    def test_stop_terminates_whole_frontend_group_and_cleans_pid(self):
        pidfile = self.runtime / 'presentation.pid'
        pidfile.write_text('12345')
        members = [(12345, 'npm run dev'),
                   (12346, f'node {launcher.ROOT}/frontend/node_modules/.bin/vite')]
        with patch.object(launcher, 'process_group', side_effect=[members, []]), \
                patch.object(launcher.os, 'killpg') as kill:
            launcher.stop('presentation')
        kill.assert_called_once_with(12345, launcher.signal.SIGTERM)
        self.assertFalse(pidfile.exists())

    def test_stop_refuses_reused_or_invalid_pid(self):
        pidfile = self.runtime / 'metier.pid'
        for value in ['0', '-1', 'invalid', '12345']:
            with self.subTest(value=value):
                pidfile.write_text(value)
                with patch.object(launcher, 'process_group', return_value=[(12345, 'unrelated')]), \
                        patch.object(launcher.os, 'killpg') as kill:
                    with self.assertRaises(SystemExit):
                        launcher.stop('metier')
                kill.assert_not_called()
                self.assertTrue(pidfile.exists())

    def test_stop_already_exited_service_is_repeatable(self):
        pidfile = self.runtime / 'metier.pid'
        pidfile.write_text('12345')
        with patch.object(launcher, 'process_group', return_value=[]), \
                patch.object(launcher.os, 'killpg') as kill:
            launcher.stop('metier')
            launcher.stop('metier')
        kill.assert_not_called()
        self.assertFalse(pidfile.exists())

    def test_stop_loads_engine_without_sync_or_database_preparation(self):
        (self.runtime / 'moteur.env').write_text('DOCKER_BIN=/custom/docker\n')
        with patch('sys.argv', ['demarrer_local.py', 'arreter']), \
                patch.object(launcher, 'stop') as stop, \
                patch.object(launcher, 'run') as run:
            launcher.main()
        self.assertEqual([call.args for call in stop.call_args_list], [('presentation',), ('metier',)])
        run.assert_called_once()
        self.assertEqual(run.call_args.args, ('/custom/docker', 'compose', 'stop', 'db'))

    def test_stop_can_keep_database_and_select_custom_ports(self):
        with patch('sys.argv', ['demarrer_local.py', 'arreter', '--garder-db',
                                '--api-port', '8001', '--frontend-port', '5174']), \
                patch.object(launcher, 'stop') as stop, \
                patch.object(launcher, 'run') as run:
            launcher.main()
        self.assertEqual([call.args for call in stop.call_args_list],
                         [('presentation-5174',), ('metier-8001',)])
        run.assert_not_called()

    def test_local_launcher_finds_pinned_python_and_keeps_explicit_overrides(self):
        with patch.dict(os.environ, {}, clear=True):
            env = launcher.local_environment('http://localhost:5173', 'http://localhost:8000')
        self.assertEqual(env['UV_PYTHON_INSTALL_DIR'], str(self.runtime / 'python-runtime'))
        self.assertIn('/0.13.1/crates/uv-python-managed/', env['UV_PYTHON_DOWNLOADS_JSON_URL'])
        with patch.dict(os.environ, dict(UV_PYTHON_INSTALL_DIR='/custom/python',
                                        UV_PYTHON_DOWNLOADS_JSON_URL='https://example.org/catalog.json'), clear=True):
            env = launcher.local_environment('http://localhost:5173', 'http://localhost:8000')
        self.assertEqual(env['UV_PYTHON_INSTALL_DIR'], '/custom/python')
        self.assertEqual(env['UV_PYTHON_DOWNLOADS_JSON_URL'], 'https://example.org/catalog.json')


if __name__ == '__main__':
    unittest.main()
