#!/usr/bin/env python3
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".md": "text/markdown; charset=utf-8",
    }

if __name__ == "__main__":
    httpd = ThreadingHTTPServer(("0.0.0.0", 5180), Handler)
    print("Serving /workspace/geom-td at http://127.0.0.1:5180", flush=True)
    httpd.serve_forever()
