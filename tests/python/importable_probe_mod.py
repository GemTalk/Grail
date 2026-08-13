"""A tiny module used by tests/python/sys_path_import.py.

It exists to be imported by BARE NAME after its directory is added to sys.path,
which only works if the import machinery consults sys.path.  Grail's resolver did
not, so this file is the fixture's subject rather than a test of its own.
"""

noise = more_noise = a = bc = None
blech = None
_bluch = None
