"""Helper for catching_frame_identity.py: a module whose BODY raises, so
importing it inside a ``try`` puts two ``<module>`` frames on the propagation
path -- this one, and the importer's."""


def raising(f):
    raise ValueError("plain raised")


raising(1)
