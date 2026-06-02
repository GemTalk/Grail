output pushnew runIssue2Test.out
! file scripts/runIssue2Test.gs
!
! Regression for commit 4a46289 ("Box SrePattern/SreMatch C pointers in
! CPointer to survive commits").
!
! SrePattern/SreMatch wrap a raw C PatternObject*/MatchObject*.  Before the
! fix the address was stored as a SmallInteger in a persistent slot, so a
! pattern committed into a cache (re / jinja2) and faulted into a *fresh
! session* came back holding a stale address and dereferencing it in C took
! a SEGV.  The fix boxes the address in a CPointer (non-persistent storage):
! a faulted-in wrapper has a NULL CPointer, and the cPtrAddress guard turns
! the dereference into a clean, catchable Smalltalk error.
!
! This cannot be an SUnit test: SUnit runs in a single session and must not
! commit.  The bug only exists across a commit + session boundary, so this
! script models it directly -- session 1 compiles + commits a pattern and a
! match under `UserGlobals at: #'Grail_issue_2'`; a logout/login forces a
! re-fault (which NULLs the CPointer exactly as a new process would); session
! 2 asserts every C-pointer call signals instead of crashing, then removes the
! key and commits to leave the repository clean.
!
! A regression (stale integer instead of CPointer) would SEGV the gem here,
! crashing topaz with a non-zero status -- so even the harness failing is a
! faithful signal.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! Session 1 -- compile, verify live, commit into UserGlobals
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
| sre pat match out |
"Report through a session-local GsFile stdout.  This script commits (it stores
and later removes #Grail_issue_2), so it must NOT assign the global Transcript:
a GsFile committed as Transcript is exactly the cross-session poison that breaks
later sessions (dead OS handle + no show:).  A local keeps output on stdout
without ever touching the committed global."
out := GsFile stdout.
CPythonShim current.
sre := _sre @env1:instance.
"Compile 'abc' (no capture groups) -- same bytecode SreTestCase uses."
pat := sre @env1:compile: 'abc'
  _: 32
  _: (OrderedCollection withAll: #(14 12 3 3 3 3 3 97 98 99 0 0 0 16 97 16 98 16 99 1))
  _: 0
  _: KeyValueDictionary new
  _: (Array with: nil).
(pat isKindOf: SrePattern) ifFalse: [^ self error: 'setup: compile did not return an SrePattern'].
(pat @env0:cPointer isNull) ifTrue: [^ self error: 'setup: freshly compiled pattern has a NULL cPointer'].
match := pat @env1:search: 'xyzabc'.
(match isKindOf: SreMatch) ifFalse: [^ self error: 'setup: live search did not return an SreMatch'].
(match @env1:group: 0) = 'abc' ifFalse: [^ self error: 'setup: live match.group(0) was not ''abc'''].

"Commit both wrappers; both were boxed by the fix and both must guard."
UserGlobals at: #'Grail_issue_2' put: (Array with: pat with: match).
System commitTransaction.
out cr; nextPutAll: 'session1: committed live pattern + match under #Grail_issue_2'; cr.
%
logout

! ===========================================================================
! Session 2 -- fault the committed wrappers (NULL CPointer), assert guards,
!              then clean up.
! ===========================================================================
login
run
| arr pat match failures check raises out |
"Session-local stdout -- never the global Transcript (this block commits)."
out := GsFile stdout.
CPythonShim current.
failures := OrderedCollection new.
check := [:label :ok |
  ok
    ifTrue: [out cr; nextPutAll: '  PASS  ', label]
    ifFalse: [failures add: label. out cr; nextPutAll: '  FAIL  ', label]].
raises := [:label :blk |
  [blk value.
   failures add: label, ' (no error raised)'.
   out cr; nextPutAll: '  FAIL  ', label, ' -- expected an error, none raised']
    on: Error
    do: [:ex |
      out cr; nextPutAll: '  PASS  ', label, ' -> ', ex messageText]].

"Run the assertions inside ensure: so the committed key is always removed --
even if an unexpected error (not one of the expected guard signals) unwinds
the script -- leaving the repository pristine in every case."
[
  arr := UserGlobals at: #'Grail_issue_2'.
  pat := arr at: 1.
  match := arr at: 2.

  "The wrappers survived the commit as the same classes..."
  check value: 'pattern is still an SrePattern' value: (pat isKindOf: SrePattern).
  check value: 'match is still an SreMatch'     value: (match isKindOf: SreMatch).

  "...but their C pointers faulted in NULL (the heart of the bug)."
  check value: 'pattern cPointer is non-nil'      value: (pat @env0:cPointer notNil).
  check value: 'pattern cPointer faulted in NULL' value: (pat @env0:cPointer isNull).
  check value: 'match cPointer faulted in NULL'   value: (match @env0:cPointer isNull).

  "Every C-pointer call must signal cleanly rather than SEGV on the dead address."
  raises value: 'SrePattern>>search: signals on stale pointer'  value: [pat @env1:search: 'xyzabc'].
  raises value: 'SrePattern>>match: signals on stale pointer'   value: [pat @env1:match: 'abcxyz'].
  raises value: 'SrePattern>>findall: signals on stale pointer' value: [pat @env1:findall: 'abc'].
  raises value: 'SreMatch>>group: signals on stale pointer'     value: [match @env1:group: 0].
  raises value: 'SreMatch>>span: signals on stale pointer'      value: [match @env1:span: 0].
] ensure: [
  UserGlobals removeKey: #'Grail_issue_2' ifAbsent: [].
  System commitTransaction
].

out cr; cr.
failures isEmpty
  ifTrue: [
    out nextPutAll: 'Grail_issue_2 regression: all checks passed.'; cr.
    ExitClientError signal: 'Issue 2 regression passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'Grail_issue_2 regression FAILED:'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
    ExitClientError signal: 'Issue 2 regression failed!' status: 1].
%
logout
exit
