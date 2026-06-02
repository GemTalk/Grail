! ============================================================================
! sched_repro.gs
!
! Minimal, self-contained reproduction of an apparent GsProcess-scheduling
! difference between methods compiled in environment 0 vs environment 1.
!
! Observation (from a larger project that runs interpreted code in env 1):
!   A forked GsProcess that should run when its parent yields (Processor yield)
!   or blocks (Semaphore wait) is scheduled normally when the parent is
!   executing a method compiled in environment 0, but appears NOT to be
!   scheduled when the parent is executing a method compiled in environment 1
!   -- the parent's `Semaphore>>wait` then deadlocks the scheduler, and even an
!   explicit `Processor yield` fails to run the forked worker.
!
! CONCLUSION (2026-06-01): base GemStone is NOT at fault.  All eight cases below
! return 42 -- a forked worker is scheduled correctly whether the parent is in
! env 0 or env 1, and whether it hands off via `Processor yield` or
! `Semaphore>>wait`.  The real cause in the larger project turned out to be
! unrelated to scheduling: a first-class bound-method object passed as the
! forked block's *callable target* (and invoked via the interpreter's call
! protocol) did not run, whereas a plain closure did.  This file is retained as
! evidence that cross-environment process scheduling works as expected.
!
! This file has NO dependency on the project or on SUnit -- it uses only base
! GemStone: GsProcess (fork), Semaphore, Processor, instVar access, and the
! Topaz multi-environment method compiler (`set compile_env:` + `@envN:` sends).
!
! A 2x2x2 matrix is exercised:
!     parent env (0 | 1)  x  worker env (0 | 1)  x  handoff (yield | semaphore)
!
! Each test sets `flag := 0`, forks a worker that sets `flag := 42`, hands off
! to it, and returns `flag`.  42 means the worker ran; 0 means it did not; a
! `rtErrSchedulerDeadlocked` on a semaphore test means the worker was never
! scheduled to signal.
!
! To run:   topaz -l -S docs/sched_repro.gs
! Results are appended to /tmp/sched_repro_results.txt as they are produced, so
! partial results survive a scheduler-deadlock abort.
! ============================================================================

login

! ---------------------------------------------------------------- class def
set compile_env: 0
expectvalue /Class
doit
Object subclass: 'SchedRepro'
  instVarNames: #('flag')
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: UserGlobals
  options: #()
%

! ------------------------------------------------ a unit of work per environment
set compile_env: 0
category: 'work'
method: SchedRepro
work0
	"Worker body compiled in environment 0."
	flag := 42.
	^ self
%

set compile_env: 1
category: 'work'
method: SchedRepro
work1
	"Worker body compiled in environment 1 (same effect, different env)."
	flag := 42.
	^ self
%

! ------------------------------------------------------- parent in environment 0
set compile_env: 0

category: 'env0-parent'
method: SchedRepro
p0_w0_yield
	flag := 0.
	[ self work0 ] fork.
	Processor yield.
	^ flag
%

category: 'env0-parent'
method: SchedRepro
p0_w1_yield
	flag := 0.
	[ self @env1:work1 ] fork.
	Processor yield.
	^ flag
%

category: 'env0-parent'
method: SchedRepro
p0_w0_sem
	| sem |
	flag := 0.
	sem := Semaphore new.
	[ self work0. sem signal ] fork.
	sem wait.
	^ flag
%

category: 'env0-parent'
method: SchedRepro
p0_w1_sem
	| sem |
	flag := 0.
	sem := Semaphore new.
	[ self @env1:work1. sem signal ] fork.
	sem wait.
	^ flag
%

! ----- env-0 parent, worker invokes env-1 method REFLECTIVELY via perform -----
! These mirror the cases above, except the worker reaches the env-1 method with
! `perform:env:withArguments:` (Object primitive 2015) instead of a compiled
! `@env1:` send.  This is the path a first-class bound-method object uses.
set compile_env: 0

category: 'env0-parent-perform'
method: SchedRepro
p0_perform_direct
	"Control: invoke the env-1 method reflectively, NOT in a fork."
	flag := 0.
	self perform: #work1 env: 1 withArguments: #().
	^ flag
%

category: 'env0-parent-perform'
method: SchedRepro
p0_perform_yield
	"Forked worker reaches the env-1 method via perform:env:withArguments:,
	hand off via Processor yield."
	flag := 0.
	[ self perform: #work1 env: 1 withArguments: #() ] fork.
	Processor yield.
	^ flag
%

category: 'env0-parent-perform'
method: SchedRepro
p0_perform_sem
	"Forked worker reaches the env-1 method via perform:env:withArguments:,
	hand off via Semaphore signal/wait."
	| sem |
	flag := 0.
	sem := Semaphore new.
	[ self perform: #work1 env: 1 withArguments: #(). sem signal ] fork.
	sem wait.
	^ flag
%

! ------------------------------------------------------- parent in environment 1
! These methods are compiled in env 1; env-0 sends use the @env0: prefix.
set compile_env: 1

category: 'env1-parent'
method: SchedRepro
p1_w0_yield
	flag := 0.
	[ self @env0:work0 ] @env0:fork.
	Processor @env0:yield.
	^ flag
%

category: 'env1-parent'
method: SchedRepro
p1_w1_yield
	flag := 0.
	[ self @env1:work1 ] @env0:fork.
	Processor @env0:yield.
	^ flag
%

category: 'env1-parent'
method: SchedRepro
p1_w0_sem
	| sem |
	flag := 0.
	sem := Semaphore @env0:new.
	[ self @env0:work0. sem @env0:signal ] @env0:fork.
	sem @env0:wait.
	^ flag
%

category: 'env1-parent'
method: SchedRepro
p1_w1_sem
	| sem |
	flag := 0.
	sem := Semaphore @env0:new.
	[ self @env1:work1. sem @env0:signal ] @env0:fork.
	sem @env0:wait.
	^ flag
%

! ----------------------------------------------------------------------- driver
! Run the safe (yield) matrix first, then the semaphore matrix.  Log each
! result the instant it is produced so a deadlock on a later test does not lose
! the earlier results.
set compile_env: 0
run
| log |
log := [:label :block |
	| f val |
	val := [ block value ] on: Error do: [:e | 'ERROR: ', e messageText ].
	f := GsFile openAppendOnServer: '/tmp/sched_repro_results.txt'.
	f nextPutAll: label; nextPutAll: ' => '; nextPutAll: val printString; nextPut: Character lf.
	f close ].

log value: 'p0_w0_yield' value: [ SchedRepro new p0_w0_yield ].
log value: 'p0_w1_yield' value: [ SchedRepro new p0_w1_yield ].
log value: 'p1_w0_yield' value: [ SchedRepro new @env1:p1_w0_yield ].
log value: 'p1_w1_yield' value: [ SchedRepro new @env1:p1_w1_yield ].
log value: 'p0_w0_sem'   value: [ SchedRepro new p0_w0_sem ].
log value: 'p0_w1_sem'   value: [ SchedRepro new p0_w1_sem ].
log value: 'p0_perform_direct' value: [ SchedRepro new p0_perform_direct ].
log value: 'p0_perform_yield'  value: [ SchedRepro new p0_perform_yield ].
log value: 'p0_perform_sem'    value: [ SchedRepro new p0_perform_sem ].
log value: 'p1_w0_sem'   value: [ SchedRepro new @env1:p1_w0_sem ].
log value: 'p1_w1_sem'   value: [ SchedRepro new @env1:p1_w1_sem ].
true
%
logout
exit 0
