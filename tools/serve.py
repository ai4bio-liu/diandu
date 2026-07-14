"""Dev server for the preview panel — chdir()s itself so it works even when
spawned without a valid working directory. Not needed in production."""
import os
import sys

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # -> diandu/

from http.server import HTTPServer, SimpleHTTPRequestHandler

port = int(os.environ.get("PORT", sys.argv[1] if len(sys.argv) > 1 else 8322))
print(f"serving diandu on :{port}", flush=True)
HTTPServer(("", port), SimpleHTTPRequestHandler).serve_forever()
