"""Raspberry Pi 3B reference dashboard for the supplied Solar Monitor guide.
Reads the GoDaddy API for telemetry and can display an ESP32-CAM LAN stream.
"""
import os, time, threading, tkinter as tk
import cv2
import requests
from PIL import Image, ImageTk
from analysis import evaluate, analyze_frame

API_BASE = os.getenv('SOLAR_API_BASE', 'https://voltarax.in')
DEVICE_USER_TOKEN = os.getenv('SOLAR_DASHBOARD_TOKEN', '')
CAM_URL = os.getenv('SOLAR_CAM_URL', 'http://192.168.1.60:81/stream')
latest = {}
cam_frame = None


def api_get(path):
    headers = {'Authorization': f'Bearer {DEVICE_USER_TOKEN}'} if DEVICE_USER_TOKEN else {}
    r = requests.get(API_BASE + path, headers=headers, timeout=8)
    r.raise_for_status()
    return r.json()


def data_loop():
    global latest
    while True:
        try:
            latest = api_get('/api/telemetry/latest').get('latest') or {}
        except Exception:
            pass
        time.sleep(2)


def camera_loop():
    global cam_frame
    while True:
        cap = cv2.VideoCapture(CAM_URL)
        while cap.isOpened():
            ok, frame = cap.read()
            if not ok: break
            cam_frame = cv2.resize(frame, (320, 240))
        cap.release()
        time.sleep(3)

root = tk.Tk()
root.attributes('-fullscreen', True)
root.configure(bg='#101820')
root.bind('<Escape>', lambda e: root.destroy())
video = tk.Label(root, bg='black'); video.place(x=8, y=8, width=320, height=240)
status = tk.Label(root, text='Waiting for hardware...', font=('Arial', 16, 'bold'), bg='#444', fg='white')
status.place(x=8, y=262, width=784, height=40)
alerts_lbl = tk.Label(root, text='', justify='left', anchor='nw', fg='#ffd166', bg='#101820', font=('Arial', 11), wraplength=780)
alerts_lbl.place(x=8, y=310, width=784, height=160)

TILES = [('voltage_v','Voltage','V'),('current_ma','Current','mA'),('power_mw','Power','mW'),('light_lux','Light','lux'),('temp_c','Temp','C'),('humidity_pct','Humidity','%'),('dust_ugm3','Dust','ug/m3')]
vars_ = {}
for i,(key,title,unit) in enumerate(TILES):
    f=tk.Frame(root,bg='#1b2a38'); f.place(x=340+(i%3)*152,y=8+(i//3)*82,width=146,height=76)
    tk.Label(f,text=f'{title} ({unit})',fg='#9fb3c8',bg='#1b2a38',font=('Arial',10)).pack()
    vars_[key]=tk.StringVar(value='--')
    tk.Label(f,textvariable=vars_[key],fg='white',bg='#1b2a38',font=('Arial',22,'bold')).pack()

COLORS={'OK':'#2a9d8f','WARNING':'#e9a820','FAULT':'#d62828','OFFLINE':'#6c757d'}

def refresh():
    d=dict(latest)
    for key,_,_ in TILES:
        if key in d: vars_[key].set(f'{d[key]:.2f}' if isinstance(d[key],float) else str(d[key]))
    if d:
        result=evaluate(d)
        if cam_frame is not None: result['camera']=analyze_frame(cam_frame)
        status.config(text=f"{result['status']} health {result['health_score']}%",bg=COLORS[result['status']])
        alerts_lbl.config(text='\n'.join('- '+a for a in result['alerts']) or 'No alerts')
        if cam_frame is not None:
            img=ImageTk.PhotoImage(Image.fromarray(cv2.cvtColor(cam_frame,cv2.COLOR_BGR2RGB))); video.imgtk=img; video.config(image=img)
    root.after(500,refresh)

threading.Thread(target=data_loop,daemon=True).start()
threading.Thread(target=camera_loop,daemon=True).start()
refresh(); root.mainloop()
