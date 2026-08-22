# Backend entry point
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Register blueprints
from routes.health import health_bp
from routes.ai import ai_bp
from routes.bounty import bounty_bp

app.register_blueprint(health_bp)
app.register_blueprint(ai_bp)
app.register_blueprint(bounty_bp)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
