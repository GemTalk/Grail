# GRAIL minimal email.generator.
#
# The real Generator re-serialises a Message tree (folding headers,
# re-encoding payloads).  Django imports the module at load time but
# only flattens messages when actually sending mail.  This stub does a
# simple headers-then-body write for flat (non-multipart) messages and
# raises for anything it can't render faithfully.


class Generator:
    def __init__(self, outfp, mangle_from_=None, maxheaderlen=None, *,
                 policy=None):
        self._fp = outfp
        self._policy = policy

    def write(self, s):
        self._fp.write(s)

    def flatten(self, msg, unixfrom=False, linesep="\n"):
        if msg.is_multipart():
            raise NotImplementedError(
                "email.generator: multipart flatten is not supported in Grail")
        for k, v in msg.items():
            self._fp.write("%s: %s%s" % (k, v, linesep))
        self._fp.write(linesep)
        payload = msg.get_payload()
        if payload is not None:
            self._fp.write(str(payload))

    def clone(self, fp):
        return self.__class__(fp, policy=self._policy)


class BytesGenerator(Generator):
    def flatten(self, msg, unixfrom=False, linesep="\n"):
        raise NotImplementedError(
            "email.generator.BytesGenerator is not supported in Grail")


class DecodedGenerator(Generator):
    pass
