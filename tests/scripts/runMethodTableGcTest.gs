! file tests/scripts/runMethodTableGcTest.gs
!
! GrailMethodTableGcTestCase in a FRESH gem, for
! tests/scripts/run_exec_namespace_test.sh.  Each of its tests asserts that
! a collection reclaimed a method a GrailMethodTable no longer holds, and in a
! shard's session -- near its temporary-memory cap -- the VM did not reclaim
! one, so the class answers isAbstract and stays out of the sharded suite.
! Emits
!   GRAIL_GC_TESTS|<n> run, <n> passed, <n> failed, <n> errors
! and one [FAIL] / [ERROR] line per defect.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1
iferr_clear
login
run
| cls result out |
cls := GrailMethodTableGcTestCase.
result := TestResult new.
(cls testSelectors asSortedCollection: [:a :b | a <= b]) do: [:sel |
  (cls selector: sel) run: result].
out := GsFile stdout.
out nextPutAll: 'GRAIL_GC_TESTS|'; nextPutAll: result printString; lf.
result failures do: [:each | out nextPutAll: '  [FAIL] '; nextPutAll: each printString; lf].
result errors do: [:each | out nextPutAll: '  [ERROR] '; nextPutAll: each printString; lf].
out flush.
true
%
logout
exit 0
