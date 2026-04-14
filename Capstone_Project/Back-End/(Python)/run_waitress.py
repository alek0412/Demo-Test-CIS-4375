"""
Production entry for PM2 / process managers.
Starts Waitress without relying on __name__ == "__main__" (PM2 can skip that guard).
"""
import os

import waitress

from flask_server import flask_server

port = int(os.environ.get("WAIVER_API_PORT", "3001"))
host = os.environ.get("WAIVER_API_HOST", "0.0.0.0")
waitress.serve(flask_server, host=host, port=port)
