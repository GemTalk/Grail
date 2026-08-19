! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SubprocessTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SubprocessTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
SubprocessTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SubprocessTestCase - subprocess over GsHostProcess
!
! The module was a refusal stub ("Grail gems do not spawn child OS processes")
! until the GemStone survey found GsHostProcess sitting unused: fork with argv,
! separate pipes, waitpid, kill.  These pin the surface that now works, and in
! particular the three things the wrapper has to add on top of the kernel --
! PATH lookup, cwd=/env= (which fork: has no option for), and draining both
! pipes while waiting so a chatty child cannot deadlock.
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
SubprocessTestCase removeAllMethods: 0.
SubprocessTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-helpers'
method: SubprocessTestCase
fixtureResults
	"Run tests/python/subprocess_basic.py and answer its RESULTS dict."

	| mod |
	importlib @env1:modules removeKey: #'subprocess_basic' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/subprocess_basic.py')
		name: 'subprocess_basic'.
	^ mod @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Tests - Fixture'
method: SubprocessTestCase
testSubprocessSurface
	"Every check in the fixture, each named so a failure says which one."

	| results |
	results := self fixtureResults.
	#('run_echo' 'run_text' 'returncode' 'check_output' 'stderr_sep'
	  'stderr_merge' 'input_bytes' 'input_text' 'shell' 'cwd' 'env'
	  'getoutput' 'getstatusoutput' 'call' 'check_call_ok'
	  'check_call_raises' 'check_output_raises' 'missing_raises'
	  'timeout_raises' 'poll_running' 'pid_positive' 'kill_negative_rc'
	  'terminate_rc' 'ctx_mgr' 'popen_stdin_obj' 'big_output'
	  'completed_repr' 'preexec_rejected') do: [:key |
		self assert: ((results @env1:__getitem__: key) = true) description: key]
%

category: 'Grail-Tests - Resolution'
method: SubprocessTestCase
testPathLookupFindsAndRejects
	"GsHostProcess>>fork: demands a complete path and performs no PATH
	search, so the wrapper does the lookup execvp would -- which is also what
	makes a missing program a FileNotFoundError raised BEFORE any child
	exists, as in CPython."

	| m |
	m := _subprocess ___instance___.
	self assert: (m @env1:which: 'sh') notNil.
	self assert: ((m @env1:which: 'sh') @env0:asString includesString: 'sh').
	self assert: (m @env1:which: 'no_such_program_xyz_abc') == None
%

category: 'Grail-Tests - Resolution'
method: SubprocessTestCase
testAbsolutePathBypassesSearch
	"A name containing '/' is used as given, never searched."

	| m |
	m := _subprocess ___instance___.
	self assert: (m @env1:which: '/bin/sh') @env0:asString equals: '/bin/sh'.
	self assert: (m @env1:which: '/bin/no_such_thing_xyz') == None
%

category: 'Grail-Tests - Pipes'
method: SubprocessTestCase
testLargeOutputDoesNotDeadlock
	"The reason communicate() drains while it waits.  A child that writes more
	than one pipe buffer BLOCKS until the parent reads; waiting for exit first
	and reading afterwards is a deadlock, in CPython too.  120k of output is
	comfortably past any pipe buffer."

	self assert: (self eval: 'import subprocess
r = subprocess.run(["sh", "-c",
    "i=0; while [ $i -lt 3000 ]; do echo 0123456789012345678901234567890123456789; i=$((i+1)); done"],
    capture_output=True)
len(r.stdout) == 3000 * 41 and r.returncode == 0') equals: true
%

category: 'Grail-Tests - Pipes'
method: SubprocessTestCase
testStdinStdoutRoundTrip
	self assert: (self eval: 'import subprocess
subprocess.run(["cat"], input=b"round trip", capture_output=True).stdout') equals: 'round trip' asByteArray
%

category: 'Grail-Tests - Signals'
method: SubprocessTestCase
testKillReportsNegativeSignal
	"CPython reports a signal death as the negated signal number.  SIGKILL is
	not something GsHostProcess can send (killChild is SIGTERM only), so the
	wrapper shells out to kill(1) -- see ___signal___."

	self assert: (self eval: 'import subprocess
p = subprocess.Popen(["sleep", "30"])
p.kill()
p.wait()') equals: -9.
	self assert: (self eval: 'import subprocess
p = subprocess.Popen(["sleep", "30"])
p.terminate()
p.wait()') equals: -15
%

category: 'Grail-Tests - Errors'
method: SubprocessTestCase
testUnsupportedOptionsRaiseRatherThanLie
	"The options the fork primitive cannot express are refused explicitly; a
	silent no-op would be worse than an error."

	self should: [self eval: 'import subprocess
subprocess.run(["echo"], preexec_fn=lambda: None)'] raise: ValueError.
	self should: [self eval: 'import subprocess
subprocess.run(["echo"], pass_fds=(3,))'] raise: ValueError.
	self should: [self eval: 'import subprocess
subprocess.run(["echo"], stdout=42)'] raise: ValueError
%

category: 'Grail-Tests - Errors'
method: SubprocessTestCase
testMissingProgramRaisesFileNotFound
	self should: [self eval: 'import subprocess
subprocess.run(["no_such_program_xyz_abc"])'] raise: FileNotFoundError
%
