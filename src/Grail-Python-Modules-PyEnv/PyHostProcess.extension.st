Extension { #name : 'PyHostProcess' }

{ #category : 'Grail-Private' }
PyHostProcess class >> ___hostProcessText___: aString [
	"aString as GsHostProcess accepts it -- a one-byte String or a Utf8 -- and
	as CPython passes it to execve: its UTF-8 bytes.  So every string is
	encoded, not just a wide one: a one-byte String holding Latin-1 past 127
	(``é'') would pass the check but reach the child as Latin-1.  The kernel's
	test is _isOneByteString, which a Unicode16 is not although it IS a
	String."

	(aString @env0:isKindOfClass: Utf8) ifTrue: [^ aString].
	(aString @env0:isKindOf: CharacterCollection) ifTrue: [^ aString @env0:encodeAsUTF8].
	^ aString

]

{ #category : 'Grail-Spawning' }
PyHostProcess class >> ___spawn___: argvList _: cwdOrNone _: envPairsOrNone _: modesList [
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
	"Through os, so the error carries errno, strerror and filename as CPython's
	does: code that catches this reads e.filename to say WHICH program was not
	found, and got None before."
	resolved == nil ifTrue: [
		(os instance) ___signalErrno: 2 filename: prog].

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

	"GsHostProcess takes a String or a Utf8, and a Python str holding anything
	past Latin-1 is a Unicode16/32: ``git commit -m '🌐 Update ...''' was
	``argument must be a String or Utf8'' (FastAPI's test_translate).  Such an
	argument goes as its UTF-8 bytes, which is what CPython hands execve."
	cmdLine := self ___hostProcessText___: cmdLine.
	args := args @env0:collect: [:a | self ___hostProcessText___: a].
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

]

{ #category : 'Grail-Termination' }
PyHostProcess >> ___closePipes___ [
	"Release the parent ends.  Finalization would do it eventually; a
	long-lived gem running many children should not wait for that."

	[hostProc @env0:_closeSockets] @env0:on: Error do: [:ex | ex @env0:return: nil].
	stdinClosed := true.
	^ None

]

{ #category : 'Grail-IO' }
PyHostProcess >> ___closeStdin___ [
	| sock |
	stdinClosed ifTrue: [^ None].
	inMode @env0:= 1 ifFalse: [^ None].
	sock := hostProc @env0:stdin.
	sock == nil ifFalse: [
		[sock @env0:close] @env0:on: Error do: [:ex | ex @env0:return: nil]].
	stdinClosed := true.
	^ None

]

{ #category : 'Grail-IO' }
PyHostProcess >> ___communicate___: inputBytesOrNone _: timeoutMs [
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

]

{ #category : 'Grail-Termination' }
PyHostProcess >> ___kill___ [
	"SIGKILL, matching CPython's Popen.kill() on POSIX."

	^ self ___signal___: 9

]

{ #category : 'Grail-Status' }
PyHostProcess >> ___pid___ [
	^ hostProc @env0:processId

]

{ #category : 'Grail-Status' }
PyHostProcess >> ___poll___ [
	"Return code if the child has been reaped, else None."

	| rc |
	rc := self @env0:___rawPoll___.
	rc == nil ifTrue: [^ None].
	^ rc

]

{ #category : 'Grail-IO' }
PyHostProcess >> ___readAvailable___: whichStream [
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

]

{ #category : 'Grail-Private' }
PyHostProcess >> ___resultOut___: outStr err: errStr timedOut: aBool [
	| res |
	res := list ___new___.
	res append: (outMode @env0:= 1 ifTrue: [outStr @env0:asByteArray] ifFalse: [None]).
	res append: (errMode @env0:= 1 ifTrue: [errStr @env0:asByteArray] ifFalse: [None]).
	res append: aBool.
	^ res

]

{ #category : 'Grail-Termination' }
PyHostProcess >> ___signal___: signum [
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

]

{ #category : 'Grail-Termination' }
PyHostProcess >> ___terminate___ [
	"SIGTERM, which is what GsHostProcess>>killChild sends natively."

	self @env0:___rawPoll___ == nil ifFalse: [^ None].
	[hostProc @env0:killChild] @env0:on: Error do: [:ex | ex @env0:return: nil].
	^ None

]

{ #category : 'Grail-Status' }
PyHostProcess >> ___waitMs___: timeoutMs [
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

]

{ #category : 'Grail-IO' }
PyHostProcess >> ___writeStdin___: someBytes [
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
				"errno and strerror, not just the text of them -- CPython's
				BrokenPipeError carries both, and a pipe error names no file."
				n == nil ifTrue: [
					BrokenPipeError ___signalNew___:
						{ 32. (os instance) strerror: 32 } kw: nil].
				ofs := ofs @env0:+ n]
			ifFalse: [(Delay @env0:forMilliseconds: 2) @env0:wait]].
	^ data @env0:size

]
