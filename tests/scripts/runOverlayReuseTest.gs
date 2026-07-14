! file tests/scripts/runOverlayReuseTest.gs
!
! Flag-ON regression for the canonical-class SESSION-LOCAL ATTRIBUTE OVERLAY
! (docs/Persistent_Modules_and_Classes.md par.7).  The overlay only carries
! values when ``importlib ___canonicalClassesEnabled___'' is on, so the main
! SUnit suite (which runs flag OFF) never exercises it.  This script turns the
! flag ON and runs the two test classes that cover the overlay read/write and
! the descriptor binding through it:
!
!   AttributeInheritanceTestCase  -- class-attr MRO reads/writes routed through
!       the overlay; its setUp re-imports the fixture every test, so a stale
!       overlay from the previous test would leak in WITHOUT the per-class
!       ___resetClassAttrOverlay___ that ClassDefAst now emits outside the
!       canonical build guard.
!   ClassFunctionBindingTestCase  -- a function stored on a class through the
!       overlay must bind ``self'' when read via an instance (Object.gs R2 read
!       binds via MethodBinding, not ___descriptorGet___ which drops self).
!
! Both classes pass flag OFF trivially (overlay unused); this asserts they also
! pass flag ON.  Emits one machine-readable GRAIL_OVERLAY_RESULT line and exits
! 0 iff every test passed.  Never commits.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1
login
run
| dir |
(dir := System gemEnvironmentVariable: 'GRAIL_DIR') ifNil:[
  System gemEnvironmentVariable: 'GRAIL_DIR' put: (dir := GsFile serverCurrentDirectory)
].
importlib grailDir: dir.
importlib ___canonicalClassesEnabled___: true
%
level 1
run
| out suite result flatten |
out := GsFile stdout.
"Flatten each class's suite to leaf TestCase instances (X suite may nest)."
suite := TestSuite new.
flatten := nil.
flatten := [:node |
  (node isKindOf: TestSuite)
    ifTrue: [node tests do: [:c | flatten value: c]]
    ifFalse: [suite addTest: node]].
flatten value: AttributeInheritanceTestCase suite.
flatten value: ClassFunctionBindingTestCase suite.
result := suite run.
out nextPutAll: 'GRAIL_OVERLAY_RESULT|flagOn|'; nextPutAll: result printString; cr.
result hasPassed
  ifTrue: [ExitClientError signal: 'overlay regression passed' status: 0]
  ifFalse: [
    out nextPutAll: 'OVERLAY failures:'; cr.
    result failures do: [:each | out nextPutAll: '    '; nextPutAll: each printString; cr].
    out nextPutAll: 'OVERLAY errors:'; cr.
    result errors do: [:each | out nextPutAll: '    '; nextPutAll: each printString; cr].
    ExitClientError signal: 'overlay regression failed' status: 1].
%
logout
! Reachable only if the run aborted before its ExitClientError status report.
exit 1
