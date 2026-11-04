Class {
	#name : 'SysConsoleStreamTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
SysConsoleStreamTestCase >> assertAll: selectors [
	selectors do: [:each |
		self assert: (testModule perform: each env: 1) equals: true]

]

{ #category : 'Grail-Setup' }
SysConsoleStreamTestCase >> setUp [
	"Reload tests/python/sys_console_stream.py fresh each test -- several
	fixtures reassign sys.stdout / sys.stderr and restore them."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'sys_console_stream' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/sys_console_stream.py')
		name: 'sys_console_stream'.

]

{ #category : 'Grail-Tests - the symptoms' }
SysConsoleStreamTestCase >> testAnArgparseStyleHelpReachesTheConsole [
	"...and the silent half, against the REAL sys.stdout: the message argparse
	used to swallow now arrives on the console, character for character and with
	no newline added."

	| text |
	text := self withCapturedConsole: [
		self eval: 'import sys
def _print_message(message, file=None):
    if message:
        if file is None:
            file = sys.stderr
        try:
            file.write(message)
        except (AttributeError, OSError):
            pass
_print_message("usage: prog [-h]\n", sys.stdout)'].
	self assert: text equals: 'usage: prog [-h]
'

]

{ #category : 'Grail-Tests - the symptoms' }
SysConsoleStreamTestCase >> testAnArgparseStylePrintMessageIsNotSwallowed [
	"The SILENT symptom, spelled out without argparse: its _print_message body
	is ``try: file.write(message) except (AttributeError, OSError): pass'', so a
	None stream lost the message with no error and no exit-code change."

	self assert: testModule @env1:an_argparse_style_print_message_is_not_swallowed
		equals: true

]

{ #category : 'Grail-Tests - write reaches the console' }
SysConsoleStreamTestCase >> testANonAsciiWriteIsNotMangled [
	"___consoleWrite___: is where the GsFile-takes-bytes encoding lives, and
	going through it is the whole reason write forwards there rather than to the
	sink directly.  With a character-taking sink the text arrives unchanged."

	| text |
	text := self withCapturedConsole: [
		self eval: 'import sys
sys.stdout.write("caf\u00e9 \u2022")'].
	"Spelled by code point rather than as a literal, so what is asserted cannot
	depend on how this file's own bytes were read."
	self assert: text size equals: 6.
	self assert: (text at: 4) codePoint equals: 233.
	self assert: (text at: 6) codePoint equals: 8226

]

{ #category : 'Grail-Tests - print is unchanged' }
SysConsoleStreamTestCase >> testAReassignedStdoutStillRedirectsPrint [
	"test.support.captured_stdout()'s whole mechanism, and the behaviour a real
	sys.stdout must not disturb."

	self assert: testModule @env1:a_reassigned_stdout_still_redirects_print
		equals: true

]

{ #category : 'Grail-Tests - print is unchanged' }
SysConsoleStreamTestCase >> testARedirectedPrintDoesNotReachTheConsole [
	"...and the other direction: while sys.stdout is a StringIO, NOTHING lands
	on the console.  A recogniser that answered nil too eagerly would show up
	here as text on the console that the buffer never received."

	| text |
	text := self withCapturedConsole: [
		self eval: 'import io, sys
_before = sys.stdout
_buf = io.StringIO()
sys.stdout = _buf
try:
    print("captured")
finally:
    sys.stdout = _before'].
	self assert: text equals: ''

]

{ #category : 'Grail-Tests - warnings' }
SysConsoleStreamTestCase >> testAWarningWithNoFileStillReachesTheConsole [
	"warnings >> showwarning falls back to sys.stderr, which is now an object.
	It makes the same recognition ___printTarget___ does, so a displayed warning
	stays on the console path it was already on rather than being routed through
	write: to the same sink by a longer route."

	| text |
	text := self withCapturedConsole: [
		self eval: 'import warnings
warnings.showwarning("boom", UserWarning, "g.py", 7)'].
	self assert: (text includesString: 'g.py:7: UserWarning: boom')

]

{ #category : 'Grail-Tests - the streams are real' }
SysConsoleStreamTestCase >> testFilenoIsUnsupported [
	"A documented Grail LIMIT, and CPython disagrees (it answers 1).  There is
	no descriptor on this side known to be the console's -- the sink may be the
	Transcript, a GsFile, or a ClientForwarder whose descriptor lives in the
	client process.  io.UnsupportedOperation is an OSError subclass, so the
	``except OSError'' a caller already wraps fileno() in catches it."

	self assert: testModule @env1:fileno_is_unsupported equals: true

]

{ #category : 'Grail-Tests - the symptoms' }
SysConsoleStreamTestCase >> testPrintExcWithTheDEFAULTStreamReachesTheConsole [
	"The half the Python fixture cannot see.  print_exc() with sys.stderr left
	ALONE now renders on the console instead of raising -- which is what a
	caller of a vendored module gets."

	| text |
	text := self withCapturedConsole: [
		self eval: 'import traceback
try:
    raise ValueError("boom")
except ValueError:
    traceback.print_exc()'].
	self assert: (text includesString: 'ValueError: boom')

]

{ #category : 'Grail-Tests - the symptoms' }
SysConsoleStreamTestCase >> testPrintExcWritesToSysStderr [
	"The LOUD symptom: traceback.print_exc() reads sys.stderr at call time and
	writes through it, which was ``AttributeError: 'NoneType' object has no
	attribute 'write'''."

	self assert: testModule @env1:print_exc_writes_to_sys_stderr equals: true

]

{ #category : 'Grail-Tests - print is unchanged' }
SysConsoleStreamTestCase >> testPrintStillReachesTheConsole [
	"THE RISK OF THIS CHANGE, pinned.  sys.stdout is now an object, and
	___printTarget___ treats any non-None value as a redirect -- so without the
	console-stream recognition every print in the corpus would go through
	PyConsoleStream write: instead.  The characters, separators and end are
	exactly print's, with nothing added."

	| text |
	text := self withCapturedConsole: [
		self eval: 'print("plain")
print("a", "b", sep="-", end="!")
print()'].
	self assert: text equals: 'plain
a-b!
'

]

{ #category : 'Grail-Tests - print is unchanged' }
SysConsoleStreamTestCase >> testPrintTargetAnswersNilForTheConsoleStream [
	"The mechanism, directly.  nil means ``the console''; anything else is
	written through with write:.  The console stream answers nil under both
	spellings -- as sys.stdout, and as an explicit ``file='' argument -- while a
	StringIO is a redirect and comes back as itself."

	| target buf kwargs |
	target := (builtins ___instance___) @env1:___printTarget___: nil.
	self assert: target isNil.
	kwargs := Dictionary new.
	kwargs at: 'file' put: (self eval: 'import sys
sys.stdout').
	self assert: ((builtins ___instance___) @env1:___printTarget___: kwargs) isNil.
	buf := self eval: 'import io
io.StringIO()'.
	kwargs at: 'file' put: buf.
	self assert: ((builtins ___instance___) @env1:___printTarget___: kwargs) == buf

]

{ #category : 'Grail-Tests - print is unchanged' }
SysConsoleStreamTestCase >> testPrintToAnExplicitSysStdoutReachesTheConsole [
	"``print(x, file=sys.stdout)'' -- the same console, spelled explicitly."

	| text |
	text := self withCapturedConsole: [
		self eval: 'import sys
print("explicit", file=sys.stdout)'].
	self assert: text equals: 'explicit
'

]

{ #category : 'Grail-Tests - the error channel' }
SysConsoleStreamTestCase >> testStderrWithNoErrorBoxReachesTheConsole [
	"An embedder that installs only #GrailConsole -- GemDB's notebook and shell,
	a topaz-hosted run -- keeps getting sys.stderr on that one sink: the error
	channel falls back to the console when no #GrailConsoleErr box is installed
	(#1972), so nothing that embedder captured goes missing."

	| text saved |
	saved := SessionTemps current at: #'GrailConsoleErr' otherwise: nil.
	SessionTemps current removeKey: #'GrailConsoleErr' ifAbsent: [].
	[text := self withCapturedConsole: [
		self eval: 'import sys
sys.stderr.write("to stderr\n")
print("printed", file=sys.stderr)']]
		ensure: [saved == nil ifFalse: [
			SessionTemps current at: #'GrailConsoleErr' put: saved]].
	self assert: text equals: 'to stderr
printed
'

]

{ #category : 'Grail-Tests - the error channel' }
SysConsoleStreamTestCase >> testStderrWritesReachTheErrorChannel [
	"With an error box installed -- ./grail installs fd 2 there -- everything
	written through sys.stderr or sys.__stderr__ arrives in it and NOT on the
	console, and sys.stdout stays on the console (#1972).  sys.stderr used to
	share the console's one sink, so under ./grail it was fd 1."

	| out err saved |
	err := WriteStream on: (Unicode7 new).
	saved := SessionTemps current at: #'GrailConsoleErr' otherwise: nil.
	SessionTemps current at: #'GrailConsoleErr' put: (Array with: err).
	[out := self withCapturedConsole: [
		self eval: 'import sys, warnings
print("out-1")
sys.stderr.write("err-1\n")
print("err-2", file=sys.stderr)
sys.__stderr__.write("err-3\n")
warnings.warn_explicit("err-4", UserWarning, "f.py", 1)
print("out-2", file=sys.stdout)']]
		ensure: [saved == nil
			ifTrue: [SessionTemps current removeKey: #'GrailConsoleErr' ifAbsent: []]
			ifFalse: [SessionTemps current at: #'GrailConsoleErr' put: saved]].
	self assert: out equals: 'out-1
out-2
'.
	self assert: (err contents asString copyFrom: 1 to: 18) equals: 'err-1
err-2
err-3
'.
	self assert: (err contents asString includesString: 'f.py:1: UserWarning: err-4')

]

{ #category : 'Grail-Tests - the streams are real' }
SysConsoleStreamTestCase >> testTheFileProtocol [
	"What stdlib code probes before writing: write()'s character count and its
	TypeError, writable/readable/closed, isatty(), encoding/errors, flush()."

	self assertAll: #(#'an_empty_write_answers_zero'
		#'write_rejects_a_non_str'
		#'the_protocol_predicates_answer'
		#'isatty_answers_a_bool'
		#'encoding_and_errors_are_strings'
		#'flush_answers_none')

]

{ #category : 'Grail-Tests - the streams are real' }
SysConsoleStreamTestCase >> testTheStreamsAreRealObjects [
	"THE DEFECT, in one line each: not None, the same object under both names,
	and reporting CPython's names and mode."

	self assertAll: #(#'the_streams_are_not_none'
		#'stdout_is_the_same_object_as_dunder_stdout'
		#'the_streams_report_cpython_s_names'
		#'the_mode_is_write')

]

{ #category : 'Grail-Tests - write reaches the console' }
SysConsoleStreamTestCase >> testWritelinesReachesTheConsoleWithNoSeparator [
	"writelines() adds nothing between the items -- CPython's contract."

	| text |
	text := self withCapturedConsole: [
		self eval: 'import sys
sys.stdout.writelines(["a", "b", "c"])'].
	self assert: text equals: 'abc'

]

{ #category : 'Grail-Tests - write reaches the console' }
SysConsoleStreamTestCase >> testWriteReachesTheConsoleAndAnswersTheCharacterCount [
	"write() puts the characters on the console verbatim -- no newline added,
	no separator -- and answers len(s), which is what CPython returns and what a
	caller summing writes adds up."

	| text n |
	n := nil.
	text := self withCapturedConsole: [
		n := self eval: 'import sys
sys.stdout.write("ab") + sys.stdout.write("cde\n")'].
	self assert: text equals: 'abcde
'.
	"2 + 4: the newline is a character and is counted, as it is in CPython."
	self assert: n equals: 6

]

{ #category : 'Grail-Helpers' }
SysConsoleStreamTestCase >> withCapturedConsole: aBlock [
	"Run aBlock with the console redirected into a WriteStream, and answer what
	arrived there.  This is the embedder seam builtins ___console___ /
	___consoleWrite___: already read: a boxed sink in SessionTemps
	#GrailConsole (boxed because a real embedder's sink is a ClientForwarder,
	which must not be sent anything -- see ___console___'s comment).

	Restored in an ensure block: leaving a capture installed would silence every
	later test's console output for the rest of the session."

	| capture saved |
	capture := WriteStream on: (Unicode7 new).
	saved := SessionTemps current at: #'GrailConsole' otherwise: nil.
	SessionTemps current at: #'GrailConsole' put: (Array with: capture).
	[aBlock value] ensure: [
		saved == nil
			ifTrue: [SessionTemps current removeKey: #'GrailConsole' ifAbsent: []]
			ifFalse: [SessionTemps current at: #'GrailConsole' put: saved]].
	^ capture contents asString

]
