! file tests/scripts/runContextVarsSessionRpc.gs
!
! contextvars' current Context must be per-SESSION state, not committed state.
! Two RPC sessions in one topaz process, interleaved deterministically with
! ``set session:'' (same mechanism as runGemdbConflictRpc.gs; run via
! run_contextvars_session_test.sh, which substitutes @@GRAILDIR@@).
!
! The bug (brain-freeze docs/grail-contextvars-session-state.md): the top
! Context was a module global of the committed contextvars module, so every gem
! shared ONE Context and ONE _data dict.  A ContextVar.set in two sessions was a
! Write-Write on that dict, and decimal -- whose getcontext() lives in a
! ContextVar and whose every rounding op mutates Context.flags -- made ordinary
! arithmetic in two sessions a commit conflict.
!
! PHASE 1 -- a plain ContextVar, held in a committed place (gemdb.root) so both
! sessions reach the SAME var: each sets its own value with the transactions
! overlapping, both commit, neither sees the other's value, and a fresh session
! sees none.
! PHASE 2 -- the bug as it was met: overlapping Decimal arithmetic that sets
! Inexact and Rounded; both commit.
! PHASE 3 -- a fresh session starts with clean decimal flags.
iferr 1 where
iferr 2 exit 1

! ---- Session 1: deploy, commit a shared ContextVar, set it (uncommitted) ----
login
run
| evalPython |
importlib grailDir: '@@GRAILDIR@@'.
evalPython := [:src |
  | moduleScope scope module |
  moduleScope := SymbolDictionary new.
  scope := System myUserProfile symbolList copy.
  scope insertObject: moduleScope at: 1.
  module := ModuleAst parseSource: src.
  module useTempsForBlock: false.
  module ensureModuleScope: moduleScope.
  module evaluateWithScope: scope].
"run_contextvars_session_test.sh has already deployed and exercised these
from a linked gem, so this warm-binds and the commit is a no-op; it stays so
the script is self-sufficient.  Exercising before the interleave matters: the
first call of a module-level function after an install writes that module
instance once (any module -- copy, textwrap -- not just these), a separate
transient gone as soon as one session commits it, and this test is about the
steady state."
evalPython value: '
import gemdb, contextvars, decimal
contextvars.ContextVar("warmup").set(0)
decimal.Decimal(1) / decimal.Decimal(7)
'.
System commitTransaction ifFalse: [^ self error: 'S1: deploy commit failed'].
evalPython value: '
import gemdb, contextvars
gemdb.root["cv_cc_var"] = contextvars.ContextVar("cv_cc")
gemdb.commit()
'.
evalPython value: '
import gemdb
gemdb.root["cv_cc_var"].set("one")
'.
GsFile stdout nextPutAll: 'S1: var set to one (uncommitted)'; cr.
%

! ---- Session 2: set the same var, commit first ----------------------------
login
run
| evalPython ok |
importlib grailDir: '@@GRAILDIR@@'.
evalPython := [:src |
  | moduleScope scope module |
  moduleScope := SymbolDictionary new.
  scope := System myUserProfile symbolList copy.
  scope insertObject: moduleScope at: 1.
  module := ModuleAst parseSource: src.
  module useTempsForBlock: false.
  module ensureModuleScope: moduleScope.
  module evaluateWithScope: scope].
evalPython value: '
import gemdb
gemdb.root["cv_cc_var"].set("two")
'.
ok := System commitTransaction.
GsFile stdout nextPutAll: 'S2: var set to two, commit -> '; print: ok; cr.
ok ifFalse: [
  GsFile stdout nextPutAll: 'contextvars session test FAILED: S2 commit conflicted'; cr.
  ExitClientError signal: 'contextvars session test failed!' status: 1].
%

! ---- Session 1: must commit cleanly and still see its own value -----------
set session: 1
run
| evalPython ok r failures check |
evalPython := [:src |
  | moduleScope scope module |
  moduleScope := SymbolDictionary new.
  scope := System myUserProfile symbolList copy.
  scope insertObject: moduleScope at: 1.
  module := ModuleAst parseSource: src.
  module useTempsForBlock: false.
  module ensureModuleScope: moduleScope.
  module evaluateWithScope: scope].
failures := OrderedCollection new.
check := [:label :bool |
  bool
    ifTrue: [GsFile stdout nextPutAll: '  PASS  ', label; cr]
    ifFalse: [failures add: label. GsFile stdout nextPutAll: '  FAIL  ', label; cr]].
ok := System commitTransaction.
check value: 'two sessions setting one ContextVar both commit' value: ok.
ok ifFalse: [
  GsFile stdout nextPutAll: System transactionConflicts printString; cr.
  System abortTransaction].
r := evalPython value: '
import gemdb
gemdb.root["cv_cc_var"].get("unset")
'.
check value: 'S1 sees its own value, not S2''s' value: r = 'one'.

"PHASE 2 setup: rounding arithmetic, left pending across the interleave."
evalPython value: '
from decimal import Decimal
Decimal(1) / Decimal(3)
'.
failures isEmpty ifFalse: [
  GsFile stdout nextPutAll: 'contextvars session test FAILED (phase 1)'; cr.
  ExitClientError signal: 'contextvars session test failed!' status: 1].
%

! ---- Session 2: sees its own value; same Decimal arithmetic, commit first -
set session: 2
run
| evalPython ok r |
evalPython := [:src |
  | moduleScope scope module |
  moduleScope := SymbolDictionary new.
  scope := System myUserProfile symbolList copy.
  scope insertObject: moduleScope at: 1.
  module := ModuleAst parseSource: src.
  module useTempsForBlock: false.
  module ensureModuleScope: moduleScope.
  module evaluateWithScope: scope].
r := evalPython value: '
import gemdb
gemdb.root["cv_cc_var"].get("unset")
'.
GsFile stdout nextPutAll: 'S2: var reads '; print: r; cr.
r = 'two' ifFalse: [
  GsFile stdout nextPutAll: 'contextvars session test FAILED: S2 saw S1''s value'; cr.
  ExitClientError signal: 'contextvars session test failed!' status: 1].
evalPython value: '
from decimal import Decimal
Decimal(2) / Decimal(3)
'.
ok := System commitTransaction.
GsFile stdout nextPutAll: 'S2: Decimal arithmetic, commit -> '; print: ok; cr.
ok ifFalse: [
  GsFile stdout nextPutAll: 'contextvars session test FAILED: S2 decimal commit conflicted'; cr.
  ExitClientError signal: 'contextvars session test failed!' status: 1].
%

! ---- Session 1: the Decimal commit must not conflict ----------------------
set session: 1
run
| evalPython ok r |
evalPython := [:src |
  | moduleScope scope module |
  moduleScope := SymbolDictionary new.
  scope := System myUserProfile symbolList copy.
  scope insertObject: moduleScope at: 1.
  module := ModuleAst parseSource: src.
  module useTempsForBlock: false.
  module ensureModuleScope: moduleScope.
  module evaluateWithScope: scope].
r := evalPython value: '
import decimal
c = decimal.getcontext()
bool(c.flags[decimal.Inexact]) and bool(c.flags[decimal.Rounded])
'.
GsFile stdout nextPutAll: '  ', (r == true ifTrue: ['PASS'] ifFalse: ['FAIL']),
  '  the arithmetic set Inexact and Rounded'; cr.
ok := System commitTransaction.
GsFile stdout nextPutAll: '  ', (ok ifTrue: ['PASS'] ifFalse: ['FAIL']),
  '  two sessions doing Decimal arithmetic both commit'; cr.
ok ifFalse: [
  GsFile stdout nextPutAll: System transactionConflicts printString; cr.
  System abortTransaction].
(ok and: [r == true]) ifFalse: [
  GsFile stdout nextPutAll: 'contextvars session test FAILED (phase 2)'; cr.
  ExitClientError signal: 'contextvars session test failed!' status: 1].
%

! ---- Fresh session: nothing was committed; clean up -----------------------
login
run
| evalPython r1 r2 ok |
importlib grailDir: '@@GRAILDIR@@'.
evalPython := [:src |
  | moduleScope scope module |
  moduleScope := SymbolDictionary new.
  scope := System myUserProfile symbolList copy.
  scope insertObject: moduleScope at: 1.
  module := ModuleAst parseSource: src.
  module useTempsForBlock: false.
  module ensureModuleScope: moduleScope.
  module evaluateWithScope: scope].
[
  r1 := evalPython value: '
import gemdb
gemdb.root["cv_cc_var"].get("unset")
'.
  r2 := evalPython value: '
import decimal
c = decimal.getcontext()
not any(c.flags.values())
'.
] ensure: [
  evalPython value: '
import gemdb
gemdb.root.pop("cv_cc_var", None)
'.
  System commit
].
ok := true.
GsFile stdout nextPutAll: '  ', (r1 = 'unset' ifTrue: ['PASS'] ifFalse: [ok := false. 'FAIL']),
  '  a fresh session sees no ContextVar value from earlier sessions'; cr.
GsFile stdout nextPutAll: '  ', (r2 == true ifTrue: ['PASS'] ifFalse: [ok := false. 'FAIL']),
  '  a fresh session starts with clean decimal flags'; cr.
ok
  ifTrue: [
    GsFile stdout nextPutAll: 'contextvars session test: all checks passed.'; cr.
    ExitClientError signal: 'contextvars session test passed!' status: 0]
  ifFalse: [
    GsFile stdout nextPutAll: 'contextvars session test FAILED (fresh session)'; cr.
    ExitClientError signal: 'contextvars session test failed!' status: 1].
%
logout
! Reachable only when the run aborted before its status report.
exit 1
