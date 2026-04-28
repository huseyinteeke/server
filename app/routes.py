from flask import Blueprint, render_template, request, send_file, jsonify
from .config import Config
from . import socketio
import os

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    return render_template('index.html')

# FOTA: Firmware Yükleme
@main_bp.route('/upload_firmware', methods=['POST'])
def upload_firmware():
    if 'file' not in request.files: return "No file part", 400
    file = request.files['file']
    if file.filename == '': return "No selected file", 400
    
    # Dosyayı firmware klasörüne kaydet
    path = os.path.join(Config.FIRMWARE_FOLDER, "latest_sara.bin")
    file.save(path)
    
    # ESP32'ye güncelleme emri gönder (Socket.io üzerinden)
    socketio.emit('device_command', {'action': 'UPDATE_FIRMWARE', 'file': 'latest_sara.bin'})
    return "Firmware uploaded and update command sent!", 200

# CSV LOG İNDİRME
@main_bp.route('/download_logs')
def download_logs():
    if os.path.exists(Config.LOG_FILE):
        return send_file(Config.LOG_FILE, as_attachment=True)
    return "Log file not found", 404

# HTTP KÖPRÜSÜ (ESP32 WebSocket yerine HTTP kullanırsa)
@main_bp.route('/data')
def handle_http_data():
    data = request.args.to_dict()
    socketio.emit('update_chart', data)
    return "OK", 200