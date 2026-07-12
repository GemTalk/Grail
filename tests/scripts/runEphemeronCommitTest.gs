output pushnew runEphemeronCommitTest.out
! file tests/scripts/runEphemeronCommitTest.gs
!
! Grail-side regression for the ephemeron + commit interaction. Builds a
! Grail WeakReference, commits the UserGlobals reference graph that holds
! it, re-logs in, and verifies the commit-safe contract.
!
! Why this lives outside the in-session SUnit suite: commit semantics can
! only be observed across a commit + logout + login boundary, and the suite
! must not commit. Session 1 sets up + commits into a
! `Grail_commit_test_weakref` UserGlobals key, session 2 re-logs in and
! verifies, then `ensure:`-removes the key so the repository is left clean
! even if any check fails.
!
! Contract under test:
!   - WeakReference's class identity survives commit;
!   - the holder reference survives (dbTransient persists by identity);
!   - the holder's instVars come back nil (dbTransient does not write them
!     — including the holder.ephemeron slot, so the inner ephemeron is
!     unreachable post-commit);
!   - the public ref reports dead (value nil, isAlive false);
!   - hashCache survives so the ref is still usable as a dict key.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! weakref-commit-safety: Session 1 — commit a live WeakReference
! ===========================================================================
login
run
| dir |
(dir := System gemEnvironmentVariable: 'GRAIL_DIR') ifNil:[
  System gemEnvironmentVariable: 'GRAIL_DIR' put: (dir := GsFile serverCurrentDirectory)
].
importlib grailDir: dir
%
level 0
run
| target ref out |
"Session-local stdout — this script commits, so it must NOT touch the global
Transcript (a GsFile committed as Transcript is the cross-session poison
runIssue2Test.gs guards against)."
out := GsFile stdout.

"Build a real heap-object referent (not an immediate, so the inner
ephemeron's beEphemeron: true actually takes effect) and a WeakReference
to it."
target := 'weakref-commit-target-' , 12345 printString.
ref := WeakReference on: target.

"Sanity-check the pre-commit chain so a real bug here fails this script
rather than poisoning the verify session.

The structure is: WeakReference -> WeakReferenceHolder (dbTransient) ->
WeakReferenceEphemeron (`beEphemeron: true` set on the instance). The
outer WeakReference is a normal persistent object; the holder is
dbTransient but not itself an ephemeron; the inner ephemeron is what
carries the bit and the referent."
(ref value == target) ifFalse: [^ self error: 'setup: ref value != target before commit'].
ref isAlive ifFalse: [^ self error: 'setup: ref reports dead before commit'].
ref isEphemeron ifTrue: [^ self error: 'setup: outer WeakReference must not be an ephemeron'].
(ref instVarAt: 1) isEphemeron ifTrue: [^ self error: 'setup: holder must not be an ephemeron (it merely holds one)'].
((ref instVarAt: 1) instVarAt: 1) isEphemeron
  ifFalse: [^ self error: 'setup: inner ephemeron must have beEphemeron: armed pre-commit'].

"THE REPORTED SCENARIO (ERROR 2407, 'attempt to commit an ephemeron'):
load the full weakref fixture module -- its MODULE GLOBALS hold
WeakReferences, a WeakValueDictionary, a WeakSet and finalizers -- and
then commit.  Module singletons are SESSION-LOCAL (SessionTemps), so
none of that state is reachable from committed roots; before that
change the module instance hung off the committed module class and the
commit tripped over the ephemerons."
importlib
  loadModuleFromPath: (importlib grailDir , '/tests/python/weakref_basic.py')
  name: 'weakref_basic'.

"Commit (ref, target, expectedHash). expectedHash is the in-session hashCache;
session 2 compares it to the post-commit hash to prove the hash survived even
though the holder's instVars get wiped."
UserGlobals at: #'Grail_commit_test_weakref' put:
  (Array with: ref with: target with: ref hash).
System commit.
out cr; nextPutAll: 'session1: committed live WeakReference (with weakref_basic loaded) under #Grail_commit_test_weakref'; cr.
%
logout

! ===========================================================================
! weakref-commit-safety: Session 2 — fault the committed wrapper, verify
!                                    commit-safe semantics, clean up.
! ===========================================================================
login
run
| arr ref target expectedHash holder failures check out |
out := GsFile stdout.
failures := OrderedCollection new.
check := [:label :ok |
  ok
    ifTrue: [out cr; nextPutAll: '  PASS  ', label]
    ifFalse: [failures add: label. out cr; nextPutAll: '  FAIL  ', label]].

"Run the checks inside ensure: so the committed key is always removed —
even if an unexpected error (not one of the recorded check failures)
unwinds — leaving the repository pristine in every case."
[
  arr := UserGlobals at: #'Grail_commit_test_weakref'.
  ref := arr at: 1.
  target := arr at: 2.
  expectedHash := arr at: 3.

  "Class identities survive commit."
  check value: 'ref is still a WeakReference' value: (ref isKindOf: WeakReference).
  check value: 'target string survived commit independently'
    value: target = ('weakref-commit-target-' , 12345 printString).

  "Outer WeakReference is not an ephemeron — committing it never tripped
  beEphemeron:, regardless of whether the kernel errors or silently clears."
  check value: 'outer ref is not an ephemeron' value: ref isEphemeron not.

  "Holder identity survives, but its instVars were not written (dbTransient).
  The holder's slot 1 was the inner ephemeron pre-commit; after commit it
  comes back nil because dbTransient does not write instVars."
  holder := ref instVarAt: 1.
  check value: 'holder reference survived commit' value: holder notNil.
  check value: 'holder is a WeakReferenceHolder'  value: (holder isKindOf: WeakReferenceHolder).
  check value: 'holder.ephemeron was not written (nil)' value: (holder instVarAt: 1) isNil.
  check value: 'holder.callback was not written (nil)' value: (holder instVarAt: 2) isNil.
  check value: 'holder.dead was not written (nil)'     value: (holder instVarAt: 3) isNil.

  "Public ref API reports dead, even though target itself round-tripped fine."
  check value: 'ref value returns nil' value: ref value isNil.
  check value: 'ref isAlive is false'  value: ref isAlive not.
  check value: 'ref isDead is true'    value: ref isDead.

  "hashCache survived: the ref is still usable as a dict key (Python contract
  is that hash stays valid after the referent dies)."
  check value: 'hashCache survived commit' value: ref hash = expectedHash.

  "Module state stayed SESSION-LOCAL: session 1 loaded weakref_basic and
  committed.  Its CLASS persists (module code, like an install), but the
  module carries NO committed singleton slot at all -- the ``instance''
  classInstVar was removed from the module class, so a module-level
  global has nowhere to persist to."
  [ | wbCls |
  wbCls := PythonModules at: #Weakref_basic ifAbsent: [nil].
  check value: 'weakref_basic class was committed (module code persists)'
    value: wbCls notNil.
  check value: 'module class has no committed singleton slot (instance classInstVar removed)'
    value: (wbCls isNil or: [(wbCls class allInstVarNames includes: #instance) not]) ] value.
] ensure: [
  UserGlobals removeKey: #'Grail_commit_test_weakref' ifAbsent: [].
  PythonModules removeKey: #Weakref_basic ifAbsent: [].
  System commit
].

out cr; cr.
failures isEmpty
  ifTrue: [
    out nextPutAll: 'Grail commit-safety regressions: all checks passed.'; cr.
    ExitClientError signal: 'Commit-safety regressions passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'Grail commit-safety regressions FAILED:'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
    ExitClientError signal: 'Commit-safety regressions failed!' status: 1].
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report (e.g. an error escaped SUnit) -- fail loudly instead of exit 0.
exit 1
