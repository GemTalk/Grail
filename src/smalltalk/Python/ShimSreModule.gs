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
		nargs := (positional perform: #size env: 0).
		result := (nargs ___eq___: 1)
			ifTrue: [
				(CPythonShim perform: #current env: 0) perform: #callTypedReturnCPtr:type:method:selfPtr:with: env: 0
					withArguments: { '_sre'. 'Pattern'. 'match'. cPtr. (positional perform: #at: env: 0 withArguments: {1}) }
			]
			ifFalse: [ (nargs ___eq___: 2)
				ifTrue: [
					(CPythonShim perform: #current env: 0) perform: #callTypedReturnCPtr:type:method:selfPtr:with:with: env: 0
						withArguments: { '_sre'. 'Pattern'. 'match'. cPtr. (positional perform: #at: env: 0 withArguments: {1}). (positional perform: #at: env: 0 withArguments: {2}) }
				]
				ifFalse: [
					(CPythonShim perform: #current env: 0) perform: #callTypedReturnCPtr:type:method:selfPtr:with:with:with: env: 0
						withArguments: { '_sre'. 'Pattern'. 'match'. cPtr. (positional perform: #at: env: 0 withArguments: {1}). (positional perform: #at: env: 0 withArguments: {2}). (positional perform: #at: env: 0 withArguments: {3}) }
				]
			].
		(result ___eq___: 0)
			ifTrue: [nil]
			ifFalse: [SreMatch perform: #newFromCPtr: env: 0 withArguments: {result}]
	]
%

category: 'Python-Methods'
method: SrePattern
search
	"search(string[, pos[, endpos]]) -> SreMatch or None"
	^ [:positional :keywords |
		| nargs result |
		nargs := (positional perform: #size env: 0).
		result := (nargs ___eq___: 1)
			ifTrue: [
				(CPythonShim perform: #current env: 0) perform: #callTypedReturnCPtr:type:method:selfPtr:with: env: 0
					withArguments: { '_sre'. 'Pattern'. 'search'. cPtr. (positional perform: #at: env: 0 withArguments: {1}) }
			]
			ifFalse: [ (nargs ___eq___: 2)
				ifTrue: [
					(CPythonShim perform: #current env: 0) perform: #callTypedReturnCPtr:type:method:selfPtr:with:with: env: 0
						withArguments: { '_sre'. 'Pattern'. 'search'. cPtr. (positional perform: #at: env: 0 withArguments: {1}). (positional perform: #at: env: 0 withArguments: {2}) }
				]
				ifFalse: [
					(CPythonShim perform: #current env: 0) perform: #callTypedReturnCPtr:type:method:selfPtr:with:with:with: env: 0
						withArguments: { '_sre'. 'Pattern'. 'search'. cPtr. (positional perform: #at: env: 0 withArguments: {1}). (positional perform: #at: env: 0 withArguments: {2}). (positional perform: #at: env: 0 withArguments: {3}) }
				]
			].
		(result ___eq___: 0)
			ifTrue: [nil]
			ifFalse: [SreMatch perform: #newFromCPtr: env: 0 withArguments: {result}]
	]
%

category: 'Python-Methods'
method: SrePattern
fullmatch
	"fullmatch(string[, pos[, endpos]]) -> SreMatch or None"
	^ [:positional :keywords |
		| nargs result |
		nargs := (positional perform: #size env: 0).
		result := (nargs ___eq___: 1)
			ifTrue: [
				(CPythonShim perform: #current env: 0) perform: #callTypedReturnCPtr:type:method:selfPtr:with: env: 0
					withArguments: { '_sre'. 'Pattern'. 'fullmatch'. cPtr. (positional perform: #at: env: 0 withArguments: {1}) }
			]
			ifFalse: [ (nargs ___eq___: 2)
				ifTrue: [
					(CPythonShim perform: #current env: 0) perform: #callTypedReturnCPtr:type:method:selfPtr:with:with: env: 0
						withArguments: { '_sre'. 'Pattern'. 'fullmatch'. cPtr. (positional perform: #at: env: 0 withArguments: {1}). (positional perform: #at: env: 0 withArguments: {2}) }
				]
				ifFalse: [
					(CPythonShim perform: #current env: 0) perform: #callTypedReturnCPtr:type:method:selfPtr:with:with:with: env: 0
						withArguments: { '_sre'. 'Pattern'. 'fullmatch'. cPtr. (positional perform: #at: env: 0 withArguments: {1}). (positional perform: #at: env: 0 withArguments: {2}). (positional perform: #at: env: 0 withArguments: {3}) }
				]
			].
		(result ___eq___: 0)
			ifTrue: [nil]
			ifFalse: [SreMatch perform: #newFromCPtr: env: 0 withArguments: {result}]
	]
%

category: 'Python-Methods'
method: SrePattern
findall
	"findall(string[, pos[, endpos]]) -> list"
	^ [:positional :keywords |
		| nargs |
		nargs := (positional perform: #size env: 0).
		(nargs ___eq___: 1)
			ifTrue: [
				(CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr:with: env: 0
					withArguments: { '_sre'. 'Pattern'. 'findall'. cPtr. (positional perform: #at: env: 0 withArguments: {1}) }
			]
			ifFalse: [ (nargs ___eq___: 2)
				ifTrue: [
					(CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr:with:with: env: 0
						withArguments: { '_sre'. 'Pattern'. 'findall'. cPtr. (positional perform: #at: env: 0 withArguments: {1}). (positional perform: #at: env: 0 withArguments: {2}) }
				]
				ifFalse: [
					(CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr:with:with:with: env: 0
						withArguments: { '_sre'. 'Pattern'. 'findall'. cPtr. (positional perform: #at: env: 0 withArguments: {1}). (positional perform: #at: env: 0 withArguments: {2}). (positional perform: #at: env: 0 withArguments: {3}) }
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
		nargs := (positional perform: #size env: 0).
		(nargs ___eq___: 2)
			ifTrue: [
				(CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr:with:with: env: 0
					withArguments: { '_sre'. 'Pattern'. 'sub'. cPtr. (positional perform: #at: env: 0 withArguments: {1}). (positional perform: #at: env: 0 withArguments: {2}) }
			]
			ifFalse: [
				(CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr:with:with:with: env: 0
					withArguments: { '_sre'. 'Pattern'. 'sub'. cPtr. (positional perform: #at: env: 0 withArguments: {1}). (positional perform: #at: env: 0 withArguments: {2}). (positional perform: #at: env: 0 withArguments: {3}) }
			]
	]
%

category: 'Python-Methods'
method: SrePattern
subn
	"subn(repl, string, count=0) -> (str, int)"
	^ [:positional :keywords |
		| nargs |
		nargs := (positional perform: #size env: 0).
		(nargs ___eq___: 2)
			ifTrue: [
				(CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr:with:with: env: 0
					withArguments: { '_sre'. 'Pattern'. 'subn'. cPtr. (positional perform: #at: env: 0 withArguments: {1}). (positional perform: #at: env: 0 withArguments: {2}) }
			]
			ifFalse: [
				(CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr:with:with:with: env: 0
					withArguments: { '_sre'. 'Pattern'. 'subn'. cPtr. (positional perform: #at: env: 0 withArguments: {1}). (positional perform: #at: env: 0 withArguments: {2}). (positional perform: #at: env: 0 withArguments: {3}) }
			]
	]
%

category: 'Python-Methods'
method: SrePattern
split
	"split(string, maxsplit=0) -> list"
	^ [:positional :keywords |
		| nargs |
		nargs := (positional perform: #size env: 0).
		(nargs ___eq___: 1)
			ifTrue: [
				(CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr:with: env: 0
					withArguments: { '_sre'. 'Pattern'. 'split'. cPtr. (positional perform: #at: env: 0 withArguments: {1}) }
			]
			ifFalse: [
				(CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr:with:with: env: 0
					withArguments: { '_sre'. 'Pattern'. 'split'. cPtr. (positional perform: #at: env: 0 withArguments: {1}). (positional perform: #at: env: 0 withArguments: {2}) }
			]
	]
%

category: 'Python-Properties'
method: SrePattern
pattern
	"The pattern string from which the RE object was compiled."
	^ (CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr: env: 0
		withArguments: { '_sre'. 'Pattern'. 'pattern'. cPtr }
%

category: 'Python-Properties'
method: SrePattern
flags
	"The regex matching flags."
	^ (CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr: env: 0
		withArguments: { '_sre'. 'Pattern'. 'flags'. cPtr }
%

category: 'Python-Properties'
method: SrePattern
groups
	"The number of capturing groups in the pattern."
	^ (CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr: env: 0
		withArguments: { '_sre'. 'Pattern'. 'groups'. cPtr }
%

category: 'Python-Properties'
method: SrePattern
groupindex
	"A dictionary mapping group names to group numbers."
	^ (CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr: env: 0
		withArguments: { '_sre'. 'Pattern'. 'groupindex'. cPtr }
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
		nargs := (positional perform: #size env: 0).
		(nargs ___eq___: 0)
			ifTrue: [
				(CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr: env: 0
					withArguments: { '_sre'. 'Match'. 'group'. cPtr }
			]
			ifFalse: [ (nargs ___eq___: 1)
				ifTrue: [
					(CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr:with: env: 0
						withArguments: { '_sre'. 'Match'. 'group'. cPtr. (positional perform: #at: env: 0 withArguments: {1}) }
				]
				ifFalse: [ (nargs ___eq___: 2)
					ifTrue: [
						(CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr:with:with: env: 0
							withArguments: { '_sre'. 'Match'. 'group'. cPtr. (positional perform: #at: env: 0 withArguments: {1}). (positional perform: #at: env: 0 withArguments: {2}) }
					]
					ifFalse: [
						(CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr:with:with:with: env: 0
							withArguments: { '_sre'. 'Match'. 'group'. cPtr. (positional perform: #at: env: 0 withArguments: {1}). (positional perform: #at: env: 0 withArguments: {2}). (positional perform: #at: env: 0 withArguments: {3}) }
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
		nargs := (positional perform: #size env: 0).
		(nargs ___eq___: 0)
			ifTrue: [
				(CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr: env: 0
					withArguments: { '_sre'. 'Match'. 'groups'. cPtr }
			]
			ifFalse: [
				(CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr:with: env: 0
					withArguments: { '_sre'. 'Match'. 'groups'. cPtr. (positional perform: #at: env: 0 withArguments: {1}) }
			]
	]
%

category: 'Python-Methods'
method: SreMatch
groupdict
	"groupdict(default=None) -> dict"
	^ [:positional :keywords |
		| nargs |
		nargs := (positional perform: #size env: 0).
		(nargs ___eq___: 0)
			ifTrue: [
				(CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr: env: 0
					withArguments: { '_sre'. 'Match'. 'groupdict'. cPtr }
			]
			ifFalse: [
				(CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr:with: env: 0
					withArguments: { '_sre'. 'Match'. 'groupdict'. cPtr. (positional perform: #at: env: 0 withArguments: {1}) }
			]
	]
%

category: 'Python-Methods'
method: SreMatch
start
	"start(group=0) -> int"
	^ [:positional :keywords |
		| nargs |
		nargs := (positional perform: #size env: 0).
		(nargs ___eq___: 0)
			ifTrue: [
				(CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr: env: 0
					withArguments: { '_sre'. 'Match'. 'start'. cPtr }
			]
			ifFalse: [
				(CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr:with: env: 0
					withArguments: { '_sre'. 'Match'. 'start'. cPtr. (positional perform: #at: env: 0 withArguments: {1}) }
			]
	]
%

category: 'Python-Methods'
method: SreMatch
end
	"end(group=0) -> int"
	^ [:positional :keywords |
		| nargs |
		nargs := (positional perform: #size env: 0).
		(nargs ___eq___: 0)
			ifTrue: [
				(CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr: env: 0
					withArguments: { '_sre'. 'Match'. 'end'. cPtr }
			]
			ifFalse: [
				(CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr:with: env: 0
					withArguments: { '_sre'. 'Match'. 'end'. cPtr. (positional perform: #at: env: 0 withArguments: {1}) }
			]
	]
%

category: 'Python-Methods'
method: SreMatch
span
	"span(group=0) -> (int, int)"
	^ [:positional :keywords |
		| nargs |
		nargs := (positional perform: #size env: 0).
		(nargs ___eq___: 0)
			ifTrue: [
				(CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr: env: 0
					withArguments: { '_sre'. 'Match'. 'span'. cPtr }
			]
			ifFalse: [
				(CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr:with: env: 0
					withArguments: { '_sre'. 'Match'. 'span'. cPtr. (positional perform: #at: env: 0 withArguments: {1}) }
			]
	]
%

category: 'Python-Methods'
method: SreMatch
expand
	"expand(template) -> str"
	^ [:positional :keywords |
		(CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr:with: env: 0
			withArguments: { '_sre'. 'Match'. 'expand'. cPtr. (positional perform: #at: env: 0 withArguments: {1}) }
	]
%

category: 'Python-Properties'
method: SreMatch
string
	"The string passed to match() or search()."
	^ (CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr: env: 0
		withArguments: { '_sre'. 'Match'. 'string'. cPtr }
%

category: 'Python-Properties'
method: SreMatch
re
	"The regular expression object."
	"Returns the C pointer for the pattern object, wrapped as SrePattern."
	| patCPtr |
	patCPtr := (CPythonShim perform: #current env: 0) perform: #callTypedReturnCPtr:type:method:selfPtr: env: 0
		withArguments: { '_sre'. 'Match'. 're'. cPtr }.
	^ SrePattern perform: #newFromCPtr: env: 0 withArguments: {patCPtr}
%

category: 'Python-Properties'
method: SreMatch
pos
	"The value of pos passed to search() or match()."
	^ (CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr: env: 0
		withArguments: { '_sre'. 'Match'. 'pos'. cPtr }
%

category: 'Python-Properties'
method: SreMatch
endpos
	"The value of endpos passed to search() or match()."
	^ (CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr: env: 0
		withArguments: { '_sre'. 'Match'. 'endpos'. cPtr }
%

category: 'Python-Properties'
method: SreMatch
lastindex
	"The integer index of the last matched capturing group."
	^ (CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr: env: 0
		withArguments: { '_sre'. 'Match'. 'lastindex'. cPtr }
%

category: 'Python-Properties'
method: SreMatch
lastgroup
	"The name of the last matched capturing group."
	^ (CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr: env: 0
		withArguments: { '_sre'. 'Match'. 'lastgroup'. cPtr }
%

category: 'Python-Properties'
method: SreMatch
regs
	"A tuple of (start, end) for each group."
	^ (CPythonShim perform: #current env: 0) perform: #callTyped:type:method:selfPtr: env: 0
		withArguments: { '_sre'. 'Match'. 'regs'. cPtr }
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
		self ___class___ perform: #callGetcodesize env: 0
	]
%

category: 'Python-Initialization'
method: _sre
initialize_ascii_iscased
	"ascii_iscased(character) -> bool"
	self ___at___: #ascii_iscased put: [:positional :keywords |
		self ___class___ perform: #'callAsciiIscased:' env: 0
			withArguments: { (positional perform: #at: env: 0 withArguments: {1}) }
	]
%

category: 'Python-Initialization'
method: _sre
initialize_unicode_iscased
	"unicode_iscased(character) -> bool"
	self ___at___: #unicode_iscased put: [:positional :keywords |
		self ___class___ perform: #'callUnicodeIscased:' env: 0
			withArguments: { (positional perform: #at: env: 0 withArguments: {1}) }
	]
%

category: 'Python-Initialization'
method: _sre
initialize_ascii_tolower
	"ascii_tolower(character) -> int"
	self ___at___: #ascii_tolower put: [:positional :keywords |
		self ___class___ perform: #'callAsciiTolower:' env: 0
			withArguments: { (positional perform: #at: env: 0 withArguments: {1}) }
	]
%

category: 'Python-Initialization'
method: _sre
initialize_unicode_tolower
	"unicode_tolower(character) -> int"
	self ___at___: #unicode_tolower put: [:positional :keywords |
		self ___class___ perform: #'callUnicodeTolower:' env: 0
			withArguments: { (positional perform: #at: env: 0 withArguments: {1}) }
	]
%

category: 'Python-Initialization'
method: _sre
initialize_compile
	"compile(pattern, flags, code, groups, groupindex, indexgroup) -> SrePattern"
	self ___at___: #compile put: [:positional :keywords |
		| cPtr |
		cPtr := self ___class___ perform: #'callCompile:flags:code:groups:groupindex:indexgroup:'
			env: 0 withArguments: {
				(positional perform: #at: env: 0 withArguments: {1}) .
				(positional perform: #at: env: 0 withArguments: {2}) .
				(positional perform: #at: env: 0 withArguments: {3}) .
				(positional perform: #at: env: 0 withArguments: {4}) .
				(positional perform: #at: env: 0 withArguments: {5}) .
				(positional perform: #at: env: 0 withArguments: {6})
			}.
		SrePattern perform: #newFromCPtr: env: 0 withArguments: {cPtr}
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
