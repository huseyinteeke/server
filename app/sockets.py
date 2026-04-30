import csv
import os
from flask_socketio import emit
from .config import Config

def init_sockets(socketio):
    @socketio.on('telemetry')
    def handle_telemetry(data):
        
        file_exists = os.path.isfile(Config.LOG_FILE)
        with open(Config.LOG_FILE, mode='a', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=data.keys())
            if not file_exists:
                writer.writeheader()
            writer.writerow(data)
        
        # 2. Arayüze Gönder
        emit('update_chart', data, broadcast=True)

    @socketio.on('ui_command')
    def handle_ui_command(data):
        print(f"[CMD] Sending to ESP32: {data}")
        emit('device_command', data, broadcast=True)