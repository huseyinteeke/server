import os

class Config:
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__) , '..'))
    UPLOAD_FOLDER = os.path.join(BASE_DIR , 'logs')
    FIRMWARE_FOLDER = os.path.join(BASE_DIR , 'firmware')
    LOG_FILE = os.path.join(UPLOAD_FOLDER, 'sara_telemetry_log.csv')

    PORT = 8080
    HOST = '0.0.0.0'

    for folder in [UPLOAD_FOLDER , FIRMWARE_FOLDER]:
        if not os.path.exists(folder):
            os.makedirs(folder)