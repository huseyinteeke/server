import pandas as pd
import matplotlib.pyplot as plt
import os



def run_post_analysis(file_path):
    try:
        # CSV file (Time, Depth , Ax  , Ay , Az , pitch , roll , yaw , velocity , distance)
        df = pd.read_csv(file_path, names=['Time'
                                           ,'Depth' 
                                           , 'Ax'  
                                           , 'Ay' 
                                           , 'Az' 
                                           , 'pitch' 
                                           , 'roll' 
                                           , 'yaw' 
                                           , 'velocity' ,
                                             'distance'])
        
        plt.figure(figsize=(10, 5))
        plt.plot(df['Time'], df['Depth'], label='Depth')
        plt.plot(df['Time'], df['Ax'], label='Ax')
        plt.plot(df['Time'], df['Ay'], label='Ay')
        plt.plot(df['Time'], df['Az'], label='Az')
        plt.plot(df['Time'], df['pitch'], label='pitch')
        plt.plot(df['Time'], df['roll'], label='roll')
        plt.plot(df['Time'], df['yaw'], label='yaw')
        plt.plot(df['Time'], df['velocity'], label='velocity')
        plt.plot(df['Time'], df['distance'], label='distance')

        plt.title(f"Analiz: {os.path.basename(file_path)}")
        plt.legend()
        
        # Grafik dosyasını kaydet
        report_path = file_path.replace('.csv', '.png')
        plt.savefig(report_path)
        plt.close()
        print(f"[SUCCESS] report done: {report_path}")
    except Exception as e:
        print(f"[ERROR] analysis error: {e}")