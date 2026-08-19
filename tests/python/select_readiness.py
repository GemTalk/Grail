"""select() over the scheduler's readiness events (see select.py)."""
import select
import socket
import time

R = {}

# --- a listener with nobody connecting: must TIME OUT, not report ready ------
srv = socket.socket()
srv.bind(('127.0.0.1', 0))
srv.listen(1)
port = srv.getsockname()[1]

t0 = time.monotonic()
r, w, x = select.select([srv], [], [], 0.3)
elapsed = time.monotonic() - t0
R['idle_listener_not_ready'] = (r == [] and w == [] and x == [])
# It must actually WAIT rather than spin-and-return, and not overshoot wildly.
R['idle_listener_waited'] = (elapsed >= 0.2)

# --- timeout=0 is a poll: returns at once ------------------------------------
t0 = time.monotonic()
r, w, x = select.select([srv], [], [], 0)
R['poll_is_immediate'] = (time.monotonic() - t0) < 0.15 and r == []

# --- a pending connection makes the listener readable ------------------------
cli = socket.socket()
cli.connect(('127.0.0.1', port))
r, w, x = select.select([srv], [], [], 2.0)
R['pending_conn_ready'] = (r == [srv])

conn, _addr = srv.accept()

# --- data sent by the peer makes the connection readable ---------------------
cli.sendall(b'ping')
r, w, x = select.select([conn], [], [], 2.0)
R['data_makes_readable'] = (r == [conn])
R['data_roundtrip'] = (conn.recv(4) == b'ping')

# --- with nothing sent, the same socket is NOT readable ----------------------
r, w, x = select.select([conn], [], [], 0.2)
R['quiet_socket_not_readable'] = (r == [])

# --- writability is now actually TESTED, not assumed -------------------------
r, w, x = select.select([], [conn], [], 1.0)
R['writable_reported'] = (w == [conn])

# --- both lists at once, and the original objects come back ------------------
cli.sendall(b'again')
r, w, x = select.select([conn, srv], [conn], [], 2.0)
R['mixed_lists'] = (r == [conn] and w == [conn])
conn.recv(5)

# --- an object wrapping a socket resolves through .socket --------------------
class Wrapper:
    def __init__(self, s):
        self.socket = s

cli.sendall(b'z')
wrapped = Wrapper(conn)
r, w, x = select.select([wrapped], [], [], 2.0)
R['wrapper_resolves'] = (r == [wrapped])
conn.recv(1)

# --- a raw fd is refused with an explanation, not silently ignored -----------
try:
    select.select([3], [], [], 0)
    R['raw_fd_refused'] = False
except TypeError:
    R['raw_fd_refused'] = True

# --- empty lists with no timeout would hang: refused ------------------------
try:
    select.select([], [], [], None)
    R['empty_forever_refused'] = False
except ValueError:
    R['empty_forever_refused'] = True

R['empty_with_timeout_ok'] = (select.select([], [], [], 0) == ([], [], []))

# --- selectors on top --------------------------------------------------------
import selectors

sel = selectors.DefaultSelector()
sel.register(conn, selectors.EVENT_READ, data='tag')
cli.sendall(b'sel')
events = sel.select(timeout=2.0)
R['selectors_read'] = (len(events) == 1 and events[0][0].data == 'tag'
                       and events[0][0].fileobj is conn)
conn.recv(3)

R['selectors_timeout_empty'] = (sel.select(timeout=0.2) == [])

sel.modify(conn, selectors.EVENT_WRITE)
events = sel.select(timeout=1.0)
R['selectors_write'] = (len(events) == 1
                        and (events[0][1] & selectors.EVENT_WRITE) != 0)
sel.unregister(conn)
R['selectors_unregister'] = (len(sel.get_map()) == 0)
R['selectors_empty_returns_empty'] = (sel.select(timeout=None) == [])
sel.close()

sel2 = selectors.DefaultSelector()
k = sel2.register(conn, selectors.EVENT_READ, data='d')
fo, fd, ev, da = k
R['selectorkey_unpacks'] = (fo is conn and ev == selectors.EVENT_READ and da == 'd')
R['selector_aliases'] = (selectors.PollSelector is selectors.SelectSelector
                         and selectors.BaseSelector is not None)
sel2.close()

conn.close()
cli.close()
srv.close()

# --- the BLOCKING path: ready only AFTER select is already waiting ----------
# Every positive case above is satisfied by the pre-check select makes before
# it waits, so none of them proved the wait itself wakes.  This one does: the
# connection arrives 400ms after select has begun blocking.
import threading

srv2 = socket.socket()
srv2.bind(('127.0.0.1', 0))
srv2.listen(1)
port2 = srv2.getsockname()[1]

late = []


def _connect_later():
    time.sleep(0.4)
    c = socket.socket()
    c.connect(('127.0.0.1', port2))
    late.append(c)


th = threading.Thread(target=_connect_later)
th.start()
t0 = time.monotonic()
r, w, x = select.select([srv2], [], [], 5.0)
dt = time.monotonic() - t0
R['wakes_on_late_connection'] = (r == [srv2])
R['woke_before_timeout'] = (dt < 3.0)
R['waited_for_it'] = (dt >= 0.3)
th.join()
for c in late:
    c.close()
srv2.close()

RESULTS = R
