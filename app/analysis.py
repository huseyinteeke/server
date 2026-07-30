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
        # Read the CSV file. Real headers are read automatically from the first row.
        df = pd.read_csv(file_path)
        
        # Normalize column names by trimming spaces
        df.columns = [c.strip() for c in df.columns]
        
        # Safe column name mapping for casing/naming differences
        rename_map = {}
        for col in df.columns:
            col_lower = col.lower()
            if col_lower in ['time', 'timestamp']:
                rename_map[col] = 'Time'
            elif col_lower in ['depth', 'derinlik']:
                rename_map[col] = 'Depth'
            elif col_lower == 'ax':
                rename_map[col] = 'Ax'
            elif col_lower == 'ay':
                rename_map[col] = 'Ay'
            elif col_lower == 'az':
                rename_map[col] = 'Az'
            elif col_lower in ['pitch', 'pitching']:
                rename_map[col] = 'pitch'
            elif col_lower in ['roll', 'rolling']:
                rename_map[col] = 'roll'
            elif col_lower in ['yaw', 'heading']:
                rename_map[col] = 'yaw'
            elif col_lower in ['velocity', 'vel', 'hiz']:
                rename_map[col] = 'velocity'
            elif col_lower in ['distance', 'dist', 'mesafe']:
                rename_map[col] = 'distance'
            elif col_lower in ['rudderangle', 'rudder_angle', 'rudder angle', 'rudder']:
                rename_map[col] = 'rudderangle'
            elif col_lower in ['sternangle', 'stern_angle', 'stern angle', 'stern']:
                rename_map[col] = 'sternangle'
            elif col_lower in ['vx', 'v_x', 'velocityx', 'velocity_x']:
                rename_map[col] = 'vx'
            elif col_lower in ['vy', 'v_y', 'velocityy', 'velocity_y']:
                rename_map[col] = 'vy'
            elif col_lower in ['vz', 'v_z', 'velocityz', 'velocity_z']:
                rename_map[col] = 'vz'
            elif col_lower in ['dx', 'd_x', 'distancex', 'distance_x']:
                rename_map[col] = 'dx'
            elif col_lower in ['dy', 'd_y', 'distancey', 'distance_y']:
                rename_map[col] = 'dy'
            elif col_lower in ['dz', 'd_z', 'distancez', 'distance_z']:
                rename_map[col] = 'dz'
            elif col_lower == 'rpm':
                rename_map[col] = 'rpm'
                
        df.rename(columns=rename_map, inplace=True)
        
        # Check if time column exists
        time_col = 'Time' if 'Time' in df else (df.columns[2] if len(df.columns) > 2 else df.columns[0])
        
        # Convert time to seconds
        df['Time_Sec'] = (df[time_col] - df[time_col].iloc[0]) / 1000.0

        # Define 5 subplots for comprehensive analysis
        fig, axes = plt.subplots(5, 1, figsize=(14, 15), sharex=True)
        plt.subplots_adjust(hspace=0.35)

        # 1. PANEL: Acceleration Data
        has_acc = False
        if 'Ax' in df:
            axes[0].plot(df['Time_Sec'], df['Ax'], label='Ax (İleri)', color='#ff4b2b', alpha=0.8)
            has_acc = True
        if 'Ay' in df:
            axes[0].plot(df['Time_Sec'], df['Ay'], label='Ay (Sağ-Sol)', color='#2af598', alpha=0.8)
            has_acc = True
        if 'Az' in df:
            axes[0].plot(df['Time_Sec'], df['Az'], label='Az (Dikey)', color='#00d4ff', alpha=0.6)
            has_acc = True
        axes[0].set_ylabel('İvme (m/s²)')
        axes[0].set_title(f"SARA Sensör Analiz Raporu - {os.path.basename(file_path)}")
        if has_acc:
            axes[0].legend(loc='upper right', fontsize='small')
        axes[0].grid(True, alpha=0.2)

        # 2. PANEL: Attitude Angles
        has_att = False
        if 'yaw' in df:
            axes[1].plot(df['Time_Sec'], df['yaw'], label='Yaw (Rota)', color='#ffd700', linewidth=2)
            has_att = True
        if 'pitch' in df:
            axes[1].plot(df['Time_Sec'], df['pitch'], label='Pitch (Yunuslama)', color='#ff4b2b', linestyle='--')
            has_att = True
        if 'roll' in df:
            axes[1].plot(df['Time_Sec'], df['roll'], label='Roll (Yatış)', color='#2af598', linestyle=':')
            has_att = True
        axes[1].set_ylabel('Derece (°)')
        if has_att:
            axes[1].legend(loc='upper right', fontsize='small')
        axes[1].grid(True, alpha=0.2)

        # 3. PANEL: Depth and Displacements
        has_depth = False
        if 'Depth' in df:
            axes[2].plot(df['Time_Sec'], df['Depth'], label='Derinlik (m)', color='#00d4ff', linewidth=2)
            axes[2].invert_yaxis()  # Underwater logic: depth increases downwards
            has_depth = True
            
        # Plot dx, dy, dz on a twin scale if available
        ax_pos = axes[2].twinx() if ('dx' in df or 'dy' in df or 'dz' in df) else None
        if ax_pos:
            if 'dx' in df: ax_pos.plot(df['Time_Sec'], df['dx'], label='dx', color='#ec4899', linestyle='--', alpha=0.7)
            if 'dy' in df: ax_pos.plot(df['Time_Sec'], df['dy'], label='dy', color='#14b8a6', linestyle=':', alpha=0.7)
            if 'dz' in df: ax_pos.plot(df['Time_Sec'], df['dz'], label='dz', color='#84cc16', linestyle='-.', alpha=0.7)
            ax_pos.set_ylabel('Konum Değişimi (m)')
            # Merge legends
            lines, labels = axes[2].get_legend_handles_labels()
            lines2, labels2 = ax_pos.get_legend_handles_labels()
            axes[2].legend(lines + lines2, labels + labels2, loc='upper right')
        elif has_depth:
            axes[2].legend(loc='upper right')
            
        axes[2].set_ylabel('Derinlik (m)')
        axes[2].grid(True, alpha=0.2)

        # 4. PANEL: Velocities
        has_vel = False
        if 'distance' in df:
            axes[3].plot(df['Time_Sec'], df['distance'], label='Mesafe (m)', color='black', linewidth=2)
            has_vel = True
        
        ax_vel = axes[3].twinx()
        has_twin_vel = False
        if 'velocity' in df:
            ax_vel.plot(df['Time_Sec'], df['velocity'], label='Hız (m/s)', color='gray', alpha=0.6, linestyle='--')
            has_twin_vel = True
        if 'vx' in df:
            ax_vel.plot(df['Time_Sec'], df['vx'], label='vx', color='#3b82f6', alpha=0.8)
            has_twin_vel = True
        if 'vy' in df:
            ax_vel.plot(df['Time_Sec'], df['vy'], label='vy', color='#10b981', alpha=0.8)
            has_twin_vel = True
        if 'vz' in df:
            ax_vel.plot(df['Time_Sec'], df['vz'], label='vz', color='#6366f1', alpha=0.8)
            has_twin_vel = True
            
        if has_twin_vel:
            ax_vel.set_ylabel('Hız (m/s)')
            lines, labels = axes[3].get_legend_handles_labels()
            lines2, labels2 = ax_vel.get_legend_handles_labels()
            axes[3].legend(lines + lines2, labels + labels2, loc='upper left')
        elif has_vel:
            axes[3].legend(loc='upper left')
            
        axes[3].set_ylabel('Mesafe (m)')
        axes[3].grid(True, alpha=0.2)

        # 5. PANEL: Control Surfaces
        has_ctrl = False
        if 'rudderangle' in df:
            axes[4].plot(df['Time_Sec'], df['rudderangle'], label='Rudder Açısı', color='#e11d48', linewidth=1.5)
            has_ctrl = True
        if 'sternangle' in df:
            axes[4].plot(df['Time_Sec'], df['sternangle'], label='Stern Açısı', color='#f59e0b', linewidth=1.5, linestyle='--')
            has_ctrl = True
            
        axes[4].set_ylabel('Açı (°)')
        axes[4].set_xlabel('Zaman (Saniye)')
        if has_ctrl:
            axes[4].legend(loc='upper right')
        axes[4].grid(True, alpha=0.2)

        # Save Report
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