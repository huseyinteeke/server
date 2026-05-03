import csv
import os
from flask_socketio import emit
from .config import Config

def init_sockets(socketio):
    @socketio.on('telemetry')
    def handle_telemetry(data):        
        emit('update_chart', data, broadcast=True)

    @socketio.on('ui_command')
    def handle_ui_command(data):
        print(f"[CMD] Sending to ESP32: {data}")
        emit('device_command', data, broadcast=True)

    @socketio.on('log_data')
    def handle_log_data(data):
        emit('log_data' , data , broadcast= True)

    @socketio.on('log_status')
    def handle_log_status(status):
        emit('log_status', status, broadcast=True)