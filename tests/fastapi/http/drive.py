"""Serve tests/fastapi/http/app.py over real HTTP with grail_asgi -- under Grail
or under CPython, the same server code either way -- drive it with
http.client, and print what the client saw (docs/Support_FastAPI.md, Phase 5).

    python3 tests/fastapi/http/drive.py grail   PORT VENV > out.grail 2> lat.grail
    python3 tests/fastapi/http/drive.py cpython PORT VENV > out.cpy   2> lat.cpy
    diff out.cpy out.grail

VENV is a virtualenv holding fastapi and the abi3 pydantic_core
(scripts/pydantic/build_pydantic_core_abi3.sh).  Latency per request on one
keep-alive connection goes to stderr.  Under Grail, set GRAIL_TEMPOBJ_KB for a
run that compiles (the first after install.sh)."""
import http.client, json, os, subprocess, sys, time, socket
HERE = os.path.dirname(os.path.abspath(__file__))
GRAIL = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
which, port, venv = sys.argv[1], int(sys.argv[2]), os.path.abspath(sys.argv[3])
env = dict(os.environ)
env.pop('PYTHONPATH', None)
env['VIRTUAL_ENV'] = venv
if which == 'grail':
    cmd = [GRAIL + '/grail', HERE + '/serve.py', str(port)]
else:
    cmd = [os.path.join(venv, 'bin', 'python'), HERE + '/serve.py', str(port)]
t0 = time.time()
proc = subprocess.Popen(cmd, env=env, cwd=GRAIL, start_new_session=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
while True:
    try:
        socket.create_connection(('127.0.0.1', port), timeout=1).close(); break
    except OSError:
        if proc.poll() is not None:
            print("server died:", proc.stdout.read()[-3000:]); sys.exit(1)
        if time.time() - t0 > 900:
            print("server never came up"); os.killpg(proc.pid, 9); sys.exit(1)
        time.sleep(0.5)
startup = time.time() - t0

def req(method, path, body=None, headers=None, conn=None):
    c = conn or http.client.HTTPConnection('127.0.0.1', port, timeout=60)
    c.request(method, path, body=body, headers=headers or {})
    r = c.getresponse()
    data = r.read()
    hdrs = {k.lower(): v for k, v in r.getheaders() if k.lower() in ('content-type', 'content-length', 'transfer-encoding')}
    if conn is None:
        c.close()
    return r.status, hdrs, data

cases = [
    ('GET', '/', None, None), ('GET', '/sync', None, None), ('GET', '/dep?q=7', None, None),
    ('GET', '/dep', None, None), ('GET', '/dep?q=x', None, None),
    ('POST', '/items', json.dumps({'name': 'x', 'price': '1.5'}), {'content-type': 'application/json'}),
    ('POST', '/items', json.dumps({'name': 'x'}), {'content-type': 'application/json'}),
    ('POST', '/items', 'not json', {'content-type': 'application/json'}),
    ('GET', '/boom', None, None), ('GET', '/crash', None, None), ('GET', '/nope', None, None),
    ('PUT', '/', None, None), ('GET', '/text', None, None), ('GET', '/stream', None, None),
    ('GET', '/state', None, None), ('GET', '/bg', None, None), ('GET', '/events', None, None),
    ('GET', '/openapi.json', None, None), ('GET', '/docs', None, None),
]
for m, p, b, h in cases:
    try:
        st, hd, data = req(m, p, b, h)
        if p == '/openapi.json':
            data = ('sha-ish:%d paths=%s' % (len(data), sorted(json.loads(data)['paths']))).encode()
        elif p == '/docs':
            data = ('len=%d' % len(data)).encode()
        print(m, p, st, hd, data[:300])
    except Exception as e:
        print(m, p, 'EXC', type(e).__name__, e)
# keep-alive: several requests on one connection
c = http.client.HTTPConnection('127.0.0.1', port, timeout=60)
print('keepalive', [req('GET', '/dep?q=%d' % i, conn=c)[2] for i in range(3)])
c.close()
# latency
for path in ('/', '/dep?q=1', '/sync'):
    c = http.client.HTTPConnection('127.0.0.1', port, timeout=60)
    req('GET', path, conn=c)
    n = 30
    t = time.time()
    for i in range(n):
        req('GET', path, conn=c)
    ms = (time.time() - t) / n * 1000
    c.close()
    print('latency', path, round(ms, 1), 'ms', file=sys.stderr)
print('startup', round(startup, 1), 's', file=sys.stderr)
import signal
# The whole process group: under Grail, `grail` is a wrapper and topaz its
# child -- and topaz ignores SIGTERM, so a SIGKILL always follows.  A topaz left
# behind keeps its session, and the stone then stalls every later GC vote.
for sig in (signal.SIGTERM, signal.SIGKILL):
    try:
        os.killpg(proc.pid, sig)
    except Exception:
        pass
    try:
        proc.wait(5)
    except Exception:
        pass
