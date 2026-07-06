# GRAIL minimal email.policy.
#
# CPython's policy.py layers EmailPolicy (with headerregistry-backed
# structured headers) over _policybase.  Grail vendors _policybase
# unchanged and exposes only the Compat32 surface — enough for the
# email.mime.* constructors (``policy=policy.compat32'') and Django's
# mail module to import.  EmailPolicy/default are deliberately absent;
# code that asks for them should fail loudly at import time rather
# than mis-parse headers at runtime.

from email._policybase import Compat32, Policy, compat32  # noqa: F401
