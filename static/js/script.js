const socket = io();
const CHART_WINDOW = 50;

const variables = [
    { key: 'Depth', label: 'Depth', color: '#00d4ff', category: 'nav', unit: 'm', aliases: ['Depth', 'depth', 'DEPTH'] },
    { key: 'Ax', label: 'Acc X', color: '#ff4b2b', category: 'imu', unit: 'm/s²', aliases: ['Ax', 'ax', 'AX'] },
    { key: 'Ay', label: 'Acc Y', color: '#2af598', category: 'imu', unit: 'm/s²', aliases: ['Ay', 'ay', 'AY'] },
    { key: 'Az', label: 'Acc Z', color: '#ffd700', category: 'imu', unit: 'm/s²', aliases: ['Az', 'az', 'AZ'] },
    { key: 'pitch', label: 'Pitch', color: '#ff4b2b', category: 'nav', unit: '°', aliases: ['pitch', 'Pitch', 'PITCH'] },
    { key: 'roll', label: 'Roll', color: '#2af598', category: 'nav', unit: '°', aliases: ['roll', 'Roll', 'ROLL'] },
    { key: 'yaw', label: 'Yaw', color: '#ffd700', category: 'nav', unit: '°', aliases: ['yaw', 'Yaw', 'YAW'] },
    // New variables added by User
    { key: 'rudder_angle', label: 'Rudder Angle', color: '#e11d48', category: 'ctrl', unit: '°', aliases: ['rudderangle', 'rudder_angle', 'rudder angle', 'rudderAngle', 'RudderAngle', 'rudder'] },
    { key: 'stern_angle', label: 'Stern Angle', color: '#f59e0b', category: 'ctrl', unit: '°', aliases: ['sternangle', 'stern_angle', 'stern angle', 'sternAngle', 'SternAngle', 'stern'] },
    { key: 'vx', label: 'Vx', color: '#3b82f6', category: 'vel', unit: 'm/s', aliases: ['vx', 'v_x', 'velocityx', 'velocity_x', 'Vx'] },
    //{ key: 'vy', label: 'Vy', color: '#10b981', category: 'vel', unit: 'm/s', aliases: ['vy', 'v_y', 'velocityy', 'velocity_y', 'Vy'] },
    //{ key: 'vz', label: 'Vz', color: '#6366f1', category: 'vel', unit: 'm/s', aliases: ['vz', 'v_z', 'velocityz', 'velocity_z', 'Vz'] },
    { key: 'dx', label: 'Dx', color: '#ec4899', category: 'pos', unit: 'm', aliases: ['dx', 'd_x', 'distancex', 'distance_x', 'Dx'] },
    //{ key: 'dy', label: 'Dy', color: '#14b8a6', category: 'pos', unit: 'm', aliases: ['dy', 'd_y', 'distancey', 'distance_y', 'Dy'] },
    //{ key: 'dz', label: 'Dz', color: '#84cc16', category: 'pos', unit: 'm', aliases: ['dz', 'd_z', 'distancez', 'distance_z', 'Dz'] }
];

const charts = {};
let maximizedChartKey = null;
let maximizedChart = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Dynamically render chart containers
    const grid = document.querySelector('.charts-grid');
    if (grid) {
        grid.innerHTML = '';
        variables.forEach(v => {
            const card = document.createElement('div');
            card.className = 'chart-container';
            card.id = 'container_' + v.key;
            card.innerHTML = `
                <div class="chart-header">
                    <div class="title-group">
                        <span class="status-dot" style="background-color: ${v.color}; box-shadow: 0 0 8px ${v.color};"></span>
                        <h4>${v.label}</h4>
                    </div>
                    <div class="value-group">
                        <span class="live-value" id="val_${v.key}">--</span>
                        <span class="unit">${v.unit}</span>
                        <button class="btn-maximize" onclick="maximizeChart('${v.key}')" title="Zoom Chart">
                            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                        </button>
                    </div>
                </div>
                <div class="canvas-wrapper">
                    <canvas id="chart_${v.key}"></canvas>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    // 2. Initialize Chart.js for each variable
    variables.forEach(v => {
        const canvas = document.getElementById('chart_' + v.key);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        // Linear gradient for chart area fill
        const gradient = ctx.createLinearGradient(0, 0, 0, 100);
        gradient.addColorStop(0, v.color + '26'); // 15% opacity
        gradient.addColorStop(1, v.color + '00'); // 0% opacity

        charts[v.key] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(CHART_WINDOW).fill(""),
                datasets: [{
                    data: Array(CHART_WINDOW).fill(null),
                    borderColor: v.color,
                    backgroundColor: gradient,
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: true,
                    tension: 0.15
                }]
            },
            options: {
                animation: false,
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { display: false },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.04)' },
                        ticks: { color: '#8f9cae', font: { size: 9, family: 'Share Tech Mono' } }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
    });
});

socket.on('update_chart', (data) => {
    if(data.armed !== undefined) updateStatusBox(data.armed);
    
    variables.forEach(v => {
        const chart = charts[v.key];
        if (chart) {
            // Check main key or aliases
            let val = data[v.key];
            if (val === undefined && v.aliases) {
                for (let alias of v.aliases) {
                    if (data[alias] !== undefined) {
                        val = data[alias];
                        break;
                    }
                }
            }

            if (val !== undefined) {
                const numericVal = parseFloat(val);
                if (!isNaN(numericVal)) {
                    // Update numeric readout in grid card
                    const valEl = document.getElementById('val_' + v.key);
                    if (valEl) {
                        valEl.innerText = numericVal % 1 === 0 ? numericVal : numericVal.toFixed(2);
                    }

                    // Update grid chart dataset
                    chart.data.datasets[0].data.push(numericVal);
                    chart.data.datasets[0].data.shift();
                    chart.update('none');

                    // If currently maximized and matches the key, update maximized chart too
                    if (maximizedChartKey === v.key && maximizedChart) {
                        const maxValEl = document.getElementById('modalValue');
                        if (maxValEl) {
                            maxValEl.innerText = numericVal % 1 === 0 ? numericVal : numericVal.toFixed(2);
                        }
                        maximizedChart.data.datasets[0].data.push(numericVal);
                        maximizedChart.data.datasets[0].data.shift();
                        maximizedChart.update('none');
                    }
                }
            }
        }
    });
});

// Category filtering tab functionality
function filterCategory(category, element) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    }

    variables.forEach(v => {
        const container = document.getElementById('container_' + v.key);
        if (!container) return;
        if (category === 'all' || v.category === category) {
            container.classList.remove('hidden-card');
            if (charts[v.key]) {
                // Let chart engine adapt to layout change
                setTimeout(() => charts[v.key].resize(), 10);
            }
        } else {
            container.classList.add('hidden-card');
        }
    });
}

// Maximize chart to modal overlay
function maximizeChart(key) {
    const v = variables.find(x => x.key === key);
    if (!v) return;

    maximizedChartKey = key;
    const modal = document.getElementById('chartModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalValue = document.getElementById('modalValue');
    const modalUnit = document.getElementById('modalUnit');
    const canvas = document.getElementById('maximizedChartCanvas');
    const dot = modal.querySelector('.modal-status-dot');

    modalTitle.innerText = v.label;
    modalUnit.innerText = v.unit;
    
    // Match colors
    dot.style.backgroundColor = v.color;
    dot.style.boxShadow = `0 0 10px ${v.color}`;
    
    const curVal = document.getElementById('val_' + key).innerText;
    modalValue.innerText = curVal;
    
    modal.style.display = 'flex';
    
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, v.color + '33');
    gradient.addColorStop(1, v.color + '00');

    const originalChart = charts[key];
    const historicalData = [...originalChart.data.datasets[0].data];

    if (maximizedChart) {
        maximizedChart.destroy();
    }

    maximizedChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(CHART_WINDOW).fill(""),
            datasets: [{
                data: historicalData,
                borderColor: v.color,
                backgroundColor: gradient,
                borderWidth: 2.5,
                pointRadius: 1,
                pointHoverRadius: 4,
                fill: true,
                tension: 0.15
            }]
        },
        options: {
            animation: { duration: 150 },
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { color: '#8f9cae', font: { family: 'Share Tech Mono' } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.06)' },
                    ticks: { color: '#8f9cae', font: { family: 'Share Tech Mono' } }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#66fcf1',
                    bodyColor: '#fff',
                    bodyFont: { family: 'Share Tech Mono', size: 12 },
                    borderColor: 'rgba(102, 252, 241, 0.2)',
                    borderWidth: 1
                }
            }
        }
    });
}

function closeModal() {
    const modal = document.getElementById('chartModal');
    modal.style.display = 'none';
    maximizedChartKey = null;
    if (maximizedChart) {
        maximizedChart.destroy();
        maximizedChart = null;
    }
}

function sendCommand(cmd) { socket.emit('ui_command', { action: cmd }); }

function sendPID() {
   const getFloat = (id) => {
        const val = document.getElementById(id).value;
        return parseFloat(val) || 0;
    };

    const payload = {
        action: "PID_SETPOINT_UPDATE",
        // PITCH Group
        kppitch: getFloat('kp_pitch'),
        kipitch: getFloat('ki_pitch'),
        kdpitch: getFloat('kd_pitch'),
        setpitch: getFloat('sp_pitch'),
        // YAW Group
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
    if (confirm("Are you sure you want to perform a system reset?")) {
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
 * Firmware upload logic (FOTA)
 */
function uploadFirmware() {
    console.log("[DEBUG] uploadFirmware triggered.");
    
    const fileInput = document.getElementById('fileInput');
    const progressBar = document.getElementById('uploadProgressBar');
    const progressContainer = document.getElementById('uploadProgressContainer');
    const statusText = document.getElementById('uploadStatus');

    if (!progressContainer || !progressBar || !statusText) {
        console.error("[DEBUG] Error: DOM elements for upload progress not found!");
        return; 
    }

    if (fileInput.files.length === 0) {
        alert("Please select a valid .bin firmware file!");
        return;
    }

    const file = fileInput.files[0];
    console.log(`[DEBUG] File selected: ${file.name}`);

    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    statusText.style.color = "#8f9cae"; 
    statusText.innerText = "Reading file...";

    const reader = new FileReader();

    reader.onload = function(e) {
        statusText.innerText = "File read complete. Calculating CRC...";
        
        try {
            const buffer = new Uint8Array(e.target.result);
            const fileCrc = calculateFastCRC32(buffer); 
            const crcHex = fileCrc.toString(16).toUpperCase();
            console.log("[DEBUG] CRC calculated: 0x" + crcHex);

            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append("file", file);
            
            const ESP_IP = "10.95.9.101"; 
            const targetUrl = `http://${ESP_IP}/upload_firmware`;
            
            console.log("[DEBUG] XHR posting to:", targetUrl);
            xhr.open("POST", targetUrl, true);
            xhr.setRequestHeader("X-File-CRC", crcHex);
            
            // Upload progress event
            xhr.upload.addEventListener("progress", (e) => {
                if (e.lengthComputable) {
                    const percent = (e.loaded / e.total) * 100;
                    progressBar.style.width = percent + "%";
                    statusText.innerText = `Uploading: ${Math.round(percent)}%`;
                }
            });

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    console.log("[DEBUG] Response received. Status:", xhr.status);
                    if (xhr.status === 200) {
                        statusText.innerText = "SUCCESS: Flashed to ESP. Transferring to STM32...";
                        statusText.style.color = "#00ff87";
                    } else {
                        statusText.innerText = `ERROR: Flash failed (HTTP ${xhr.status})`;
                        statusText.style.color = "#f43f5e";
                    }
                }
            };

            xhr.send(formData);

        } catch (err) {
            console.error("[DEBUG] CRC Calculation / Upload process crashed:", err.message);
            statusText.innerText = "Error: " + err.message;
            statusText.style.color = "#f43f5e";
        }
    };

    reader.onerror = function(e) {
        console.error("[DEBUG] FileReader failed reading file.");
        statusText.innerText = "Error: Could not read file!";
        statusText.style.color = "#f43f5e";
    };

    reader.readAsArrayBuffer(file);
}

// BBOX log downloader logic
let offlineLogs = [];
let isDownloading = false;

function updateLogStatus(msg) {
    const statusEl = document.getElementById('logStatusText');
    if (statusEl) statusEl.innerText = msg;
    console.log("[BBOX] " + msg);
}

function downloadAsCSV(data, filename) {
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

socket.on('log_data', (data) => {
    offlineLogs.push(data);
    if (offlineLogs.length % 50 === 0) {
        updateLogStatus(`Downloading... ${offlineLogs.length} packets taken.`);
    }
});

socket.on('log_status', (status) => {
    if (status === "Tamamlandı" || status === "Tamamlandi") {
        updateLogStatus(`Finished. ${offlineLogs.length} packets. CSV preparing...`);        
        downloadAsCSV(offlineLogs, "SARA_Offline_Log.csv");
        isDownloading = false;
        setTimeout(() => updateLogStatus(""), 4000); 
    } else if (status === "Buffer boş" || status === "Buffer bos") {
        updateLogStatus("No logs found on device (Buffer empty).");
        isDownloading = false;
        setTimeout(() => updateLogStatus(""), 4000);
    } else {
        updateLogStatus(`Status: ${status}`);
    }
});

function downloadLogs() {
    if (isDownloading) {
        console.log("[BBOX] already downloading logs...");
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
    console.log(`[BBOX] Preparing: ${fileName}`);
    downloadAsCSV(offlineLogs, fileName);

    offlineLogs = [];
    isDownloading = true;
    updateLogStatus("Requesting Logs from Device...");
    socket.emit('ui_command', { action: "DOWNLOAD" });
}

// Waypoint görevlerini hafızada tutacak dizi
let waypointSequence = [];

// Yeni komut ekleme fonksiyonu (Gelişmiş Debug Logları İçerir)
function addWaypoint() {
    console.log("[DEBUG-WP] addWaypoint() tetiklendi.");

    const actionElement = document.getElementById('wp_action');
    const valueElement = document.getElementById('wp_value');

    if (!actionElement || !valueElement) {
        console.error("[DEBUG-WP] HATA: HTML elementleri (wp_action veya wp_value) bulunamadı! ID'leri kontrol edin.");
        return;
    }

    const action = actionElement.value;
    const valueStr = valueElement.value;
    console.log(`[DEBUG-WP] Okunan Ham Değerler -> Action: '${action}', Value: '${valueStr}'`);

    const value = parseFloat(valueStr);

    // Boş veya geçersiz girişleri engelle
    if (isNaN(value)) {
        console.warn("[DEBUG-WP] UYARI: Girilen değer bir sayı değil. Ekleme iptal edildi.");
        alert("Lütfen geçerli bir sayısal değer girin!");
        return;
    }

    // Komutu listeye ekle
    waypointSequence.push({ action: action, value: value });
    console.log("[DEBUG-WP] Diziye yeni komut eklendi. Güncel dizi:", waypointSequence);
    
    // Arayüzü güncelle
    updateWaypointUI();
    
    // İşlem sonrası inputu temizle
    valueElement.value = '';
    console.log("[DEBUG-WP] Input kutusu temizlendi, işlem başarılı.");
}

// Komut silme fonksiyonu (listede komutun yanındaki 'X' tuşuna basıldığında)
function removeWaypoint(index) {
    console.log(`[DEBUG-WP] removeWaypoint(${index}) tetiklendi.`);
    waypointSequence.splice(index, 1);
    updateWaypointUI();
}

// Arayüzdeki (HTML) listeyi güncelleyen fonksiyon
// Arayüzdeki (HTML) listeyi güncelleyen fonksiyon
function updateWaypointUI() {
    console.log("[DEBUG-WP] updateWaypointUI() çalışıyor...");
    const list = document.getElementById('waypoint_list');
    
    if (!list) {
         console.error("[DEBUG-WP] HATA: 'waypoint_list' ID'sine sahip UL elementi bulunamadı!");
         return;
    }

    list.innerHTML = ''; // Önce listeyi temizle
    
    waypointSequence.forEach((wp, index) => {
        const li = document.createElement('li');
        
        // Eleman tasarımı
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.background = 'rgba(255,255,255,0.05)';
        li.style.marginBottom = '5px';
        li.style.padding = '5px 10px';
        li.style.borderRadius = '4px';

        // İşlem tipine göre ekranda yazacak metni belirle
        const actionText = wp.action === 'MOVE' ? 'İlerle' : 
                           wp.action === 'TURN' ? 'Dön' : 'Derinliğe İn';
                           
        // İşlem tipine göre birimi belirle (Dönüş için derece, diğerleri için metre)
        const unitText = wp.action === 'TURN' ? '°' : 'm'; 
        
        li.innerHTML = `
            <span>${index + 1}. ${actionText}: ${wp.value}${unitText}</span>
            <button onclick="removeWaypoint(${index})" style="background: transparent; border: none; color: #f43f5e; cursor: pointer; font-weight: bold; font-family: inherit;">X</button>
        `;
        list.appendChild(li);
    });
    console.log("[DEBUG-WP] UI Listesi başarıyla güncellendi.");
}


// Hazırlanan görev dizisini WebSocket üzerinden sunucuya gönderen fonksiyon
function sendWaypointSequence() {
    console.log("[DEBUG-WP] sendWaypointSequence() tetiklendi.");
    if (waypointSequence.length === 0) {
        console.warn("[DEBUG-WP] HATA: Dizi boş, ESP'ye gönderim yapılmayacak.");
        alert("Gönderilecek bir komut bulunamadı! Önce listeye komut ekleyin.");
        return;
    }

    // Payload (ESP'ye gidecek JSON formatı)
    const payload = {
        action: "WAYPOINT_SEQUENCE",
        commands: waypointSequence
    };

    console.log("[DEBUG-WP] ESP'ye gönderilecek Payload hazırlandı:", payload);
    
    // ui_command üzerinden veriyi ilet
    socket.emit('ui_command', payload);
    console.log("[DEBUG-WP] Payload socket üzerinden 'ui_command' kanalıyla gönderildi.");
}