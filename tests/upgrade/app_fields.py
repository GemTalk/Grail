"""A module of the app's own, imported by upgrade_app, for
tests/scripts/run_grail_upgrade_test.sh: a dataclass with
field(default_factory=...), then email.message.

GemTalk/Grail#1884, as GemDB 1.9.0's ``conflicts'' module met it.  The name
sorts BEFORE ``dataclasses'', so an install's redeploy (scripts/redeployModules.gs)
rebuilds this module first, and dataclasses with it, and calls field().  From a
Grail whose email.message.EmailMessage had other bases (release=c8cbc92), the
import of email.message is then refused, the redeploy aborts and rebuilds this
module again with the refusal lifted -- rebuilding dataclasses a second time in
the same session, into the same module instance.  field()'s defaults were
memoised from the first build, so ``default'' was the first MISSING and every
field(default_factory=...) after it -- here, and werkzeug.routing's -- raised
``cannot specify both default and default_factory''.
"""
import dataclasses


@dataclasses.dataclass
class Note:
    tags: list = dataclasses.field(default_factory=list)


import email.message  # noqa: E402 -- after the field() call, deliberately


def note_tags():
    return Note().tags
