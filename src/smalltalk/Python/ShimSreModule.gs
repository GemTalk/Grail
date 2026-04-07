! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
CPythonShim ifNil: [self error: 'CPythonShim is not defined. Check file ordering.'].
%

! ------- _sre class (C extension module via shim)
expectvalue /Class
doit
module subclass: '_sre'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
_sre comment:
'Python _sre C extension module (regular expression engine).

Provides the low-level SRE matching engine used by the re module.
This wrapper delegates to CPythonShim which calls the actual C
implementation of _sre compiled from CPython 3.14 source.

Usage (from Python source):
    import _sre
    _sre.getcodesize()   # => 4
    pattern = _sre.compile(...)
    match = pattern.search("hello")
'
%

expectvalue /Class
doit
_sre category: 'Modules'
%

! ------- SrePattern class (wraps C PatternObject*)
expectvalue /Class
doit
Object subclass: 'SrePattern'
  instVarNames: #(cPtr)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
SrePattern comment:
'Wrapper for a C-allocated PatternObject* from _sre.compile().
cPtr holds the raw C memory address as a SmallInteger.'
%

! ------- SreMatch class (wraps C MatchObject*)
expectvalue /Class
doit
Object subclass: 'SreMatch'
  instVarNames: #(cPtr)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
SreMatch comment:
'Wrapper for a C-allocated MatchObject* from pattern.match()/search().
cPtr holds the raw C memory address as a SmallInteger.'
%

expectvalue /Metaclass3
doit
_sre removeAllMethods.
_sre class removeAllMethods.
SrePattern removeAllMethods.
SrePattern class removeAllMethods.
SreMatch removeAllMethods.
SreMatch class removeAllMethods.
%

! ===============================================================================
! SrePattern - env 0 class methods
! ===============================================================================

set compile_env: 0

category: 'Instance Creation'
classmethod: SrePattern
newFromCPtr: aCPtr
	"Create a pattern wrapper from a C pointer. Returns nil if pointer is 0."

	aCPtr = 0 ifTrue: [^ nil].
	^ self basicNew initCPtr: aCPtr
%

category: 'Private'
method: SrePattern
initCPtr: aCPtr
	cPtr := aCPtr
%

category: 'Accessing'
method: SrePattern
cPtr
	^ cPtr
%

! ===============================================================================
! SrePattern - env 1 methods (Python-compatible)
! ===============================================================================

set compile_env: 1

category: 'Python-Methods'
method: SrePattern
match
	"match(string[, pos[, endpos]]) -> SreMatch or None"
	^ [:positional :keywords |
		| nargs result |
		nargs := (positional @env0:size).
		result := (nargs ___eq___: 1)
			ifTrue: [
				(CPythonShim @env0:current) @env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'match' selfPtr: cPtr with: (positional @env0:at: 1)
			]
			ifFalse: [ (nargs ___eq___: 2)
				ifTrue: [
					(CPythonShim @env0:current) @env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'match' selfPtr: cPtr with: (positional @env0:at: 1) with: (positional @env0:at: 2)
				]
				ifFalse: [
					(CPythonShim @env0:current) @env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'match' selfPtr: cPtr with: (positional @env0:at: 1) with: (positional @env0:at: 2) with: (positional @env0:at: 3)
				]
			].
		(result ___eq___: 0)
			ifTrue: [nil]
			ifFalse: [SreMatch @env0:newFromCPtr: result]
	]
%

category: 'Python-Methods'
method: SrePattern
search
	"search(string[, pos[, endpos]]) -> SreMatch or None"
	^ [:positional :keywords |
		| nargs result |
		nargs := (positional @env0:size).
		result := (nargs ___eq___: 1)
			ifTrue: [
				(CPythonShim @env0:current) @env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'search' selfPtr: cPtr with: (positional @env0:at: 1)
			]
			ifFalse: [ (nargs ___eq___: 2)
				ifTrue: [
					(CPythonShim @env0:current) @env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'search' selfPtr: cPtr with: (positional @env0:at: 1) with: (positional @env0:at: 2)
				]
				ifFalse: [
					(CPythonShim @env0:current) @env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'search' selfPtr: cPtr with: (positional @env0:at: 1) with: (positional @env0:at: 2) with: (positional @env0:at: 3)
				]
			].
		(result ___eq___: 0)
			ifTrue: [nil]
			ifFalse: [SreMatch @env0:newFromCPtr: result]
	]
%

category: 'Python-Methods'
method: SrePattern
fullmatch
	"fullmatch(string[, pos[, endpos]]) -> SreMatch or None"
	^ [:positional :keywords |
		| nargs result |
		nargs := (positional @env0:size).
		result := (nargs ___eq___: 1)
			ifTrue: [
				(CPythonShim @env0:current) @env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'fullmatch' selfPtr: cPtr with: (positional @env0:at: 1)
			]
			ifFalse: [ (nargs ___eq___: 2)
				ifTrue: [
					(CPythonShim @env0:current) @env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'fullmatch' selfPtr: cPtr with: (positional @env0:at: 1) with: (positional @env0:at: 2)
				]
				ifFalse: [
					(CPythonShim @env0:current) @env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'fullmatch' selfPtr: cPtr with: (positional @env0:at: 1) with: (positional @env0:at: 2) with: (positional @env0:at: 3)
				]
			].
		(result ___eq___: 0)
			ifTrue: [nil]
			ifFalse: [SreMatch @env0:newFromCPtr: result]
	]
%

category: 'Python-Methods'
method: SrePattern
findall
	"findall(string[, pos[, endpos]]) -> list"
	^ [:positional :keywords |
		| nargs |
		nargs := (positional @env0:size).
		(nargs ___eq___: 1)
			ifTrue: [
				(CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Pattern' method: 'findall' selfPtr: cPtr with: (positional @env0:at: 1)
			]
			ifFalse: [ (nargs ___eq___: 2)
				ifTrue: [
					(CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Pattern' method: 'findall' selfPtr: cPtr with: (positional @env0:at: 1) with: (positional @env0:at: 2)
				]
				ifFalse: [
					(CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Pattern' method: 'findall' selfPtr: cPtr with: (positional @env0:at: 1) with: (positional @env0:at: 2) with: (positional @env0:at: 3)
				]
			]
	]
%

category: 'Python-Methods'
method: SrePattern
sub
	"sub(repl, string, count=0) -> str"
	^ [:positional :keywords |
		| nargs |
		nargs := (positional @env0:size).
		(nargs ___eq___: 2)
			ifTrue: [
				(CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Pattern' method: 'sub' selfPtr: cPtr with: (positional @env0:at: 1) with: (positional @env0:at: 2)
			]
			ifFalse: [
				(CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Pattern' method: 'sub' selfPtr: cPtr with: (positional @env0:at: 1) with: (positional @env0:at: 2) with: (positional @env0:at: 3)
			]
	]
%

category: 'Python-Methods'
method: SrePattern
subn
	"subn(repl, string, count=0) -> (str, int)"
	^ [:positional :keywords |
		| nargs |
		nargs := (positional @env0:size).
		(nargs ___eq___: 2)
			ifTrue: [
				(CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Pattern' method: 'subn' selfPtr: cPtr with: (positional @env0:at: 1) with: (positional @env0:at: 2)
			]
			ifFalse: [
				(CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Pattern' method: 'subn' selfPtr: cPtr with: (positional @env0:at: 1) with: (positional @env0:at: 2) with: (positional @env0:at: 3)
			]
	]
%

category: 'Python-Methods'
method: SrePattern
split
	"split(string, maxsplit=0) -> list"
	^ [:positional :keywords |
		| nargs |
		nargs := (positional @env0:size).
		(nargs ___eq___: 1)
			ifTrue: [
				(CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Pattern' method: 'split' selfPtr: cPtr with: (positional @env0:at: 1)
			]
			ifFalse: [
				(CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Pattern' method: 'split' selfPtr: cPtr with: (positional @env0:at: 1) with: (positional @env0:at: 2)
			]
	]
%

category: 'Python-Properties'
method: SrePattern
pattern
	"The pattern string from which the RE object was compiled."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Pattern' method: 'pattern' selfPtr: cPtr
%

category: 'Python-Properties'
method: SrePattern
flags
	"The regex matching flags."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Pattern' method: 'flags' selfPtr: cPtr
%

category: 'Python-Properties'
method: SrePattern
groups
	"The number of capturing groups in the pattern."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Pattern' method: 'groups' selfPtr: cPtr
%

category: 'Python-Properties'
method: SrePattern
groupindex
	"A dictionary mapping group names to group numbers."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Pattern' method: 'groupindex' selfPtr: cPtr
%

! ===============================================================================
! SreMatch - env 0 class methods
! ===============================================================================

set compile_env: 0

category: 'Instance Creation'
classmethod: SreMatch
newFromCPtr: aCPtr
	"Create a match wrapper from a C pointer. Returns nil if pointer is 0."

	aCPtr = 0 ifTrue: [^ nil].
	^ self basicNew initCPtr: aCPtr
%

category: 'Private'
method: SreMatch
initCPtr: aCPtr
	cPtr := aCPtr
%

category: 'Accessing'
method: SreMatch
cPtr
	^ cPtr
%

! ===============================================================================
! SreMatch - env 1 methods (Python-compatible)
! ===============================================================================

set compile_env: 1

category: 'Python-Methods'
method: SreMatch
group
	"group([group1, ...]) -> str or tuple"
	^ [:positional :keywords |
		| nargs |
		nargs := (positional @env0:size).
		(nargs ___eq___: 0)
			ifTrue: [
				(CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'group' selfPtr: cPtr
			]
			ifFalse: [ (nargs ___eq___: 1)
				ifTrue: [
					(CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'group' selfPtr: cPtr with: (positional @env0:at: 1)
				]
				ifFalse: [ (nargs ___eq___: 2)
					ifTrue: [
						(CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'group' selfPtr: cPtr with: (positional @env0:at: 1) with: (positional @env0:at: 2)
					]
					ifFalse: [
						(CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'group' selfPtr: cPtr with: (positional @env0:at: 1) with: (positional @env0:at: 2) with: (positional @env0:at: 3)
					]
				]
			]
	]
%

category: 'Python-Methods'
method: SreMatch
groups
	"groups(default=None) -> tuple"
	^ [:positional :keywords |
		| nargs |
		nargs := (positional @env0:size).
		(nargs ___eq___: 0)
			ifTrue: [
				(CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'groups' selfPtr: cPtr
			]
			ifFalse: [
				(CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'groups' selfPtr: cPtr with: (positional @env0:at: 1)
			]
	]
%

category: 'Python-Methods'
method: SreMatch
groupdict
	"groupdict(default=None) -> dict"
	^ [:positional :keywords |
		| nargs |
		nargs := (positional @env0:size).
		(nargs ___eq___: 0)
			ifTrue: [
				(CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'groupdict' selfPtr: cPtr
			]
			ifFalse: [
				(CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'groupdict' selfPtr: cPtr with: (positional @env0:at: 1)
			]
	]
%

category: 'Python-Methods'
method: SreMatch
start
	"start(group=0) -> int"
	^ [:positional :keywords |
		| nargs |
		nargs := (positional @env0:size).
		(nargs ___eq___: 0)
			ifTrue: [
				(CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'start' selfPtr: cPtr
			]
			ifFalse: [
				(CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'start' selfPtr: cPtr with: (positional @env0:at: 1)
			]
	]
%

category: 'Python-Methods'
method: SreMatch
end
	"end(group=0) -> int"
	^ [:positional :keywords |
		| nargs |
		nargs := (positional @env0:size).
		(nargs ___eq___: 0)
			ifTrue: [
				(CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'end' selfPtr: cPtr
			]
			ifFalse: [
				(CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'end' selfPtr: cPtr with: (positional @env0:at: 1)
			]
	]
%

category: 'Python-Methods'
method: SreMatch
span
	"span(group=0) -> (int, int)"
	^ [:positional :keywords |
		| nargs |
		nargs := (positional @env0:size).
		(nargs ___eq___: 0)
			ifTrue: [
				(CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'span' selfPtr: cPtr
			]
			ifFalse: [
				(CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'span' selfPtr: cPtr with: (positional @env0:at: 1)
			]
	]
%

category: 'Python-Methods'
method: SreMatch
expand
	"expand(template) -> str"
	^ [:positional :keywords |
		(CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'expand' selfPtr: cPtr with: (positional @env0:at: 1)
	]
%

category: 'Python-Properties'
method: SreMatch
string
	"The string passed to match() or search()."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'string' selfPtr: cPtr
%

category: 'Python-Properties'
method: SreMatch
re
	"The regular expression object."
	"Returns the C pointer for the pattern object, wrapped as SrePattern."
	| patCPtr |
	patCPtr := (CPythonShim @env0:current) @env0:callTypedReturnCPtr: '_sre' type: 'Match' method: 're' selfPtr: cPtr.
	^ SrePattern @env0:newFromCPtr: patCPtr
%

category: 'Python-Properties'
method: SreMatch
pos
	"The value of pos passed to search() or match()."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'pos' selfPtr: cPtr
%

category: 'Python-Properties'
method: SreMatch
endpos
	"The value of endpos passed to search() or match()."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'endpos' selfPtr: cPtr
%

category: 'Python-Properties'
method: SreMatch
lastindex
	"The integer index of the last matched capturing group."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'lastindex' selfPtr: cPtr
%

category: 'Python-Properties'
method: SreMatch
lastgroup
	"The name of the last matched capturing group."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'lastgroup' selfPtr: cPtr
%

category: 'Python-Properties'
method: SreMatch
regs
	"A tuple of (start, end) for each group."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'regs' selfPtr: cPtr
%

! ===============================================================================
! _sre module - env 0 class methods — bridge to CPythonShim
! ===============================================================================

set compile_env: 0

category: 'Private'
classmethod: _sre
callGetcodesize
	"Call _sre.getcodesize() via CPythonShim."

	^ CPythonShim current
		callModule: '_sre'
		method: 'getcodesize'
%

category: 'Private'
classmethod: _sre
callAsciiIscased: character
	"Call _sre.ascii_iscased(character) via CPythonShim."

	^ CPythonShim current
		callModule: '_sre'
		method: 'ascii_iscased'
		with: character
%

category: 'Private'
classmethod: _sre
callUnicodeIscased: character
	"Call _sre.unicode_iscased(character) via CPythonShim."

	^ CPythonShim current
		callModule: '_sre'
		method: 'unicode_iscased'
		with: character
%

category: 'Private'
classmethod: _sre
callAsciiTolower: character
	"Call _sre.ascii_tolower(character) via CPythonShim."

	^ CPythonShim current
		callModule: '_sre'
		method: 'ascii_tolower'
		with: character
%

category: 'Private'
classmethod: _sre
callUnicodeTolower: character
	"Call _sre.unicode_tolower(character) via CPythonShim."

	^ CPythonShim current
		callModule: '_sre'
		method: 'unicode_tolower'
		with: character
%

category: 'Private'
classmethod: _sre
callCompile: pattern flags: flags code: code groups: groups groupindex: groupindex indexgroup: indexgroup
	"Call _sre.compile(...) → returns C pointer (SmallInteger)."

	^ CPythonShim current
		callModule6ReturnCPtr: '_sre.compile'
		with: pattern with: flags with: code
		with: groups with: groupindex with: indexgroup
%

! ===============================================================================
! _sre module - env 1 instance methods — Python-compatible callables
! ===============================================================================

set compile_env: 1

category: 'Python-Initialization'
method: _sre
initialize
	self
		initialize_getcodesize;
		initialize_ascii_iscased;
		initialize_unicode_iscased;
		initialize_ascii_tolower;
		initialize_unicode_tolower;
		initialize_compile;
		initialize_constants;
		yourself
%

category: 'Python-Initialization'
method: _sre
initialize_getcodesize
	"getcodesize() -> int"
	self ___at___: #getcodesize put: [:positional :keywords |
		self ___class___ @env0:callGetcodesize
	]
%

category: 'Python-Initialization'
method: _sre
initialize_ascii_iscased
	"ascii_iscased(character) -> bool"
	self ___at___: #ascii_iscased put: [:positional :keywords |
		self ___class___ @env0:callAsciiIscased: (positional @env0:at: 1)
	]
%

category: 'Python-Initialization'
method: _sre
initialize_unicode_iscased
	"unicode_iscased(character) -> bool"
	self ___at___: #unicode_iscased put: [:positional :keywords |
		self ___class___ @env0:callUnicodeIscased: (positional @env0:at: 1)
	]
%

category: 'Python-Initialization'
method: _sre
initialize_ascii_tolower
	"ascii_tolower(character) -> int"
	self ___at___: #ascii_tolower put: [:positional :keywords |
		self ___class___ @env0:callAsciiTolower: (positional @env0:at: 1)
	]
%

category: 'Python-Initialization'
method: _sre
initialize_unicode_tolower
	"unicode_tolower(character) -> int"
	self ___at___: #unicode_tolower put: [:positional :keywords |
		self ___class___ @env0:callUnicodeTolower: (positional @env0:at: 1)
	]
%

category: 'Python-Initialization'
method: _sre
initialize_compile
	"compile(pattern, flags, code, groups, groupindex, indexgroup) -> SrePattern"
	self ___at___: #compile put: [:positional :keywords |
		| cPtr |
		cPtr := self ___class___ @env0:callCompile: (positional @env0:at: 1) flags: (positional @env0:at: 2) code: (positional @env0:at: 3) groups: (positional @env0:at: 4) groupindex: (positional @env0:at: 5) indexgroup: (positional @env0:at: 6).
		SrePattern @env0:newFromCPtr: cPtr
	]
%

category: 'Python-Initialization'
method: _sre
initialize_constants
	"Set module-level constants."
	self ___at___: #MAGIC put: 20230612.
	self ___at___: #CODESIZE put: 4.
	self ___at___: #MAXREPEAT put: 4294967295.
	self ___at___: #MAXGROUPS put: 1073741823.
%

category: 'Python-Accessors'
method: _sre
getcodesize
	^ self ___at___: #getcodesize
%

category: 'Python-Accessors'
method: _sre
ascii_iscased
	^ self ___at___: #ascii_iscased
%

category: 'Python-Accessors'
method: _sre
unicode_iscased
	^ self ___at___: #unicode_iscased
%

category: 'Python-Accessors'
method: _sre
ascii_tolower
	^ self ___at___: #ascii_tolower
%

category: 'Python-Accessors'
method: _sre
unicode_tolower
	^ self ___at___: #unicode_tolower
%

category: 'Python-Accessors'
method: _sre
compile
	^ self ___at___: #compile
%

category: 'Python-Accessors'
method: _sre
MAGIC
	^ self ___at___: #MAGIC
%

category: 'Python-Accessors'
method: _sre
CODESIZE
	^ self ___at___: #CODESIZE
%

category: 'Python-Accessors'
method: _sre
MAXREPEAT
	^ self ___at___: #MAXREPEAT
%

category: 'Python-Accessors'
method: _sre
MAXGROUPS
	^ self ___at___: #MAXGROUPS
%

set compile_env: 0
