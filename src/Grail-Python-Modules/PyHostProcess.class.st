"A running (or reaped) child process — the object behind ``subprocess.Popen'.

``hostProc' is the GemStone GsHostProcess.  ``inMode'/``outMode'/``errMode'
record what each standard stream was asked to be, using the same integers the
Python side passes: 0 inherit, 1 PIPE, 2 DEVNULL, 3 redirect-to-stdout (stderr
only).  ``cachedRc' memoises the CPython-shaped return code once the child has
been reaped, because GsHostProcess>>childStatus keeps answering the raw status
and the sign convention is applied only once.

Instances are never committed: GsHostProcess is instancesNonPersistent, and a
live child is session state by nature."
Class {
	#name : 'PyHostProcess',
	#superclass : 'Object',
	#instVars : [
		'hostProc',
		'pyArgs',
		'inMode',
		'outMode',
		'errMode',
		'cachedRc',
		'stdinClosed'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Private' }
PyHostProcess class >> ___bytesToString___: aByteArrayOrString [
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

]

{ #category : 'Grail-Private' }
PyHostProcess class >> ___isExecutableFile___: aPath [
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

]

{ #category : 'Grail-Private' }
PyHostProcess class >> ___resolveExecutable___: aName env: envPairsOrNil [
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

]

{ #category : 'Grail-Private' }
PyHostProcess class >> ___shellQuote___: aString [
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

]

{ #category : 'Grail-Private' }
PyHostProcess class >> ___splitPath___: aPathVar [
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

]

{ #category : 'Grail-Private' }
PyHostProcess >> ___decodeStatus___: rawStatus [
	"GsHostProcess status word -> CPython returncode.

	CPython reports a signal death as the NEGATED signal number and a normal
	exit as the exit code.  GsHostProcess packs both into one word: bit 16r100
	means killed by a signal, 16r200 means stopped by one, and the low byte is
	the signal."

	rawStatus == nil ifTrue: [^ nil].
	(rawStatus bitAnd: 16r100) ~~ 0 ifTrue: [^ (rawStatus bitAnd: 16rFF) negated].
	(rawStatus bitAnd: 16r200) ~~ 0 ifTrue: [^ (rawStatus bitAnd: 16rFF) negated].
	^ rawStatus

]

{ #category : 'Grail-Private' }
PyHostProcess >> ___drainInto___: aString from: aSocket [
	"Read whatever is available right now; nil timeout means do not wait."

	aSocket == nil ifTrue: [^ 0].
	^ [hostProc _readFromSocket: aSocket into: aString timeout: nil]
		on: Error do: [:ex | ex return: 0]

]

{ #category : 'Grail-Private' }
PyHostProcess >> ___hostProc___ [
	^ hostProc

]

{ #category : 'Grail-Private' }
PyHostProcess >> ___rawPoll___ [
	"Reaped return code, or nil while the child still runs."

	| s |
	cachedRc == nil ifFalse: [^ cachedRc].
	hostProc == nil ifTrue: [^ nil].
	s := [hostProc childStatus] on: Error do: [:ex | ex return: nil].
	s == nil ifTrue: [^ nil].
	cachedRc := self ___decodeStatus___: s.
	^ cachedRc

]

{ #category : 'Grail-Private' }
PyHostProcess >> ___setHostProc___: aProc in: i out: o err: e [
	hostProc := aProc.
	inMode := i.
	outMode := o.
	errMode := e.
	stdinClosed := false.
	^ self

]
