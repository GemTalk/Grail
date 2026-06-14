# Fixture for ContextVarsTestCase.  Exercises contextvars.ContextVar
# get/set/reset with and without a default — the protocol the CPython
# shim's PyContextVar_New/_Get/_Set delegate to (numpy's extobj /
# printoptions context vars) and werkzeug.local relies on.

from contextvars import ContextVar

cv = ContextVar("cv", default=10)
got_default = cv.get()              # 10 (no value set -> default)
tok = cv.set(20)
got_after_set = cv.get()            # 20
got_with_arg = cv.get(99)           # 20 (value is set; arg ignored)
cv.reset(tok)
got_after_reset = cv.get()          # 10 (restored to default)

cv2 = ContextVar("cv2")             # no default
no_default_caught = False
try:
    cv2.get()
except LookupError:
    no_default_caught = True
got_with_fallback = cv2.get("fallback")   # "fallback" (no value, no default)
