"""``importlib.resources.readers`` -- the reader for a module on the
filesystem, which is the only kind Grail loads."""

import pathlib

from . import abc


class FileReader(abc.TraversableResources):
    def __init__(self, loader):
        self.path = pathlib.Path(loader.path).parent

    def resource_path(self, resource):
        """The file system path, so that ``resources.path()`` need not make a
        temporary copy."""
        return str(self.path.joinpath(resource))

    def files(self):
        return self.path
