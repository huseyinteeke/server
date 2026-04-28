from gevent import monkey
monkey.patch_all() # Gevent'in kilitlemeyi önleyen yaması (EN ÜSTTE OLMALI)

from app import create_app, socketio
from app.config import Config

app = create_app()

if __name__ == '__main__':
    print(f"[!] SARA GCS starting on http://{Config.HOST}:{Config.PORT} (Powered by Gevent)")
    socketio.run(app, host=Config.HOST, port=Config.PORT, debug=False)