from flask import Flask
from flask_cors import CORS
from flasgger import Swagger
from flask_sock import Sock

from .routes.http import register_http_routes
from .routes.voice import register_voice_routes


def create_app() -> Flask:
	app = Flask(__name__)
	app.config["SWAGGER"] = {
		"title": "Esteban API",
		"uiversion": 3,
	}
	CORS(app, resources={r"/*": {"origins": "*"}})
	Swagger(app)
	sock = Sock(app)

	register_http_routes(app)
	register_voice_routes(sock)

	return app
