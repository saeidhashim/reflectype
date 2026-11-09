"""End-to-end check in headless Chrome over the DevTools protocol.
Usage: python3 test/e2e.py [outdir]   (needs google-chrome and websocket-client)"""
import json, subprocess, sys, time, os, urllib.request, threading, http.server, socketserver, base64, functools
import websocket

out = sys.argv[1] if len(sys.argv) > 1 else "/tmp/e2e"
os.makedirs(out, exist_ok=True)
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=root)
Handler.log_message = lambda *a, **k: None
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", 8791), Handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
chrome = subprocess.Popen(["google-chrome", "--headless=new", "--no-sandbox", "--remote-debugging-port=9333",
    "--user-data-dir=/tmp/e2e-profile", "--hide-scrollbars", "about:blank"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(50):
    try:
        tabs = json.load(urllib.request.urlopen("http://127.0.0.1:9333/json")); break
    except Exception: time.sleep(0.2)
ws = websocket.create_connection([t for t in tabs if t["type"] == "page"][0]["webSocketDebuggerUrl"])
mid = 0
def send(method, **params):
    global mid; mid += 1; ws.send(json.dumps({"id": mid, "method": method, "params": params}))
    while True:
        m = json.loads(ws.recv())
        if m.get("id") == mid: return m.get("result", {})
def ev(js):
    r = send("Runtime.evaluate", expression=js, returnByValue=True, awaitPromise=True)
    if "exceptionDetails" in r: raise Exception(r["exceptionDetails"])
    return r["result"].get("value")
def go(url, w, h, mobile=False):
    send("Emulation.setDeviceMetricsOverride", width=w, height=h, deviceScaleFactor=2, mobile=mobile)
    send("Page.navigate", url=url); time.sleep(0.8)
def shot(name, full=False):
    r = send("Page.captureScreenshot", format="png", captureBeyondViewport=full)
    open(f"{out}/{name}.png", "wb").write(base64.b64decode(r["data"]))
fails = []
def check(name, cond):
    print(("PASS " if cond else "FAIL ") + name)
    if not cond: fails.append(name)

send("Page.enable"); send("Runtime.enable")
B = "http://127.0.0.1:8791/index.html"
errors = []
go(B, 1440, 900); ev("localStorage.clear()"); go(B, 1440, 900)
check("home shows 18 genres", ev("document.querySelectorAll('.g').length") == 18)
check("home has date", len(ev("document.getElementById('today').textContent")) > 8)
check("home hides tagline", ev("getComputedStyle(document.querySelector('.brand .tag')).display") == "none")
check("no streak feature in header", ev("document.getElementById('streak')") is None)
surround = ev("""(()=>{const c=document.querySelector('.hero-center').getBoundingClientRect();const rs=[...document.querySelectorAll('.g')].map(e=>e.getBoundingClientRect());const cx=rs.map(r=>(r.left+r.right)/2),cy=rs.map(r=>(r.top+r.bottom)/2);return Math.min(...cx)<c.left-30&&Math.max(...cx)>c.right+30&&Math.min(...cy)<c.top-30&&Math.max(...cy)>c.bottom+30})()""")
check("genres surround the headline on all sides", surround)
overlap = ev("""(()=>{const rs=[...document.querySelectorAll('.g')].map(e=>e.getBoundingClientRect());for(let i=0;i<rs.length;i++)for(let j=i+1;j<rs.length;j++){const a=rs[i],b=rs[j];if(a.left<b.right+2&&b.left<a.right+2&&a.top<b.bottom+2&&b.top<a.bottom+2)return [i,j]}return null})()""")
check("genre chips do not overlap", overlap is None)
shot("home-desktop")
brand_home = ev("JSON.stringify(document.querySelector('.brand').getBoundingClientRect().toJSON())")
ev("document.querySelector('.g').click()"); time.sleep(0.3)
check("header bar identical across views", ev("JSON.stringify(document.querySelector('.brand').getBoundingClientRect().toJSON())") == brand_home)
check("editor opens via hash", ev("location.hash") == "#/g/technology" and ev("document.body.dataset.view") == "editor")
check("editor shows title", "Technology" in ev("document.getElementById('e-title').textContent"))
check("notebook icon visible on desktop", ev("getComputedStyle(document.getElementById('nbtoggle')).display") != "none")
layout_ok = ev("""(()=>{const h=document.querySelector('#editor .nbhead').getBoundingClientRect();const v=document.getElementById('video').getBoundingClientRect();const x=document.getElementById('export-link-2').getBoundingClientRect();const p=document.querySelector('#editor .pad').getBoundingClientRect();const barTitle=getComputedStyle(document.querySelector('#editor .bar .title')).display==='none';const barExport=getComputedStyle(document.getElementById('export-link')).display==='none';const centered=Math.abs((v.top+v.bottom)/2-(p.top+p.bottom)/2)<40;return h.bottom<=v.top+1&&v.bottom<=x.top+1&&barTitle&&barExport&&centered})()""")
check("plain editor: title above video, export below, video centered to notepad", layout_ok)
vc_ok = ev("""(()=>{const v=document.getElementById('video').getBoundingClientRect();const c=document.getElementById('vcontrols').getBoundingClientRect();const x=document.getElementById('export-link-2').getBoundingClientRect();return v.bottom<=c.top+1&&c.bottom<=x.top+1})()""")
check("video controls sit between video and export", vc_ok)
check("controls disabled while video is a placeholder", ev("['vc-back','vc-play','vc-fwd','vc-vol'].every(id=>document.getElementById(id).disabled)"))

ev("document.getElementById('ta').focus()")
send("Input.insertText", text="Typing works. It is my own thought.")
time.sleep(0.8)
check("typed text accepted", "my own thought" in ev("document.getElementById('ta').value"))
check("autosave stored", "my own thought" in (ev("localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('reflectype:draft')))") or ""))
check("no saved indicator", ev("document.getElementById('saved')") is None)
blocked = ev("""(()=>{const t=document.getElementById('ta');const e=new ClipboardEvent('paste',{clipboardData:new DataTransfer(),bubbles:true,cancelable:true});t.dispatchEvent(e);
 const d=new DragEvent('drop',{bubbles:true,cancelable:true});t.dispatchEvent(d);return e.defaultPrevented&&d.defaultPrevented})()""")
check("paste and drop blocked", blocked)
shot("editor-desktop")
ev("document.getElementById('nbtoggle').click()"); time.sleep(0.3)
check("notebook on", ev("document.body.classList.contains('nb')"))
check("notebook keeps text", "my own thought" in ev("document.getElementById('ta').value"))
shot("notebook-desktop")
ev("document.getElementById('nbtoggle').click()")
go(B, 1440, 900)  # reload: draft persists
ev("location.hash='#/g/technology'"); time.sleep(0.4)
check("draft restored after reload", "my own thought" in ev("document.getElementById('ta').value"))
ev("document.getElementById('export-link').click()"); time.sleep(0.5)
check("export view", ev("document.body.dataset.view") == "export")
txt = ev("document.getElementById('copybox').textContent")
lines = txt.split("\n")
check("export layout text/blank/5 tags/@handle", lines[0].startswith("Typing works") and lines[1] == "" and len(lines[2].split(" ")) == 5 and lines[3] == "@yourbrand")
check("card drawn", ev("(()=>{const c=document.getElementById('card');const d=c.getContext('2d').getImageData(600,300,1,1).data;return d[3]>0})()"))
ev("document.getElementById('dl').click()"); time.sleep(0.8)
ev("document.getElementById('copy').click()"); time.sleep(0.8)
check("export leaves no streak storage", not ev("Object.keys(localStorage).some(k=>k.startsWith('reflectype:export:'))"))
shot("export-desktop")
# empty draft -> copy disabled
ev("localStorage.clear()"); ev("location.hash='#/g/science/export'"); time.sleep(0.5)
check("empty reflection disables copy", ev("document.getElementById('copy').disabled"))
# laptop: the notebook fits the visible height; long writing scrolls inside the page
go(B + "#/g/technology", 1280, 720); time.sleep(0.5)
ev("location.hash='#/'"); time.sleep(0.3)
ev("localStorage.setItem('reflectype:notebook','1')"); ev("location.hash='#/g/technology'"); time.sleep(0.6)
check("notebook active on laptop", ev("document.body.classList.contains('nb')"))
check("notebook fits laptop viewport", ev("document.documentElement.scrollHeight <= window.innerHeight + 1"))
ev("var t=document.getElementById('ta');t.value=Array(220).fill('word').join(' ');t.dispatchEvent(new Event('input'))"); time.sleep(0.4)
check("long writing scrolls inside the page, not the window", ev("(()=>{const t=document.getElementById('ta');return t.scrollHeight > t.clientHeight && document.documentElement.scrollHeight <= window.innerHeight + 1})()"))
shot("notebook-laptop")
ev("localStorage.removeItem('reflectype:notebook')")
# mobile
go(B + "#/", 390, 844, True)
shot("home-mobile", True)
ev("location.hash='#/g/technology'"); time.sleep(0.5)
send("Input.insertText", text="")
ev("document.getElementById('ta').value='Mobile note.';document.getElementById('ta').dispatchEvent(new Event('input'))"); time.sleep(0.8)
check("notebook icon hidden on mobile", ev("getComputedStyle(document.getElementById('nbtoggle')).display") == "none")
ev("localStorage.setItem('reflectype:notebook','1')"); ev("location.hash='#/'"); ev("location.hash='#/g/technology'"); time.sleep(0.4)
check("no notebook mode on mobile even if preferred", not ev("document.body.classList.contains('nb')"))
shot("editor-mobile", True)
ev("document.getElementById('export-link').click()"); time.sleep(0.5)
shot("export-mobile", True)
check("no horizontal overflow on mobile", ev("document.documentElement.scrollWidth<=window.innerWidth"))
chrome.terminate(); srv.shutdown()
print("FAILED: " + ", ".join(fails) if fails else "ALL PASSED")
sys.exit(1 if fails else 0)
