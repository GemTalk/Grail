# GRAIL minimal logging.config stub.
#
# Django's setup path runs settings.LOGGING_CONFIG (default
# "logging.config.dictConfig") over DEFAULT_LOGGING.  Grail's logging
# package is itself a thin shim, so configuration is accepted and
# recorded but handler/formatter wiring is not performed — records go
# wherever the base logging shim sends them.

_last_dict_config = None


def dictConfig(config):
    global _last_dict_config
    if not isinstance(config, dict):
        raise ValueError("dictConfig expects a dict")
    version = config.get("version", 1)
    if version != 1:
        raise ValueError("Unsupported logging config version: %r" % (version,))
    _last_dict_config = config


def fileConfig(fname, defaults=None, disable_existing_loggers=True,
               encoding=None):
    raise NotImplementedError("logging.config.fileConfig is not supported in Grail")


def listen(port=None, verify=None):
    raise NotImplementedError("logging.config.listen is not supported in Grail")


def stopListening():
    pass
