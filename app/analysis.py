import pandas as pd
import matplotlib.pyplot as plt
import os
import glob

# --- AYARLAR ---
# Logs klasöründeki TÜM csv dosyalarını ara
FILE_PATTERN = os.path.join(".", "logs", "*.csv")
# Grafikleri kaydedeceğimiz yer
PROJECT_LOG_DIR = "logs"

# Eğer projede logs klasörü yoksa oluştur
os.makedirs(PROJECT_LOG_DIR, exist_ok=True)

def save_single_plot(fig, file_path, suffix):
    """Yardımcı fonksiyon: Grafiği logs klasörüne formata uygun kaydeder ve kapatır."""
    # Sadece dosya adını al (örnek: SARA_Offline_Log_1.csv)
    file_name = os.path.basename(file_path)
    # Uzantıyı at (örnek: SARA_Offline_Log_1)
    base_name = os.path.splitext(file_name)[0]
    
    # Yeni yolu oluştur: logs/SARA_Offline_Log_1_1_İvmeler.png
    report_path = os.path.join(PROJECT_LOG_DIR, f"{base_name}_{suffix}.png")
    
    # Tüm paneller için genel estetik ayarlar
    for ax in fig.axes:
        ax.grid(True, linestyle='--', alpha=0.5, color='gray')
        ax.margins(x=0.01)
        
    fig.tight_layout()
    fig.savefig(report_path, dpi=300, bbox_inches='tight')
    plt.close(fig)
    print(f"✅ Rapor Kaydedildi: {report_path}")

def run_detailed_analysis(file_path):
    try:
        df = pd.read_csv(file_path)
        df.columns = [c.strip() for c in df.columns]
        
        rename_map = {}
        for col in df.columns:
            col_lower = col.lower()
            if col_lower in ['time', 'timestamp']: rename_map[col] = 'Time'
            elif col_lower in ['depth', 'derinlik']: rename_map[col] = 'Depth'
            elif col_lower == 'ax': rename_map[col] = 'Ax'
            elif col_lower == 'ay': rename_map[col] = 'Ay'
            elif col_lower == 'az': rename_map[col] = 'Az'
            elif col_lower in ['pitch', 'pitching']: rename_map[col] = 'pitch'
            elif col_lower in ['roll', 'rolling']: rename_map[col] = 'roll'
            elif col_lower in ['yaw', 'heading']: rename_map[col] = 'yaw'
            elif col_lower in ['velocity', 'vel', 'hiz']: rename_map[col] = 'velocity'
            elif col_lower in ['distance', 'dist', 'mesafe']: rename_map[col] = 'distance'
            elif col_lower in ['rudderangle', 'rudder_angle', 'rudder angle', 'rudder']: rename_map[col] = 'rudderangle'
            elif col_lower in ['sternangle', 'stern_angle', 'stern angle', 'stern']: rename_map[col] = 'sternangle'
            elif col_lower in ['vx', 'v_x', 'velocityx', 'velocity_x']: rename_map[col] = 'vx'
            elif col_lower in ['vy', 'v_y', 'velocityy', 'velocity_y']: rename_map[col] = 'vy'
            elif col_lower in ['vz', 'v_z', 'velocityz', 'velocity_z']: rename_map[col] = 'vz'
            elif col_lower in ['dx', 'd_x', 'distancex', 'distance_x']: rename_map[col] = 'dx'
            elif col_lower in ['dy', 'd_y', 'distancey', 'distance_y']: rename_map[col] = 'dy'
            elif col_lower in ['dz', 'd_z', 'distancez', 'distance_z']: rename_map[col] = 'dz'
            elif col_lower == 'rpm': rename_map[col] = 'rpm'
                
        df.rename(columns=rename_map, inplace=True)
        
        time_col = 'Time' if 'Time' in df else (df.columns[2] if len(df.columns) > 2 else df.columns[0])
        df['Time_Sec'] = (df[time_col] - df[time_col].iloc[0]) / 1000.0

        plt.style.use('seaborn-v0_8-whitegrid')
        
        # --- GRAFİK 1: Doğrusal İvmeler ---
        if any(col in df.columns for col in ['Ax', 'Ay', 'Az']):
            fig, ax = plt.subplots(figsize=(12, 6))
            if 'Ax' in df: ax.plot(df['Time_Sec'], df['Ax'], label='Ax (İleri)', color='#e63946', linewidth=1.5)
            if 'Ay' in df: ax.plot(df['Time_Sec'], df['Ay'], label='Ay (Sağ-Sol)', color='#2a9d8f', linewidth=1.5)
            if 'Az' in df: ax.plot(df['Time_Sec'], df['Az'], label='Az (Dikey)', color='#457b9d', linewidth=1.5, alpha=0.8)
            ax.set(title='SARA AUV - Doğrusal İvmeler', xlabel='Zaman (Saniye)', ylabel='İvme (m/s²)')
            ax.legend(loc='upper right')
            save_single_plot(fig, file_path, "1_İvmeler")

        # --- GRAFİK 2: YAW AÇISI ---
        if 'yaw' in df:
            fig, ax = plt.subplots(figsize=(12, 5))
            ax.plot(df['Time_Sec'], df['yaw'], label='Yaw (Rota)', color='#e0a96d', linewidth=2)
            ax.set(title='SARA AUV - Yaw (Rota) Açısı', xlabel='Zaman (Saniye)', ylabel='Açı (°)')
            ax.legend(loc='upper right')
            save_single_plot(fig, file_path, "2_Yaw")

        # --- GRAFİK 3: PITCH AÇISI ---
        if 'pitch' in df:
            fig, ax = plt.subplots(figsize=(12, 5))
            ax.plot(df['Time_Sec'], df['pitch'], label='Pitch (Yunuslama)', color='#d62828', linewidth=2)
            ax.set(title='SARA AUV - Pitch (Yunuslama) Açısı', xlabel='Zaman (Saniye)', ylabel='Açı (°)')
            ax.legend(loc='upper right')
            save_single_plot(fig, file_path, "3_Pitch")

        # --- GRAFİK 4: ROLL AÇISI ---
        if 'roll' in df:
            fig, ax = plt.subplots(figsize=(12, 5))
            ax.plot(df['Time_Sec'], df['roll'], label='Roll (Yatış)', color='#003049', linewidth=2)
            ax.set(title='SARA AUV - Roll (Yatış) Açısı', xlabel='Zaman (Saniye)', ylabel='Açı (°)')
            ax.legend(loc='upper right')
            save_single_plot(fig, file_path, "4_Roll")

        # --- GRAFİK 5: Derinlik ve Konum ---
        if any(col in df.columns for col in ['Depth', 'dx', 'dy', 'dz']):
            fig, ax = plt.subplots(figsize=(12, 6))
            if 'Depth' in df:
                ax.plot(df['Time_Sec'], df['Depth'], label='Derinlik (m)', color='#0077b6', linewidth=2.5)
                ax.invert_yaxis()
            ax.set(title='SARA AUV - Derinlik ve Konum Değişimi', xlabel='Zaman (Saniye)', ylabel='Derinlik (m)')
            
            ax_pos = ax.twinx() if any(col in df.columns for col in ['dx', 'dy', 'dz']) else None
            if ax_pos:
                if 'dx' in df: ax_pos.plot(df['Time_Sec'], df['dx'], label='dx', color='#ec4899', linestyle='--', alpha=0.8)
                if 'dy' in df: ax_pos.plot(df['Time_Sec'], df['dy'], label='dy', color='#14b8a6', linestyle='-.', alpha=0.8)
                if 'dz' in df: ax_pos.plot(df['Time_Sec'], df['dz'], label='dz', color='#84cc16', linestyle=':', alpha=0.8)
                ax_pos.set_ylabel('Konum Değişimi (m)', fontweight='bold')
                lines, labels = ax.get_legend_handles_labels()
                lines2, labels2 = ax_pos.get_legend_handles_labels()
                ax.legend(lines + lines2, labels + labels2, loc='upper right')
            elif 'Depth' in df:
                ax.legend(loc='upper right')
            save_single_plot(fig, file_path, "5_Derinlik")

        # --- GRAFİK 6: Hız ve Mesafe ---
        if any(col in df.columns for col in ['distance', 'velocity', 'vx', 'vy', 'vz']):
            fig, ax = plt.subplots(figsize=(12, 6))
            has_vel = False
            if 'distance' in df:
                ax.plot(df['Time_Sec'], df['distance'], label='Mesafe (m)', color='black', linewidth=2)
                has_vel = True
            
            ax_vel = ax.twinx()
            has_twin_vel = False
            if 'velocity' in df: ax_vel.plot(df['Time_Sec'], df['velocity'], label='Hız (m/s)', color='gray', linestyle='--'); has_twin_vel = True
            if 'vx' in df: ax_vel.plot(df['Time_Sec'], df['vx'], label='vx', color='#3b82f6'); has_twin_vel = True
            if 'vy' in df: ax_vel.plot(df['Time_Sec'], df['vy'], label='vy', color='#10b981'); has_twin_vel = True
            if 'vz' in df: ax_vel.plot(df['Time_Sec'], df['vz'], label='vz', color='#6366f1'); has_twin_vel = True
                
            ax.set(title='SARA AUV - Hız ve Mesafe', xlabel='Zaman (Saniye)', ylabel='Mesafe (m)')
            if has_twin_vel:
                ax_vel.set_ylabel('Hız (m/s)', fontweight='bold')
                lines, labels = ax.get_legend_handles_labels()
                lines2, labels2 = ax_vel.get_legend_handles_labels()
                ax.legend(lines + lines2, labels + labels2, loc='upper left')
            elif has_vel:
                ax.legend(loc='upper left')
            save_single_plot(fig, file_path, "6_Hiz_Mesafe")

        # --- GRAFİK 7: Kontrol Yüzeyleri ---
        if any(col in df.columns for col in ['rudderangle', 'sternangle']):
            fig, ax = plt.subplots(figsize=(12, 5))
            if 'rudderangle' in df: ax.step(df['Time_Sec'], df['rudderangle'], label='Rudder Açısı', color='#d00000', linewidth=2, where='post')
            if 'sternangle' in df: ax.step(df['Time_Sec'], df['sternangle'], label='Stern Açısı', color='#ffba08', linewidth=2, linestyle='--', where='post')
            ax.set(title='SARA AUV - Kontrol Yüzeyleri (Eyleyici)', xlabel='Zaman (Saniye)', ylabel='Açı (°)')
            ax.legend(loc='upper right')
            save_single_plot(fig, file_path, "7_Kontrol_Yuzeyleri")

    except Exception as e:
        print(f"❌ HATA: {e}")

def process_latest():
    matching_files = glob.glob(FILE_PATTERN)
    
    if not matching_files:
        print(f"❌ HATA: '{FILE_PATTERN}' konumunda hiç log dosyası bulunamadı!")
        return
        
    latest_file = max(matching_files, key=os.path.getmtime)
    print(f"📂 En güncel dosya işleniyor: {latest_file}")
    run_detailed_analysis(latest_file)

if __name__ == "__main__":
    process_latest()