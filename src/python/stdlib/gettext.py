# GRAIL minimal gettext stub.
#
# No .mo catalogs ship with Grail (translations were stripped from the
# vendored packages), so every lookup falls through to the message
# itself — the behaviour of CPython's NullTranslations.  Django only
# touches this module when USE_I18N is True; click imports it for
# help-text translation and is satisfied by the null path.

import builtins as _builtins


class NullTranslations:
    def __init__(self, fp=None):
        self._info = {}
        self._fallback = None

    def add_fallback(self, fallback):
        if self._fallback:
            self._fallback.add_fallback(fallback)
        else:
            self._fallback = fallback

    def gettext(self, message):
        if self._fallback:
            return self._fallback.gettext(message)
        return message

    def ngettext(self, msgid1, msgid2, n):
        if self._fallback:
            return self._fallback.ngettext(msgid1, msgid2, n)
        return msgid1 if n == 1 else msgid2

    def pgettext(self, context, message):
        if self._fallback:
            return self._fallback.pgettext(context, message)
        return message

    def npgettext(self, context, msgid1, msgid2, n):
        if self._fallback:
            return self._fallback.npgettext(context, msgid1, msgid2, n)
        return msgid1 if n == 1 else msgid2

    def info(self):
        return self._info

    def charset(self):
        return None

    def install(self, names=None):
        _builtins._ = self.gettext


class GNUTranslations(NullTranslations):
    pass


def find(domain, localedir=None, languages=None, all=False):
    return [] if all else None


def translation(domain, localedir=None, languages=None,
                class_=None, fallback=False):
    # No catalogs exist; a NullTranslations always satisfies fallback
    # semantics, and raising here (CPython raises FileNotFoundError
    # when fallback=False) would break importers that expect a
    # best-effort translator.
    return NullTranslations()


def install(domain, localedir=None, names=None):
    translation(domain, localedir, fallback=True).install(names)


_default = NullTranslations()


def gettext(message):
    return _default.gettext(message)


def ngettext(msgid1, msgid2, n):
    return _default.ngettext(msgid1, msgid2, n)


def pgettext(context, message):
    return _default.pgettext(context, message)


def npgettext(context, msgid1, msgid2, n):
    return _default.npgettext(context, msgid1, msgid2, n)


def dgettext(domain, message):
    return gettext(message)


def dngettext(domain, msgid1, msgid2, n):
    return ngettext(msgid1, msgid2, n)


def dpgettext(domain, context, message):
    return pgettext(context, message)


def dnpgettext(domain, context, msgid1, msgid2, n):
    return npgettext(context, msgid1, msgid2, n)


def textdomain(domain=None):
    return "messages"


def bindtextdomain(domain, localedir=None):
    return localedir
