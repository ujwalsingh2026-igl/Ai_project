import json
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from unittest.mock import MagicMock, patch

from core.providers import (ChatMessage, EchoProvider, GeminiProvider, OpenAICompatibleProvider, ProviderConfig,
                            ProviderConfigError, ProviderError, create_provider)



class _Handler(BaseHTTPRequestHandler):
    seen = {}

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        _Handler.seen = {"path": self.path, "auth": self.headers.get("Authorization"), "body": body}
        if body["model"] == "broken":
            payload = b"not json"
        else:
            payload = json.dumps({"choices": [{"message": {"content": "hello from fake model"}}]}).encode()
        self.send_response(200)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *args):
        pass


class ProviderTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = HTTPServer(("127.0.0.1", 0), _Handler)
        cls.url = f"http://127.0.0.1:{cls.server.server_port}/v1"
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def test_echo(self):
        r = EchoProvider().generate([ChatMessage("user", "hi")])
        self.assertIn("hi", r.text)
        self.assertEqual(r.provider, "echo")

    def test_openai_compatible_roundtrip(self):
        p = OpenAICompatibleProvider(self.url, "some-model", api_key="secret-key")
        r = p.generate([ChatMessage("user", "ping")], system="be nice")
        self.assertEqual(r.text, "hello from fake model")
        self.assertEqual(_Handler.seen["path"], "/v1/chat/completions")
        self.assertEqual(_Handler.seen["auth"], "Bearer secret-key")
        self.assertEqual(_Handler.seen["body"]["messages"][0], {"role": "system", "content": "be nice"})

    def test_bad_json_becomes_provider_error(self):
        p = OpenAICompatibleProvider(self.url, "broken")
        with self.assertRaises(ProviderError):
            p.generate([ChatMessage("user", "x")])

    def test_unreachable_server_becomes_provider_error_without_leaking_key(self):
        p = OpenAICompatibleProvider("http://127.0.0.1:1/v1", "m", api_key="secret-key", timeout=2)
        with self.assertRaises(ProviderError) as ctx:
            p.generate([ChatMessage("user", "x")])
        self.assertNotIn("secret-key", str(ctx.exception))

    def test_non_http_scheme_rejected(self):
        with self.assertRaises(ProviderConfigError):
            OpenAICompatibleProvider("file:///etc/passwd", "m")

    def test_factory(self):
        self.assertIsInstance(create_provider(ProviderConfig()), EchoProvider)
        local = create_provider(ProviderConfig(provider="local", model="m"))
        self.assertEqual(local.name, "local")
        with self.assertRaises(ProviderConfigError):
            create_provider(ProviderConfig(provider="local"))             # model missing
        with self.assertRaises(ProviderConfigError):
            create_provider(ProviderConfig(provider="openai_compatible", model="m"))  # base_url missing
        with self.assertRaises(ProviderConfigError):
            create_provider(ProviderConfig(provider="gemini"))            # api_key missing
        gemini = create_provider(ProviderConfig(provider="gemini", api_key="secret-key"))
        self.assertEqual(gemini.name, "gemini")
        with self.assertRaises(ProviderConfigError):
            create_provider(ProviderConfig(provider="nonsense"))

    def test_api_key_not_in_repr(self):
        self.assertNotIn("secret-key", repr(ProviderConfig(api_key="secret-key")))


class GeminiProviderTests(unittest.TestCase):
    def test_missing_api_key_raises(self):
        with self.assertRaises(ProviderConfigError):
            GeminiProvider(api_key="")

    @patch("urllib.request.urlopen")
    def test_gemini_generate_success(self, mock_urlopen):
        fake_response = {
            "candidates": [
                {
                    "content": {
                        "parts": [{"text": "Hello from Gemini AI!"}],
                        "role": "model",
                    },
                    "finishReason": "STOP",
                }
            ]
        }
        mock_ctx = MagicMock()
        mock_ctx.read.return_value = json.dumps(fake_response).encode("utf-8")
        mock_ctx.__enter__.return_value = mock_ctx
        mock_urlopen.return_value = mock_ctx

        provider = GeminiProvider(api_key="fake-key", model="gemini-2.5-flash")
        res = provider.generate([ChatMessage("user", "Hello")], system="You are Aegis")

        self.assertEqual(res.text, "Hello from Gemini AI!")
        self.assertEqual(res.provider, "gemini")
        self.assertEqual(res.model, "gemini-2.5-flash")

    @patch("urllib.request.urlopen")
    def test_gemini_blocked_candidate(self, mock_urlopen):
        fake_response = {
            "candidates": [],
            "promptFeedback": {"blockReason": "SAFETY"},
        }
        mock_ctx = MagicMock()
        mock_ctx.read.return_value = json.dumps(fake_response).encode("utf-8")
        mock_ctx.__enter__.return_value = mock_ctx
        mock_urlopen.return_value = mock_ctx

        provider = GeminiProvider(api_key="fake-key")
        with self.assertRaises(ProviderError):
            provider.generate([ChatMessage("user", "Dangerous prompt")])


if __name__ == "__main__":
    unittest.main()

