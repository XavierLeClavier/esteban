import os
import sys


BASE_DIR = os.path.dirname(__file__)
SRC_DIR = os.path.join(BASE_DIR, "src")
if SRC_DIR not in sys.path:
	sys.path.insert(0, SRC_DIR)

from esteban.app import create_app


app = create_app()


if __name__ == "__main__":
	app.run(host="0.0.0.0", port=5000, debug=True)