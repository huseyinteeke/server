const socket = io();
const CHART_WINDOW = 50;

const variables = [
    { key: 'Depth', color: '#00d4ff' }, { key: 'Ax', color: '#ff4b2b' },
    { key: 'Ay', color: '#2af598' }, { key: 'Az', color: '#00d4ff' },
    { key: 'pitch', color: '#ff4b2b' }, { key: 'roll', color: '#2af598' },
    { key: 'yaw', color: '#ffd700' }, { key: 'velocity', color: '#bdc3c7' },
    { key: 'distance', color: '#2af598' }
];

const charts = {};

document.addEventListener('DOMContentLoaded', () => {
    variables.forEach(v => {
        const ctx = document.getElementById('chart_' + v.key).getContext('2d');
        charts[v.key] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(CHART_WINDOW).fill(""),
                datasets: [{ data: Array(CHART_WINDOW).fill(null), borderColor: v.color, borderWidth: 2, pointRadius: 0, fill: false }]
            },
            options: { animation: false, responsive: true, maintainAspectRatio: false, scales: { x: { display: false }, y: { grid: { color: '#222' } } }, plugins: { legend: { display: false } } }
        });
    });
});

socket.on('update_chart', (data) => {
    if(data.armed !== undefined) updateStatusBox(data.armed);
    variables.forEach(v => {
        const chart = charts[v.key];
        if (chart && data[v.key] !== undefined) {
            chart.data.datasets[0].data.push(data[v.key]);
            chart.data.datasets[0].data.shift();
            chart.update('none');
        }
    });
});

function sendCommand(cmd) { socket.emit('ui_command', { action: cmd }); }

function sendPID() {
   const getFloat = (id) => {
        const val = document.getElementById(id).value;
        return parseFloat(val) || 0; // Boşsa veya geçersizse 0 döner
    };

    const payload = {
        action: "PID_SETPOINT_UPDATE",
        // PITCH Grubu
        kppitch: getFloat('kp_pitch'),
        kipitch: getFloat('ki_pitch'),
        kdpitch: getFloat('kd_pitch'),
        setpitch: getFloat('sp_pitch'),
        // YAW Grubu
        kpyaw: getFloat('kp_yaw'),
        kiyaw: getFloat('ki_yaw'),
        kdyaw: getFloat('kd_yaw'),
        setyaw: getFloat('sp_yaw')
    };

    console.log("[JS] Giden Paket:", payload);
    socket.emit('ui_command', payload);
}

function updateStatusBox(armed) {
    const box = document.getElementById('status-box');
    box.innerText = armed ? "ARMED" : "DISARMED";
    box.className = armed ? "status-danger" : "status-safe";
}



function confirmReset() {
    if (confirm("Are you sure?")) {
        console.log("[JS] Reset sending...");
        socket.emit('ui_command', { action: 'RESET' });
    }
}







/**
 * Helper function to calculate CRC32 of a buffer
 * Standard Polynomial: 0xEDB88320
 */

function calculateFastCRC32(buffer) {
    let table = window.crc32Table;
    if (!table) {
        table = [];
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) {
                c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            }
            table[i] = c;
        }
        window.crc32Table = table;
    }

    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buffer.length; i++) {
        crc = (crc >>> 8) ^ table[(crc ^ buffer[i]) & 0xFF];
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}









/**
 * Main Firmware Upload Function
 */
/*
function uploadFirmware() {
    const fileInput = document.getElementById('fileInput');
    const progressBar = document.getElementById('uploadProgressBar');
    const progressContainer = document.getElementById('uploadProgressContainer');
    const statusText = document.getElementById('uploadStatus');

    if (fileInput.files.length === 0) {
        alert("Error: No .bin file selected!");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    // 1. Show UI elements and reset progress
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    statusText.style.color = "#c5c6c7"; // Default color
    statusText.innerText = "Reading file for CRC calculation...";

    // 2. Read the file to calculate CRC before sending
    reader.onload = function(e) {
        const buffer = new Uint8Array(e.target.result);
        const fileCrc = calculateCRC32(buffer);
        const crcHex = fileCrc.toString(16).toUpperCase();

        console.log(`[GCS] File: ${file.name} | CRC32: 0x${crcHex}`);

        // 3. Prepare XHR and FormData
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append("file", file);

        // Upload progress listener
        xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
                const percent = (e.loaded / e.total) * 100;
                progressBar.style.width = percent + "%";
                statusText.innerText = `Uploading to ESP: %${Math.round(percent)}`;
            }
        });

        // Response handler
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    statusText.innerText = "SUCCESS: Uploaded to ESP. Transferring to STM32...";
                    statusText.style.color = "#00ff00";
                    console.log("[GCS] ESP response: " + xhr.responseText);
                } else {
                    statusText.innerText = `ERROR: Upload failed! (Status: ${xhr.status})`;
                    statusText.style.color = "#ff0000";
                    console.error("[GCS] Upload failed.");
                }
            }
        };

        // 4. Send request with CRC in custom header
        const ESP_IP = "10.126.19.100"; 
        const targetUrl = `http://${ESP_IP}/upload_firmware`; 
        console.log("[GCS] Hedef URL:", targetUrl);
        xhr.open("POST", targetUrl, true); // Sadece bu satır kalsın
        xhr.setRequestHeader("X-File-CRC", crcHex);
        xhr.send(formData);
    };

    reader.onerror = function() {
        statusText.innerText = "Error: Could not read file!";
        statusText.style.color = "#ff0000";
    };

    reader.readAsArrayBuffer(file);
}
*/




function uploadFirmware() {
    console.log("[DEBUG] 1. uploadFirmware fonksiyonu tetiklendi.");
    
    const fileInput = document.getElementById('fileInput');
    const progressBar = document.getElementById('uploadProgressBar');
    const progressContainer = document.getElementById('uploadProgressContainer');
    const statusText = document.getElementById('uploadStatus');

    // HTML elemanları gerçekten var mı kontrolü
    if (!progressContainer || !progressBar || !statusText) {
        console.error("[DEBUG] HATA: HTML tarafında progress barlarının ID'leri bulunamadı!");
        return; 
    }

    if (fileInput.files.length === 0) {
        alert("Lütfen bir .bin dosyası seçin!");
        return;
    }

    const file = fileInput.files[0];
    console.log(`[DEBUG] 2. Dosya seçildi: ${file.name}`);

    // UI güncellemeleri
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    statusText.style.color = "#c5c6c7"; 
    statusText.innerText = "Okuma başlatılıyor...";

    const reader = new FileReader();

    // Okuma BAŞARILI olursa buraya girmeli
    reader.onload = function(e) {
        console.log("[DEBUG] 4. BİNGÖOO! onload içine başarıyla girildi!");
        // (Burada CRC ve yükleme işlemleri olacak, şimdilik sadece girip girmediğine bakıyoruz)
        statusText.innerText = "Dosya başarıyla okundu!";
    
    try {
            const buffer = new Uint8Array(e.target.result);
            console.log("[DEBUG] 5. Buffer oluşturuldu, uzunluk:", buffer.length);

            // CRC HESAPLAMA TESTİ
            console.log("[DEBUG] 6. CRC hesaplaması başlıyor...");
            // Burada eğer calculateCRC32 fonksiyonun hatalıysa kod burada donar
            const fileCrc = calculateFastCRC32(buffer); 
            const crcHex = fileCrc.toString(16).toUpperCase();
            console.log("[DEBUG] 7. CRC hesaplandı:", crcHex);

            // İSTEK HAZIRLAMA
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append("file", file);
            
            const ESP_IP = "10.17.15.101"; 
            const targetUrl = `http://${ESP_IP}/upload_firmware`;
            
            console.log("[DEBUG] 8. XHR açılıyor, Hedef:", targetUrl);
            xhr.open("POST", targetUrl, true);
            xhr.setRequestHeader("X-File-CRC", crcHex);
            
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    console.log("[DEBUG] 10. Yanıt geldi, Statü:", xhr.status);
                }
            };

            console.log("[DEBUG] 9. Dosya gönderiliyor (send)...");
            xhr.send(formData);

        } catch (err) {
            console.error("[DEBUG] !!! PATLADIK !!! Hata detayı:", err.message);
            statusText.innerText = "Hata: " + err.message;
        }
    };

    // Okuma BAŞARISIZ olursa buraya girmeli
    reader.onerror = function(e) {
        console.error("[DEBUG] 4. HATA! onerror içine girdi. Tarayıcı dosyayı okuyamıyor!");
        console.error(e);
        statusText.innerText = "Hata: Dosya kilitli veya bozuk!";
        statusText.style.color = "#ff0000";
    };

    console.log("[DEBUG] 3. readAsArrayBuffer fonksiyonu çağrılıyor...");
    reader.readAsArrayBuffer(file);
}





//BBOX logic

let offlineLogs = [];
let isDownloading = false;



function updateLogStatus(msg) {
    const statusEl = document.getElementById('logStatusText');
    if (statusEl) statusEl.innerText = msg;
    console.log("[BBOX] " + msg);
}

function downloadAsCSV(dataArray, filename) {
    if (!dataArray || !dataArray.length) {
        return;
    }

    const headers = Object.keys(dataArray[0]);
    let csvContent = headers.join(",") + "\n";

    dataArray.forEach(row => {
        let values = headers.map(header => {
            return row[header] !== undefined ? row[header] : "";
        });
        csvContent += values.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


socket.on('log_data' , (data) => {
    offlineLogs.push(data);
    if (offlineLogs.length % 50 === 0) {
        updateLogStatus(`Downloading... ${offlineLogs.length} packets taken.`);
    }
});


socket.on('log_status', (status) => {
    if (status === "Tamamlandı" || status === "Tamamlandi") {
        updateLogStatus(`Finished. ${offlineLogs.length} packets. CSV preapearing...`);        
        downloadAsCSV(offlineLogs, "SARA_Offline_Log.csv");
        
        isDownloading = false;
        setTimeout(() => updateLogStatus(""), 4000); 
        
    } else if (status === "Buffer boş" || status === "Buffer bos") {
        updateLogStatus("İndirilecek log bulunamadı (Buffer boş).");
        isDownloading = false;
        setTimeout(() => updateLogStatus(""), 4000);
        
    } else {
        updateLogStatus(`Status: ${status}`);
    }
});



function downloadAsCSV(data , filename)
{
    if (!data || data.length === 0) return;


    const dateStr = new Date().toLocaleDateString('tr-TR');
    const timeStr = new Date().toLocaleTimeString('tr-TR');

    const headers = "Log_Date,Log_Time," + Object.keys(data[0]).join(",");

    const rows = data.map(obj => {
        const values = Object.values(obj).join(",");
        return `${dateStr},${timeStr},${values}`;
    }).join("\n");



    const csvContent = headers + "\n" + rows;


    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

}


function downloadLogs()
{
    if (isDownloading)
    {
        console.log("[BBOX] already download mode");
        return;
    }

    const now = new Date();
    const timestamp = now.getFullYear() + "-" + 
                      String(now.getMonth() + 1).padStart(2, '0') + "-" + 
                      String(now.getDate()).padStart(2, '0') + "_" + 
                      String(now.getHours()).padStart(2, '0') + "-" + 
                      String(now.getMinutes()).padStart(2, '0') + "-" + 
                      String(now.getSeconds()).padStart(2, '0');
    const fileName = `SARA_Log_${timestamp}.csv`;
    console.log(`[BBOX] Hazırlanıyor: ${fileName}`);
    downloadAsCSV(offlineLogs , fileName);

    offlineLogs = [];
    isDownloading = true;
    updateLogStatus("Taking Logs");
    socket.emit('ui_command', { action: "DOWNLOAD" });
}
