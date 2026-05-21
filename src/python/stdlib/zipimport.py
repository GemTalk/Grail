# Minimal `zipimport` stub for Grail.  Jinja2's PackageLoader uses
# ``zipimport.zipimporter`` as an isinstance fan-out for loaders
# that come from a zip archive.  Grail's loader is filesystem-only,
# so the isinstance check should always be False.  Empty class is
# enough to satisfy the reference at import time.


class zipimporter:
    pass


class ZipImportError(ImportError):
    pass
