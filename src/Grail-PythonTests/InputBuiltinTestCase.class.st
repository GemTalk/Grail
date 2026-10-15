Class {
	#name : 'InputBuiltinTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-input' }
InputBuiltinTestCase >> tearDown [
	"A provider left behind would hijack input() for every later test in
	this session."

	builtins stdinProvider: nil.
	super tearDown

]

{ #category : 'Grail-Tests-input' }
InputBuiltinTestCase >> testInstallAcceptsARealClientForwarder [
	"The production provider is a ClientForwarder -- a ROOT class, where even
	isNil forwards to the client.  Installing, reading back, and removing one
	must therefore send it nothing at all; this test fails with a
	ClientForwarderSend error if any such send creeps in."

	| forwarder |
	forwarder := ClientForwarder new.
	builtins stdinProvider: forwarder.
	self assert: builtins stdinProvider == forwarder.
	builtins stdinProvider: nil.
	self assert: builtins stdinProvider == nil

]

{ #category : 'Grail-Tests-input' }
InputBuiltinTestCase >> testPromptWrittenToRedirectedStdout [
	"With sys.stdin assigned, the prompt goes to sys.stdout — the pairing
	CPython uses, and what captured_stdout()-style fixtures expect."

	| result |
	result := self eval: 'import sys, io
sys.stdin = io.StringIO("x\n")
sys.stdout = io.StringIO()
try:
    input("PROMPT? ")
    captured = sys.stdout.getvalue()
finally:
    sys.stdin = None
    sys.stdout = None
captured'.
	self assert: result equals: 'PROMPT? '

]

{ #category : 'Grail-Tests-input' }
InputBuiltinTestCase >> testProviderBlankLineIsNotEof [
	"An empty string from the provider is a blank line the user entered,
	not end of input — only nil means EOF."

	| provider |
	provider := GrailTestStdinProvider lines: { '' }.
	builtins stdinProvider: provider.
	self assert: (self eval: 'input()') equals: ''

]

{ #category : 'Grail-Tests-input' }
InputBuiltinTestCase >> testProviderExhaustedRaisesEofError [
	"nil from the provider is end of input, which CPython's input() reports
	as EOFError."

	| raised |
	builtins stdinProvider: (GrailTestStdinProvider lines: #()).
	raised := false.
	[self eval: 'input()'] on: EOFError do: [:ex | raised := true].
	self assert: raised
		description: 'input() at end of input should raise EOFError'

]

{ #category : 'Grail-Tests-input' }
InputBuiltinTestCase >> testProviderInstallAndRemove [
	"stdinProvider: nil removes the provider rather than storing a nil that
	every input() would then read as instant EOF."

	| provider |
	provider := GrailTestStdinProvider lines: { 'x' }.
	builtins stdinProvider: provider.
	self assert: builtins stdinProvider == provider.
	builtins stdinProvider: nil.
	self assert: builtins stdinProvider isNil

]

{ #category : 'Grail-Tests-input' }
InputBuiltinTestCase >> testProviderInterruptAnswerRaisesKeyboardInterrupt [
	"The Symbol #interrupt from the provider is a cancelled read (Ctrl+C at
	the prompt): input() raises KeyboardInterrupt AT the call, where the
	user's own try/except can catch it -- CPython's contract."

	| result |
	builtins stdinProvider: (GrailTestStdinProvider lines: { #'interrupt' }).
	result := self eval: 'try:
    input()
    r = "no error"
except KeyboardInterrupt:
    r = "KeyboardInterrupt"
r'.
	self assert: result equals: 'KeyboardInterrupt'

]

{ #category : 'Grail-Tests-input' }
InputBuiltinTestCase >> testProviderInterruptAnswerUncaught [
	"Uncaught, the KeyboardInterrupt leaves input() as an ordinary Python
	exception a caller (or a REPL's error rendering) can handle."

	| raised |
	builtins stdinProvider: (GrailTestStdinProvider lines: { #'interrupt' }).
	raised := false.
	[self eval: 'input()'] on: KeyboardInterrupt do: [:ex | raised := true].
	self assert: raised
		description: 'a cancelled read should raise KeyboardInterrupt'

]

{ #category : 'Grail-Tests-input' }
InputBuiltinTestCase >> testProviderPromptIsStringified [
	"input(42) prompts with str(42), as CPython does."

	| provider |
	provider := GrailTestStdinProvider lines: { 'x' }.
	builtins stdinProvider: provider.
	self eval: 'input(42)'.
	self assert: (provider prompts at: 1) equals: '42'

]

{ #category : 'Grail-Tests-input' }
InputBuiltinTestCase >> testProviderSuppliesLineAndSeesPrompt [
	"The provider answers the line, and the prompt is HANDED TO IT rather
	than printed — over an RPC session a Transcript-printed prompt would
	arrive only after the read it announces."

	| provider result |
	provider := GrailTestStdinProvider lines: { 'hello' }.
	builtins stdinProvider: provider.
	result := self eval: 'input("? ")'.
	self assert: result equals: 'hello'.
	self assert: provider prompts size equals: 1.
	self assert: (provider prompts at: 1) equals: '? '

]

{ #category : 'Grail-Tests-input' }
InputBuiltinTestCase >> testProviderTrailingNewlineStripped [
	"A provider that forwards a raw line, newline included, is tolerated:
	input() strips exactly one trailing newline."

	| provider |
	provider := GrailTestStdinProvider lines: { 'abc', (String with: Character lf) }.
	builtins stdinProvider: provider.
	self assert: (self eval: 'input()') equals: 'abc'

]

{ #category : 'Grail-Tests-input' }
InputBuiltinTestCase >> testProviderZeroArgPromptIsEmpty [
	| provider |
	provider := GrailTestStdinProvider lines: { 'x' }.
	builtins stdinProvider: provider.
	self eval: 'input()'.
	self assert: (provider prompts at: 1) equals: ''

]

{ #category : 'Grail-Tests-input' }
InputBuiltinTestCase >> testSysStdinEofRaisesEofError [
	"readline() answering '' is end of file; input() must raise EOFError
	that Python-level except can catch."

	| result |
	result := self eval: 'import sys, io
sys.stdin = io.StringIO("")
try:
    input()
    r = "no error"
except EOFError:
    r = "EOFError"
finally:
    sys.stdin = None
r'.
	self assert: result equals: 'EOFError'

]

{ #category : 'Grail-Tests-input' }
InputBuiltinTestCase >> testSysStdinRedirectBeatsProvider [
	"sys.stdin is consulted FIRST: a Python-level redirection wins over the
	session provider, so test fixtures behave the same with or without a
	client attached."

	| provider result |
	provider := GrailTestStdinProvider lines: { 'from provider' }.
	builtins stdinProvider: provider.
	result := self eval: 'import sys, io
sys.stdin = io.StringIO("from redirect\n")
try:
    line = input()
finally:
    sys.stdin = None
line'.
	self assert: result equals: 'from redirect'.
	self assert: provider prompts isEmpty

]

{ #category : 'Grail-Tests-input' }
InputBuiltinTestCase >> testSysStdinRedirectDrivesInput [
	"CPython's contract: an assigned sys.stdin is read with readline(), one
	line per input(), newline stripped."

	| result |
	result := self eval: 'import sys, io
sys.stdin = io.StringIO("first\nsecond\n")
try:
    a = input()
    b = input()
finally:
    sys.stdin = None
a + ":" + b'.
	self assert: result equals: 'first:second'

]
