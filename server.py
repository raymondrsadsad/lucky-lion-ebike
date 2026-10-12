#!/usr/bin/env python3
"""Tiny no-cache static server for local development / presenting.
Sends Cache-Control: no-store so the browser always loads the latest files."""
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f"Serving (no-cache) on http://localhost:{port}")
    HTTPServer(("", port), NoCacheHandler).serve_forever()
