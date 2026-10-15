# Grail requests shim — HTTPAdapter.
#
# Upstream HTTPAdapter owns the urllib3 connection pool; Grail's
# transport opens one http.client connection per send (no pooling),
# so the adapter just records its configuration.  twilio constructs
# HTTPAdapter(max_retries=...) / HTTPAdapter(pool_maxsize=...) and
# mounts it on the session; max_retries is honored by Session.send
# for connection-level failures.

DEFAULT_POOLSIZE = 10
DEFAULT_RETRIES = 0


class HTTPAdapter:
    def __init__(self, pool_connections=DEFAULT_POOLSIZE,
                 pool_maxsize=DEFAULT_POOLSIZE,
                 max_retries=DEFAULT_RETRIES, pool_block=False):
        self.pool_connections = pool_connections
        self.pool_maxsize = pool_maxsize
        if max_retries is None:
            max_retries = DEFAULT_RETRIES
        self.max_retries = max_retries
        self.pool_block = pool_block

    def close(self):
        pass
