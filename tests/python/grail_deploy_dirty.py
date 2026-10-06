# Fixture for the deploy-audit test: module globals holding session-bound
# resources that a deploy commit must NOT sweep into the repository.
import socket
import threading

clean_value = 42
clean_list = [1, 2, 3]

# Session-bound: an open socket, a generator (its process waits on a
# Semaphore, which GemStone never commits), and a socket held two levels
# down, as an attribute of an object in a dict.
sock = socket.socket()
gen = (x for x in range(3))


class Conn:
    def __init__(self):
        self.name = "db"
        self._sock = socket.socket()


conns = {"primary": Conn()}

# NOT session-bound: a lock commits and works in a later session (measured,
# docs/App_Namespaces_Design.md §6.0) -- its Semaphore sits in storage the
# commit never writes.
lock = threading.Lock()
