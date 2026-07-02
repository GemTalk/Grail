"""Error fixture: a @smalltalk forwarder must have a fixed positional
signature.  This one uses a default argument (which Grail compiles to the
varargs form), so loading the module must fail with a clear error."""

from grail import smalltalk


class Bad:
    @smalltalk
    def oops(self, x=1): ...
