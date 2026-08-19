! ===============================================================================
! _subprocess — native child-process support backed by GemStone GsHostProcess.
!
! Grail's ``subprocess'' used to be a refusal stub whose docstring said "Grail
! gems do not spawn child OS processes".  That was never true of the VM:
! ``GsHostProcess'' forks a child with an argv array, hands back the parent
! ends of the stdin/stdout/stderr pipes as non-blocking GsSockets, reaps with
! waitpid, and kills with a timeout.  This class is the thin wrapper; the
! Python surface (Popen / run / check_output / ...) is pure Python on top, in
! src/python/stdlib/subprocess.py.
!
! Three things GsHostProcess does NOT do, handled here:
!
!   * PATH lookup.  ``fork:'' demands a complete path, so ___resolve___: walks
!     PATH itself and checks the executable bit, which is also what lets a
!     missing program raise FileNotFoundError the way CPython does rather than
!     failing later inside the child.
!   * cwd= and env=.  There is no option for either, so when one is asked for
!     the child is launched through ``/bin/sh -c'' with a cd and/or /usr/bin/env
!     prefix.  ``exec "$@"'' means the shell REPLACES itself, so the pid stays
!     correct and no extra process lingers.
!   * An executable path containing a space.  ``commandLine:'' is split on
!     spaces, so ``/tmp/my dir/prog'' forks ``/tmp/my'' and fails.  Such a path
!     is routed through the same sh wrapper, where it travels as one argv
!     element.
!
! The drain loop in ___communicate___ is modelled on GsHostProcess's own
! _executeWithInput:, and for the same reason: a child that writes more than a
! pipe buffer BLOCKS until the parent reads, so waiting for exit without
! draining deadlocks.  That is CPython's rule too ("use communicate() rather
! than .wait()") and it is why .wait() here refuses to be used with live pipes.
! ===============================================================================

! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

set compile_env: 0

! ------- PyHostProcess wrapper class (one GsHostProcess per instance) --------
expectvalue /Class
doit
Object subclass: 'PyHostProcess'
  instVarNames: #('hostProc' 'pyArgs' 'inMode' 'outMode' 'errMode' 'cachedRc' 'stdinClosed')
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyHostProcess comment:
'A running (or reaped) child process — the object behind ``subprocess.Popen''.

``hostProc'' is the GemStone GsHostProcess.  ``inMode''/``outMode''/``errMode''
record what each standard stream was asked to be, using the same integers the
Python side passes: 0 inherit, 1 PIPE, 2 DEVNULL, 3 redirect-to-stdout (stderr
only).  ``cachedRc'' memoises the CPython-shaped return code once the child has
been reaped, because GsHostProcess>>childStatus keeps answering the raw status
and the sign convention is applied only once.

Instances are never committed: GsHostProcess is instancesNonPersistent, and a
live child is session state by nature.'
%

expectvalue /Class
doit
PyHostProcess category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
PyHostProcess removeAllMethods: 0.
PyHostProcess removeAllMethods: 1.
PyHostProcess class removeAllMethods: 0.
PyHostProcess class removeAllMethods: 1.
%

! ---- env-0 internals --------------------------------------------------------
set compile_env: 0

category: 'Grail-Private'
method: PyHostProcess
___setHostProc___: aProc in: i out: o err: e
	hostProc := aProc.
	inMode := i.
	outMode := o.
	errMode := e.
	stdinClosed := false.
	^ self
%

category: 'Grail-Private'
method: PyHostProcess
___hostProc___
	^ hostProc
%

category: 'Grail-Private'
classmethod: PyHostProcess
___isExecutableFile___: aPath
	"True when aPath exists, is a regular file, and has any execute bit set.
	GsFileStat>>mode carries the POSIX mode word, so this is the same test
	execvp makes before it will run a PATH candidate."

	| st mode |
	st := [GsFile stat: aPath isLstat: false] on: Error do: [:ex | ex return: nil].
	(st isKindOf: GsFileStat) ifFalse: [^ false].
	mode := [st mode] on: Error do: [:ex | ex return: nil].
	mode == nil ifTrue: [^ false].
	"S_IFREG is 16r8000; execute bits are 16r49 (owner/group/other)."
	((mode bitAnd: 16rF000) = 16r8000) ifFalse: [^ false].
	^ (mode bitAnd: 16r49) ~~ 0
%

category: 'Grail-Private'
classmethod: PyHostProcess
___splitPath___: aPathVar
	"PATH split on ':', with an empty element meaning the current directory
	exactly as a shell reads it."

	| out ws |
	out := OrderedCollection new.
	ws := WriteStream on: String new.
	aPathVar do: [:ch |
		ch == $:
			ifTrue: [out add: ws contents. ws := WriteStream on: String new]
			ifFalse: [ws nextPut: ch]].
	out add: ws contents.
	^ out collect: [:e | e isEmpty ifTrue: ['.'] ifFalse: [e]]
%

category: 'Grail-Private'
classmethod: PyHostProcess
___resolveExecutable___: aName env: envPairsOrNil
	"Absolute path for aName, or nil when nothing on PATH matches.

	A name containing '/' is used as given (no search), matching execvp.
	Otherwise PATH is searched — taken from envPairsOrNil when the caller
	supplied an env=, else from the gem's own environment, which is what
	CPython's execvpe does."

	"(the temp is progName, not name: a class-side method inherits Behavior's
	 own `name' instVar and a temp of that name is a 1030 redeclaration)"
	| progName pathVar |
	progName := aName asString.
	progName isEmpty ifTrue: [^ nil].
	(progName includesValue: $/) ifTrue: [
		^ (self ___isExecutableFile___: progName) ifTrue: [progName] ifFalse: [nil]].
	pathVar := nil.
	envPairsOrNil == nil ifFalse: [
		envPairsOrNil do: [:pair | | s |
			s := pair asString.
			(s size > 5 and: [(s copyFrom: 1 to: 5) = 'PATH=']) ifTrue: [
				pathVar := s copyFrom: 6 to: s size]]].
	pathVar == nil ifTrue: [
		pathVar := [System gemEnvironmentVariable: 'PATH'] on: Error do: [:ex | ex return: nil]].
	pathVar == nil ifTrue: [pathVar := '/usr/bin:/bin'].
	(self ___splitPath___: pathVar asString) do: [:dir | | cand |
		cand := dir , '/' , progName.
		(self ___isExecutableFile___: cand) ifTrue: [^ cand]].
	^ nil
%

category: 'Grail-Private'
classmethod: PyHostProcess
___shellQuote___: aString
	"Single-quote for /bin/sh, closing and reopening around any embedded
	quote — the same escaping os.gs uses for its symlink shell-out."

	| ws |
	ws := WriteStream on: String new.
	ws nextPut: $'.
	aString asString do: [:ch |
		ch == $'
			ifTrue: [ws nextPutAll: '''\''''']
			ifFalse: [ws nextPut: ch]].
	ws nextPut: $'.
	^ ws contents
%

category: 'Grail-Private'
classmethod: PyHostProcess
___bytesToString___: aByteArrayOrString
	"Byte-exact ByteArray -> String.

	NOT ``asString'': on a ByteArray that answers the literal text
	'aByteArray' (Object>>asString's printString fallback), which silently
	sent that as the child's stdin instead of the caller's data."

	| ba str |
	(aByteArrayOrString isKindOf: String) ifTrue: [^ aByteArrayOrString].
	ba := aByteArrayOrString.
	str := String new: ba size.
	1 to: ba size do: [:i | str at: i put: (Character codePoint: (ba at: i))].
	^ str
%

category: 'Grail-Private'
method: PyHostProcess
___decodeStatus___: rawStatus
	"GsHostProcess status word -> CPython returncode.

	CPython reports a signal death as the NEGATED signal number and a normal
	exit as the exit code.  GsHostProcess packs both into one word: bit 16r100
	means killed by a signal, 16r200 means stopped by one, and the low byte is
	the signal."

	rawStatus == nil ifTrue: [^ nil].
	(rawStatus bitAnd: 16r100) ~~ 0 ifTrue: [^ (rawStatus bitAnd: 16rFF) negated].
	(rawStatus bitAnd: 16r200) ~~ 0 ifTrue: [^ (rawStatus bitAnd: 16rFF) negated].
	^ rawStatus
%

category: 'Grail-Private'
method: PyHostProcess
___rawPoll___
	"Reaped return code, or nil while the child still runs."

	| s |
	cachedRc == nil ifFalse: [^ cachedRc].
	hostProc == nil ifTrue: [^ nil].
	s := [hostProc childStatus] on: Error do: [:ex | ex return: nil].
	s == nil ifTrue: [^ nil].
	cachedRc := self ___decodeStatus___: s.
	^ cachedRc
%

category: 'Grail-Private'
method: PyHostProcess
___drainInto___: aString from: aSocket
	"Read whatever is available right now; nil timeout means do not wait."

	aSocket == nil ifTrue: [^ 0].
	^ [hostProc _readFromSocket: aSocket into: aString timeout: nil]
		on: Error do: [:ex | ex return: 0]
%

set compile_env: 1

! ===============================================================================
! Construction
! ===============================================================================

category: 'Grail-Spawning'
classmethod: PyHostProcess
___spawn___: argvList _: cwdOrNone _: envPairsOrNone _: modesList
	"Fork a child and answer the PyHostProcess watching it.

	argvList   list of str -- argv, argv[0] being the program
	cwdOrNone  str working directory, or None
	envPairsOrNone  list of 'K=V' str replacing the whole environment, or None
	modesList  3 ints: stdin, stdout, stderr; 0 inherit 1 PIPE 2 DEVNULL
	           3 = stderr to stdout (stderr only)

	Raises FileNotFoundError when the program cannot be resolved, which is the
	one failure CPython reports before the child exists."

	| argv cwd envPairs prog resolved needShell cmdLine args proc inM outM errM |
	argv := OrderedCollection @env0:new.
	argvList @env0:do: [:a | argv @env0:add: (a @env0:asString)].
	argv @env0:isEmpty ifTrue: [ValueError ___signal___: 'argv must not be empty'].
	cwd := (cwdOrNone == None or: [cwdOrNone == nil]) ifTrue: [nil] ifFalse: [cwdOrNone @env0:asString].
	envPairs := (envPairsOrNone == None or: [envPairsOrNone == nil])
		ifTrue: [nil]
		ifFalse: [ | oc | oc := OrderedCollection @env0:new.
			envPairsOrNone @env0:do: [:p | oc @env0:add: (p @env0:asString)]. oc].
	"1-based env-0 indexing: a Python list IS an OrderedCollection, so this
	 works whether the caller is Python or Smalltalk."
	inM := modesList @env0:at: 1.
	outM := modesList @env0:at: 2.
	errM := modesList @env0:at: 3.

	prog := argv @env0:first.
	resolved := PyHostProcess @env0:___resolveExecutable___: prog env: envPairs.
	resolved == nil ifTrue: [
		FileNotFoundError ___signal___:
			'[Errno 2] No such file or directory: ' @env0:, (prog @env0:printString)].

	"A cd, an env replacement, or a space in the path all need a shell."
	needShell := (cwd ~~ nil) @env0:or: [
		(envPairs ~~ nil) @env0:or: [resolved @env0:includesValue: $ ]].

	needShell
		ifTrue: [ | ws |
			"Shape:  [cd DIR &&] exec [/usr/bin/env -i K=V ...] ``$@''
			 ``exec'' has to come FIRST: written the other way round the shell
			 hands ``exec'' to env(1) as the program name, env cannot find a
			 binary called exec, and the child produces nothing at all."
			ws := WriteStream @env0:on: String @env0:new.
			cwd == nil ifFalse: [
				ws @env0:nextPutAll: 'cd '.
				ws @env0:nextPutAll: (PyHostProcess @env0:___shellQuote___: cwd).
				ws @env0:nextPutAll: ' && '].
			ws @env0:nextPutAll: 'exec '.
			envPairs == nil ifFalse: [
				ws @env0:nextPutAll: '/usr/bin/env -i'.
				envPairs @env0:do: [:p |
					ws @env0:nextPutAll: ' '.
					ws @env0:nextPutAll: (PyHostProcess @env0:___shellQuote___: p)].
				ws @env0:nextPutAll: ' '].
			ws @env0:nextPutAll: '"$@"'.
			cmdLine := '/bin/sh'.
			args := OrderedCollection @env0:new.
			args @env0:add: '-c'; @env0:add: ws @env0:contents; @env0:add: 'sh'.
			args @env0:add: resolved.
			2 @env0:to: argv @env0:size do: [:i | args @env0:add: (argv @env0:at: i)]]
		ifFalse: [
			cmdLine := resolved.
			args := OrderedCollection @env0:new.
			2 @env0:to: argv @env0:size do: [:i | args @env0:add: (argv @env0:at: i)]].

	proc := GsHostProcess @env0:new.
	proc @env0:commandLine: cmdLine.
	args @env0:isEmpty ifFalse: [proc @env0:args: (args @env0:asArray)].

	"Anything not asked to be a pipe must be pointed at a file, or the child
	inherits nothing and blocks on its first read/write."
	inM @env0:= 1 ifFalse: [proc @env0:stdinPath: '/dev/null'].
	outM @env0:= 1 ifFalse: [proc @env0:stdoutPath: '/dev/null'].
	errM @env0:= 3
		ifTrue: [
			"redirectStderrToStdout requires a stdout PATH; with a stdout pipe the
			 two streams are merged on the Python side instead."
			outM @env0:= 1 ifFalse: [proc @env0:redirectStderrToStdout]]
		ifFalse: [errM @env0:= 1 ifFalse: [proc @env0:stderrPath: '/dev/null']].

	[proc @env0:fork]
		@env0:on: Error
		do: [:ex |
			OSError ___signal___:
				('cannot spawn ' @env0:, (prog @env0:printString) @env0:, ': '
					@env0:, (ex @env0:messageText @env0:asString))].

	^ (PyHostProcess @env0:new)
		@env0:___setHostProc___: proc in: inM out: outM err: errM
%

! ===============================================================================
! Status
! ===============================================================================

category: 'Grail-Status'
method: PyHostProcess
___pid___
	^ hostProc @env0:processId
%

category: 'Grail-Status'
method: PyHostProcess
___poll___
	"Return code if the child has been reaped, else None."

	| rc |
	rc := self @env0:___rawPoll___.
	rc == nil ifTrue: [^ None].
	^ rc
%

category: 'Grail-Status'
method: PyHostProcess
___waitMs___: timeoutMs
	"Poll until the child is reaped or the timeout expires; None on timeout.

	Only safe when no pipe can fill: a child writing to an undrained pipe
	blocks forever and this would spin until the timeout.  The Python side
	enforces that rule, and communicate() is the drain-while-waiting path."

	| rc deadline waitForever |
	waitForever := (timeoutMs == None) @env0:or: [timeoutMs == nil].
	deadline := waitForever
		ifTrue: [0]
		ifFalse: [(System @env0:timeNs) @env0:+ (timeoutMs @env0:* 1000000)].
	[true] @env0:whileTrue: [
		rc := self @env0:___rawPoll___.
		rc == nil ifFalse: [^ rc].
		waitForever ifFalse: [
			(System @env0:timeNs) @env0:>= deadline ifTrue: [^ None]].
		(Delay @env0:forMilliseconds: 5) @env0:wait]
%

! ===============================================================================
! I/O
! ===============================================================================

category: 'Grail-IO'
method: PyHostProcess
___communicate___: inputBytesOrNone _: timeoutMs
	"Write input, drain stdout+stderr, wait for exit.  Answers a 3-element
	list {stdoutBytes. stderrBytes. timedOut}.

	This is the only safe way to run a child with pipes, and the loop shape is
	GsHostProcess>>_executeWithInput:'s for the reason given in the file
	header: reads have to keep happening WHILE waiting, or a child that
	outruns the pipe buffer blocks and neither side ever moves.

	stdout and stderr are read as byte strings and answered as Python bytes;
	decoding is the Python side's business (text=/encoding=)."

	| outStr errStr outSock errSock toWrite writeOfs inSock rc deadline waitForever timedOut |
	outStr := String @env0:new.
	errStr := String @env0:new.
	outSock := outMode @env0:= 1 ifTrue: [hostProc @env0:stdout] ifFalse: [nil].
	errSock := errMode @env0:= 1 ifTrue: [hostProc @env0:stderr] ifFalse: [nil].
	inSock := (inMode @env0:= 1 and: [stdinClosed @env0:not])
		ifTrue: [hostProc @env0:stdin] ifFalse: [nil].

	toWrite := nil.
	writeOfs := 1.
	(inputBytesOrNone == None or: [inputBytesOrNone == nil]) ifFalse: [
		toWrite := PyHostProcess @env0:___bytesToString___: inputBytesOrNone].
	toWrite == nil ifTrue: [
		"Nothing to send: close stdin so a child reading it sees EOF."
		inSock == nil ifFalse: [
			[inSock @env0:close] @env0:on: Error do: [:ex | ex @env0:return: nil].
			stdinClosed := true.
			inSock := nil]].

	waitForever := (timeoutMs == None) @env0:or: [timeoutMs == nil].
	deadline := waitForever
		ifTrue: [0]
		ifFalse: [(System @env0:timeNs) @env0:+ (timeoutMs @env0:* 1000000)].
	timedOut := false.

	[true] @env0:whileTrue: [
		"1. push whatever stdin will take without blocking"
		(toWrite ~~ nil and: [inSock ~~ nil]) ifTrue: [
			(inSock @env0:writeWillNotBlock) ifTrue: [ | nWrote remaining |
				remaining := toWrite @env0:size @env0:- writeOfs @env0:+ 1.
				remaining @env0:> 0
					ifTrue: [
						nWrote := [inSock @env0:write: remaining from: toWrite startingAt: writeOfs]
							@env0:on: Error do: [:ex | ex @env0:return: nil].
						nWrote == nil
							ifTrue: [ "child closed stdin early (EPIPE) -- not fatal"
								writeOfs := toWrite @env0:size @env0:+ 1]
							ifFalse: [writeOfs := writeOfs @env0:+ nWrote]]
					ifFalse: [remaining := 0].
				(writeOfs @env0:> toWrite @env0:size) ifTrue: [
					[inSock @env0:close] @env0:on: Error do: [:ex | ex @env0:return: nil].
					stdinClosed := true.
					inSock := nil]]].

		"2. drain both pipes so the child never blocks on a full buffer"
		self @env0:___drainInto___: outStr from: outSock.
		self @env0:___drainInto___: errStr from: errSock.

		"3. done?"
		rc := self @env0:___rawPoll___.
		rc == nil ifFalse: [
			"Reaped.  Anything still in the pipes is readable now -- the kernel
			 doc is explicit that data outlives the child -- so drain to EOF."
			self @env0:___drainInto___: outStr from: outSock.
			self @env0:___drainInto___: errStr from: errSock.
			^ self ___resultOut___: outStr err: errStr timedOut: false].

		waitForever ifFalse: [
			(System @env0:timeNs) @env0:>= deadline ifTrue: [
				timedOut := true.
				^ self ___resultOut___: outStr err: errStr timedOut: true]].
		(Delay @env0:forMilliseconds: 5) @env0:wait].
	^ None
%

category: 'Grail-Private'
method: PyHostProcess
___resultOut___: outStr err: errStr timedOut: aBool
	| res |
	res := list ___new___.
	res append: (outMode @env0:= 1 ifTrue: [outStr @env0:asByteArray] ifFalse: [None]).
	res append: (errMode @env0:= 1 ifTrue: [errStr @env0:asByteArray] ifFalse: [None]).
	res append: aBool.
	^ res
%

category: 'Grail-IO'
method: PyHostProcess
___readAvailable___: whichStream
	"Non-blocking read of whatever has arrived on stdout (1) or stderr (2).
	Answers bytes, possibly empty.  Used by the file-like pipe wrappers."

	| sock s |
	sock := whichStream @env0:= 1
		ifTrue: [outMode @env0:= 1 ifTrue: [hostProc @env0:stdout] ifFalse: [nil]]
		ifFalse: [errMode @env0:= 1 ifTrue: [hostProc @env0:stderr] ifFalse: [nil]].
	sock == nil ifTrue: [^ '' @env0:asByteArray].
	s := String @env0:new.
	self @env0:___drainInto___: s from: sock.
	^ s @env0:asByteArray
%

category: 'Grail-IO'
method: PyHostProcess
___writeStdin___: someBytes
	"Blocking write to the child's stdin; answers the number of bytes written."

	| sock data ofs remaining |
	inMode @env0:= 1 ifFalse: [
		ValueError ___signal___: 'stdin was not opened as a pipe'].
	stdinClosed ifTrue: [
		ValueError ___signal___: 'write to a closed stdin'].
	sock := hostProc @env0:stdin.
	sock == nil ifTrue: [^ 0].
	data := PyHostProcess @env0:___bytesToString___: someBytes.
	ofs := 1.
	[ofs @env0:<= data @env0:size] @env0:whileTrue: [
		(sock @env0:writeWillNotBlock)
			ifTrue: [ | n |
				remaining := data @env0:size @env0:- ofs @env0:+ 1.
				n := [sock @env0:write: remaining from: data startingAt: ofs]
					@env0:on: Error do: [:ex | ex @env0:return: nil].
				n == nil ifTrue: [
					BrokenPipeError ___signal___: '[Errno 32] Broken pipe'].
				ofs := ofs @env0:+ n]
			ifFalse: [(Delay @env0:forMilliseconds: 2) @env0:wait]].
	^ data @env0:size
%

category: 'Grail-IO'
method: PyHostProcess
___closeStdin___
	| sock |
	stdinClosed ifTrue: [^ None].
	inMode @env0:= 1 ifFalse: [^ None].
	sock := hostProc @env0:stdin.
	sock == nil ifFalse: [
		[sock @env0:close] @env0:on: Error do: [:ex | ex @env0:return: nil]].
	stdinClosed := true.
	^ None
%

! ===============================================================================
! Termination
! ===============================================================================

category: 'Grail-Termination'
method: PyHostProcess
___terminate___
	"SIGTERM, which is what GsHostProcess>>killChild sends natively."

	self @env0:___rawPoll___ == nil ifFalse: [^ None].
	[hostProc @env0:killChild] @env0:on: Error do: [:ex | ex @env0:return: nil].
	^ None
%

category: 'Grail-Termination'
method: PyHostProcess
___signal___: signum
	"Send an arbitrary signal.

	The kernel offers only SIGTERM (killChild), so anything else goes through
	/bin/kill -- which is a legitimate use of the very facility this class
	wraps, and the only route to SIGKILL without a kill(2) primitive.  That
	primitive is on the list of things worth asking the GemStone team for;
	see docs/GemStone_Feature_Requests.md."

	| pid killer |
	self @env0:___rawPoll___ == nil ifFalse: [^ None].
	signum @env0:= 15 ifTrue: [^ self ___terminate___].
	pid := hostProc @env0:processId.
	pid == nil ifTrue: [^ None].
	killer := [PyHostProcess @env0:___resolveExecutable___: 'kill' env: nil]
		@env0:on: Error do: [:ex | ex @env0:return: nil].
	killer == nil ifTrue: [^ self ___terminate___].
	[ | k |
		k := GsHostProcess @env0:new.
		k @env0:commandLine: killer.
		k @env0:args: (Array @env0:with: ('-' @env0:, signum @env0:printString)
			@env0:with: pid @env0:printString).
		k @env0:stdinPath: '/dev/null'; @env0:stdoutPath: '/dev/null'; @env0:stderrPath: '/dev/null'.
		k @env0:fork]
			@env0:on: Error do: [:ex | ex @env0:return: nil].
	^ None
%

category: 'Grail-Termination'
method: PyHostProcess
___kill___
	"SIGKILL, matching CPython's Popen.kill() on POSIX."

	^ self ___signal___: 9
%

category: 'Grail-Termination'
method: PyHostProcess
___closePipes___
	"Release the parent ends.  Finalization would do it eventually; a
	long-lived gem running many children should not wait for that."

	[hostProc @env0:_closeSockets] @env0:on: Error do: [:ex | ex @env0:return: nil].
	stdinClosed := true.
	^ None
%

! ===============================================================================
! _subprocess — the importable module Python reaches PyHostProcess through.
!
! Same shape as _weakref: a `module' subclass whose singleton is registered with
! importlib, so `import _subprocess' works and pure-Python subprocess.py can
! call spawn() without knowing any Smalltalk.
! ===============================================================================

set compile_env: 0

expectvalue /Class
doit
module subclass: '_subprocess'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
_subprocess category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
_subprocess removeAllMethods.
_subprocess class removeAllMethods.
_subprocess removeAllMethods: 1.
_subprocess class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Spawning'
method: _subprocess
spawn: argvList _: cwd _: envPairs _: modes
	"Fork a child; answers the handle subprocess.Popen drives.

	argv    list of str
	cwd     str or None
	env     list of 'K=V' str replacing the environment, or None
	modes   [stdin, stdout, stderr] ints -- 0 inherit, 1 PIPE, 2 DEVNULL,
	        3 stderr-to-stdout"

	^ PyHostProcess ___spawn___: argvList _: cwd _: envPairs _: modes
%

category: 'Grail-Spawning'
method: _subprocess
which: prog
	"Absolute path for prog using PATH, or None -- the lookup execvp does.
	Exposed because shutil.which and subprocess's own error messages both
	want it, and it is the check that lets a missing program raise
	FileNotFoundError before any child exists."

	| r |
	r := PyHostProcess @env0:___resolveExecutable___: prog env: nil.
	r == nil ifTrue: [^ None].
	^ r
%

set compile_env: 0
