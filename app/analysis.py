import pandas as pd
import matplotlib.pyplot as plt
import os
import shutil
import glob

# --- AYARLAR ---
DOWNLOADS_PATH = os.path.join(os.path.expanduser("~"), "Downloads")
PROJECT_LOG_DIR = "logs"
FILE_PATTERN = "SARA_Offline_Log*.csv" 

def run_detailed_analysis(file_path):
    try:
        # Sütun isimleri (Senin attığın ham veriye tam uyumlu)
        column_names = [
            'Log_Date', 'Log_Time', 'Time', 'Depth', 'Ax', 'Ay', 'Az', 
            'pitch', 'roll', 'yaw', 'velocity', 'distance'
        ]
        
        # Dosyayı oku
        df = pd.read_csv(file_path, names=column_names, header=0)
        
        # Zamanı saniyeye çevir
        df['Time_Sec'] = (df['Time'] - df['Time'].iloc[0]) / 1000.0

        # 4 Panelli Grafik Sistemi
        fig, axes = plt.subplots(4, 1, figsize=(14, 12), sharex=True)
        plt.subplots_adjust(hspace=0.3)

        # 1. PANEL: İvme Verileri (Gürültü ve Titreşim Analizi)
        axes[0].plot(df['Time_Sec'], df['Ax'], label='Ax (İleri)', color='#ff4b2b', alpha=0.8)
        axes[0].plot(df['Time_Sec'], df['Ay'], label='Ay (Sağ-Sol)', color='#2af598', alpha=0.8)
        axes[0].plot(df['Time_Sec'], df['Az'], label='Az (Dikey)', color='#00d4ff', alpha=0.6)
        axes[0].set_ylabel('İvme (m/s²)')
        axes[0].set_title(f"SARA Sensör Analizi - {os.path.basename(file_path)}")
        axes[0].legend(loc='upper right', fontsize='small')
        axes[0].grid(True, alpha=0.2)

        # 2. PANEL: Yönelim (Makaledeki Observability/Tutum Analizi)
        axes[1].plot(df['Time_Sec'], df['yaw'], label='Yaw (Rota)', color='#ffd700', linewidth=2)
        axes[1].plot(df['Time_Sec'], df['pitch'], label='Pitch (Yunuslama)', color='#ff4b2b', linestyle='--')
        axes[1].plot(df['Time_Sec'], df['roll'], label='Roll (Yatış)', color='#2af598', linestyle=':')
        axes[1].set_ylabel('Derece (°)')
        axes[1].legend(loc='upper right', fontsize='small')
        axes[1].grid(True, alpha=0.2)

        # 3. PANEL: Derinlik
        axes[2].plot(df['Time_Sec'], df['Depth'], label='Derinlik', color='#00d4ff', linewidth=2)
        axes[2].invert_yaxis() # Su altı mantığı: Derinlik aşağı doğru artar
        axes[2].set_ylabel('Derinlik (m)')
        axes[2].legend(loc='upper right')
        axes[2].grid(True, alpha=0.2)

        # 4. PANEL: Hız ve Mesafe (50 Metre Takibi)
        axes[3].plot(df['Time_Sec'], df['distance'], label='Mesafe (m)', color='black', linewidth=2.5)
        ax_vel = axes[3].twinx()
        ax_vel.plot(df['Time_Sec'], df['velocity'], label='Hız (m/s)', color='gray', alpha=0.5, linestyle='--')
        ax_vel.set_ylabel('Hız (m/s)')
        axes[3].set_ylabel('Mesafe (m)')
        axes[3].set_xlabel('Zaman (Saniye)')
        axes[3].legend(loc='upper left')
        axes[3].grid(True, alpha=0.2)

        # Raporu Kaydet
        report_path = file_path.replace('.csv', '_detayli_analiz.png')
        plt.savefig(report_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        print(f"✅ Analiz Başarılı! Rapor: {report_path}")
        
    except Exception as e:
        print(f"❌ HATA: {e}")

def process_latest():
    if not os.path.exists(PROJECT_LOG_DIR): os.makedirs(PROJECT_LOG_DIR)
    files = glob.glob(os.path.join(DOWNLOADS_PATH, FILE_PATTERN))
    if not files:
        print("Log bulunamadı.")
        return
    latest = max(files, key=os.path.getmtime)
    dest = os.path.join(PROJECT_LOG_DIR, os.path.basename(latest))
    shutil.move(latest, dest)
    run_detailed_analysis(dest)

if __name__ == "__main__":
    process_latest()