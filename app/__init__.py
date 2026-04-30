import os
from flask import Flask
from flask_socketio import SocketIO
from .config import Config

socketio = SocketIO()

def create_app():
    root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    
    app = Flask(__name__,
                template_folder=os.path.join(root_path, 'templates'),
                static_folder=os.path.join(root_path, 'static'),
                static_url_path='/static')
    
    app.config.from_object(Config)

    socketio.init_app(app, 
                      cors_allowed_origins="*", 
                      async_mode='gevent',
                      ping_timeout=60,
                      ping_interval=25)

    from .routes import main_bp         
    app.register_blueprint(main_bp)

    from .sockets import init_sockets
    init_sockets(socketio)

    return app