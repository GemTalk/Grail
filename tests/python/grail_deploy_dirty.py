# Fixture for the deploy-audit test: module globals holding session-bound
# resources that a deploy commit must NOT sweep into the repository.
import socket
import threading

clean_value = 42
clean_list = [1, 2, 3]

# Session-bound: an open socket and a lock (Semaphore-backed).
sock = socket.socket()
lock = threading.Lock()
