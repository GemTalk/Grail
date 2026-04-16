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

set compile_env: 1

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
!
! Each Python method is implemented as a set of arity-specialized Smalltalk
! selectors (`match:`, `match:_:`, `match:_:_:`) plus a varargs fallback
! (`_match:kw:`). The dispatch model rewrite (see docs/Rewrite_Dispatch_Model.md)
! replaces the old "block returned from accessor" convention with real methods
! that the codegen dispatches to directly. The varargs form handles first-class
! calls (e.g. `f = pattern.match; f(s)`) and any call site with keyword args.
! ===============================================================================

set compile_env: 1

! --------- match -----------------------------------------------------------

category: 'Python-Methods'
method: SrePattern
match: aString
	"match(string) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'match' selfPtr: cPtr
		with: aString.
	^ (result ___eq___: 0) ifTrue: [nil] ifFalse: [SreMatch @env0:newFromCPtr: result]
%

category: 'Python-Methods'
method: SrePattern
match: aString _: pos
	"match(string, pos) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'match' selfPtr: cPtr
		with: aString with: pos.
	^ (result ___eq___: 0) ifTrue: [nil] ifFalse: [SreMatch @env0:newFromCPtr: result]
%

category: 'Python-Methods'
method: SrePattern
match: aString _: pos _: endpos
	"match(string, pos, endpos) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'match' selfPtr: cPtr
		with: aString with: pos with: endpos.
	^ (result ___eq___: 0) ifTrue: [nil] ifFalse: [SreMatch @env0:newFromCPtr: result]
%

category: 'Python-Methods'
method: SrePattern
_match: positional kw: keywords
	"Varargs dispatcher for match() — used for first-class calls and keyword args."
	| nargs |
	nargs := positional @env0:size.
	(nargs ___eq___: 1) ifTrue: [^ self match: (positional @env0:at: 1)].
	(nargs ___eq___: 2) ifTrue: [^ self match: (positional @env0:at: 1) _: (positional @env0:at: 2)].
	(nargs ___eq___: 3) ifTrue: [^ self match: (positional @env0:at: 1) _: (positional @env0:at: 2) _: (positional @env0:at: 3)].
	TypeError ___signal___: 'match() takes 1 to 3 arguments'
%

! --------- search ----------------------------------------------------------

category: 'Python-Methods'
method: SrePattern
search: aString
	"search(string) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'search' selfPtr: cPtr
		with: aString.
	^ (result ___eq___: 0) ifTrue: [nil] ifFalse: [SreMatch @env0:newFromCPtr: result]
%

category: 'Python-Methods'
method: SrePattern
search: aString _: pos
	"search(string, pos) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'search' selfPtr: cPtr
		with: aString with: pos.
	^ (result ___eq___: 0) ifTrue: [nil] ifFalse: [SreMatch @env0:newFromCPtr: result]
%

category: 'Python-Methods'
method: SrePattern
search: aString _: pos _: endpos
	"search(string, pos, endpos) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'search' selfPtr: cPtr
		with: aString with: pos with: endpos.
	^ (result ___eq___: 0) ifTrue: [nil] ifFalse: [SreMatch @env0:newFromCPtr: result]
%

category: 'Python-Methods'
method: SrePattern
_search: positional kw: keywords
	"Varargs dispatcher for search()."
	| nargs |
	nargs := positional @env0:size.
	(nargs ___eq___: 1) ifTrue: [^ self search: (positional @env0:at: 1)].
	(nargs ___eq___: 2) ifTrue: [^ self search: (positional @env0:at: 1) _: (positional @env0:at: 2)].
	(nargs ___eq___: 3) ifTrue: [^ self search: (positional @env0:at: 1) _: (positional @env0:at: 2) _: (positional @env0:at: 3)].
	TypeError ___signal___: 'search() takes 1 to 3 arguments'
%

! --------- fullmatch -------------------------------------------------------

category: 'Python-Methods'
method: SrePattern
fullmatch: aString
	"fullmatch(string) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'fullmatch' selfPtr: cPtr
		with: aString.
	^ (result ___eq___: 0) ifTrue: [nil] ifFalse: [SreMatch @env0:newFromCPtr: result]
%

category: 'Python-Methods'
method: SrePattern
fullmatch: aString _: pos
	"fullmatch(string, pos) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'fullmatch' selfPtr: cPtr
		with: aString with: pos.
	^ (result ___eq___: 0) ifTrue: [nil] ifFalse: [SreMatch @env0:newFromCPtr: result]
%

category: 'Python-Methods'
method: SrePattern
fullmatch: aString _: pos _: endpos
	"fullmatch(string, pos, endpos) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'fullmatch' selfPtr: cPtr
		with: aString with: pos with: endpos.
	^ (result ___eq___: 0) ifTrue: [nil] ifFalse: [SreMatch @env0:newFromCPtr: result]
%

category: 'Python-Methods'
method: SrePattern
_fullmatch: positional kw: keywords
	"Varargs dispatcher for fullmatch()."
	| nargs |
	nargs := positional @env0:size.
	(nargs ___eq___: 1) ifTrue: [^ self fullmatch: (positional @env0:at: 1)].
	(nargs ___eq___: 2) ifTrue: [^ self fullmatch: (positional @env0:at: 1) _: (positional @env0:at: 2)].
	(nargs ___eq___: 3) ifTrue: [^ self fullmatch: (positional @env0:at: 1) _: (positional @env0:at: 2) _: (positional @env0:at: 3)].
	TypeError ___signal___: 'fullmatch() takes 1 to 3 arguments'
%

! --------- findall ---------------------------------------------------------

category: 'Python-Methods'
method: SrePattern
findall: aString
	"findall(string) -> list"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Pattern' method: 'findall' selfPtr: cPtr
		with: aString
%

category: 'Python-Methods'
method: SrePattern
findall: aString _: pos
	"findall(string, pos) -> list"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Pattern' method: 'findall' selfPtr: cPtr
		with: aString with: pos
%

category: 'Python-Methods'
method: SrePattern
findall: aString _: pos _: endpos
	"findall(string, pos, endpos) -> list"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Pattern' method: 'findall' selfPtr: cPtr
		with: aString with: pos with: endpos
%

category: 'Python-Methods'
method: SrePattern
_findall: positional kw: keywords
	"Varargs dispatcher for findall()."
	| nargs |
	nargs := positional @env0:size.
	(nargs ___eq___: 1) ifTrue: [^ self findall: (positional @env0:at: 1)].
	(nargs ___eq___: 2) ifTrue: [^ self findall: (positional @env0:at: 1) _: (positional @env0:at: 2)].
	(nargs ___eq___: 3) ifTrue: [^ self findall: (positional @env0:at: 1) _: (positional @env0:at: 2) _: (positional @env0:at: 3)].
	TypeError ___signal___: 'findall() takes 1 to 3 arguments'
%

! --------- sub -------------------------------------------------------------

category: 'Python-Methods'
method: SrePattern
sub: repl _: aString
	"sub(repl, string) -> str"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Pattern' method: 'sub' selfPtr: cPtr
		with: repl with: aString
%

category: 'Python-Methods'
method: SrePattern
sub: repl _: aString _: count
	"sub(repl, string, count) -> str"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Pattern' method: 'sub' selfPtr: cPtr
		with: repl with: aString with: count
%

category: 'Python-Methods'
method: SrePattern
_sub: positional kw: keywords
	"Varargs dispatcher for sub()."
	| nargs |
	nargs := positional @env0:size.
	(nargs ___eq___: 2) ifTrue: [^ self sub: (positional @env0:at: 1) _: (positional @env0:at: 2)].
	(nargs ___eq___: 3) ifTrue: [^ self sub: (positional @env0:at: 1) _: (positional @env0:at: 2) _: (positional @env0:at: 3)].
	TypeError ___signal___: 'sub() takes 2 or 3 arguments'
%

! --------- subn ------------------------------------------------------------

category: 'Python-Methods'
method: SrePattern
subn: repl _: aString
	"subn(repl, string) -> (str, int)"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Pattern' method: 'subn' selfPtr: cPtr
		with: repl with: aString
%

category: 'Python-Methods'
method: SrePattern
subn: repl _: aString _: count
	"subn(repl, string, count) -> (str, int)"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Pattern' method: 'subn' selfPtr: cPtr
		with: repl with: aString with: count
%

category: 'Python-Methods'
method: SrePattern
_subn: positional kw: keywords
	"Varargs dispatcher for subn()."
	| nargs |
	nargs := positional @env0:size.
	(nargs ___eq___: 2) ifTrue: [^ self subn: (positional @env0:at: 1) _: (positional @env0:at: 2)].
	(nargs ___eq___: 3) ifTrue: [^ self subn: (positional @env0:at: 1) _: (positional @env0:at: 2) _: (positional @env0:at: 3)].
	TypeError ___signal___: 'subn() takes 2 or 3 arguments'
%

! --------- split -----------------------------------------------------------

category: 'Python-Methods'
method: SrePattern
split: aString
	"split(string) -> list"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Pattern' method: 'split' selfPtr: cPtr
		with: aString
%

category: 'Python-Methods'
method: SrePattern
split: aString _: maxsplit
	"split(string, maxsplit) -> list"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Pattern' method: 'split' selfPtr: cPtr
		with: aString with: maxsplit
%

category: 'Python-Methods'
method: SrePattern
_split: positional kw: keywords
	"Varargs dispatcher for split()."
	| nargs |
	nargs := positional @env0:size.
	(nargs ___eq___: 1) ifTrue: [^ self split: (positional @env0:at: 1)].
	(nargs ___eq___: 2) ifTrue: [^ self split: (positional @env0:at: 1) _: (positional @env0:at: 2)].
	TypeError ___signal___: 'split() takes 1 or 2 arguments'
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

! --------- group -----------------------------------------------------------

category: 'Python-Methods'
method: SreMatch
group
	"group() -> str (whole match, equivalent to group(0))"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'group' selfPtr: cPtr
%

category: 'Python-Methods'
method: SreMatch
group: groupArg
	"group(groupN) -> str"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'group' selfPtr: cPtr
		with: groupArg
%

category: 'Python-Methods'
method: SreMatch
group: g1 _: g2
	"group(g1, g2) -> tuple"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'group' selfPtr: cPtr
		with: g1 with: g2
%

category: 'Python-Methods'
method: SreMatch
group: g1 _: g2 _: g3
	"group(g1, g2, g3) -> tuple"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'group' selfPtr: cPtr
		with: g1 with: g2 with: g3
%

category: 'Python-Methods'
method: SreMatch
_group: positional kw: keywords
	"Varargs dispatcher for group()."
	| nargs |
	nargs := positional @env0:size.
	(nargs ___eq___: 0) ifTrue: [^ self group].
	(nargs ___eq___: 1) ifTrue: [^ self group: (positional @env0:at: 1)].
	(nargs ___eq___: 2) ifTrue: [^ self group: (positional @env0:at: 1) _: (positional @env0:at: 2)].
	(nargs ___eq___: 3) ifTrue: [^ self group: (positional @env0:at: 1) _: (positional @env0:at: 2) _: (positional @env0:at: 3)].
	TypeError ___signal___: 'group() takes 0 to 3 arguments'
%

! --------- groups ----------------------------------------------------------

category: 'Python-Methods'
method: SreMatch
groups
	"groups() -> tuple"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'groups' selfPtr: cPtr
%

category: 'Python-Methods'
method: SreMatch
groups: defaultValue
	"groups(default) -> tuple"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'groups' selfPtr: cPtr
		with: defaultValue
%

category: 'Python-Methods'
method: SreMatch
_groups: positional kw: keywords
	"Varargs dispatcher for groups()."
	| nargs |
	nargs := positional @env0:size.
	(nargs ___eq___: 0) ifTrue: [^ self groups].
	(nargs ___eq___: 1) ifTrue: [^ self groups: (positional @env0:at: 1)].
	TypeError ___signal___: 'groups() takes 0 or 1 arguments'
%

! --------- groupdict -------------------------------------------------------

category: 'Python-Methods'
method: SreMatch
groupdict
	"groupdict() -> dict"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'groupdict' selfPtr: cPtr
%

category: 'Python-Methods'
method: SreMatch
groupdict: defaultValue
	"groupdict(default) -> dict"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'groupdict' selfPtr: cPtr
		with: defaultValue
%

category: 'Python-Methods'
method: SreMatch
_groupdict: positional kw: keywords
	"Varargs dispatcher for groupdict()."
	| nargs |
	nargs := positional @env0:size.
	(nargs ___eq___: 0) ifTrue: [^ self groupdict].
	(nargs ___eq___: 1) ifTrue: [^ self groupdict: (positional @env0:at: 1)].
	TypeError ___signal___: 'groupdict() takes 0 or 1 arguments'
%

! --------- start -----------------------------------------------------------

category: 'Python-Methods'
method: SreMatch
start
	"start() -> int"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'start' selfPtr: cPtr
%

category: 'Python-Methods'
method: SreMatch
start: groupArg
	"start(group) -> int"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'start' selfPtr: cPtr
		with: groupArg
%

category: 'Python-Methods'
method: SreMatch
_start: positional kw: keywords
	"Varargs dispatcher for start()."
	| nargs |
	nargs := positional @env0:size.
	(nargs ___eq___: 0) ifTrue: [^ self start].
	(nargs ___eq___: 1) ifTrue: [^ self start: (positional @env0:at: 1)].
	TypeError ___signal___: 'start() takes 0 or 1 arguments'
%

! --------- end -------------------------------------------------------------

category: 'Python-Methods'
method: SreMatch
end
	"end() -> int"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'end' selfPtr: cPtr
%

category: 'Python-Methods'
method: SreMatch
end: groupArg
	"end(group) -> int"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'end' selfPtr: cPtr
		with: groupArg
%

category: 'Python-Methods'
method: SreMatch
_end: positional kw: keywords
	"Varargs dispatcher for end()."
	| nargs |
	nargs := positional @env0:size.
	(nargs ___eq___: 0) ifTrue: [^ self end].
	(nargs ___eq___: 1) ifTrue: [^ self end: (positional @env0:at: 1)].
	TypeError ___signal___: 'end() takes 0 or 1 arguments'
%

! --------- span ------------------------------------------------------------

category: 'Python-Methods'
method: SreMatch
span
	"span() -> (int, int)"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'span' selfPtr: cPtr
%

category: 'Python-Methods'
method: SreMatch
span: groupArg
	"span(group) -> (int, int)"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'span' selfPtr: cPtr
		with: groupArg
%

category: 'Python-Methods'
method: SreMatch
_span: positional kw: keywords
	"Varargs dispatcher for span()."
	| nargs |
	nargs := positional @env0:size.
	(nargs ___eq___: 0) ifTrue: [^ self span].
	(nargs ___eq___: 1) ifTrue: [^ self span: (positional @env0:at: 1)].
	TypeError ___signal___: 'span() takes 0 or 1 arguments'
%

! --------- expand ----------------------------------------------------------

category: 'Python-Methods'
method: SreMatch
expand: template
	"expand(template) -> str"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'expand' selfPtr: cPtr
		with: template
%

category: 'Python-Methods'
method: SreMatch
_expand: positional kw: keywords
	"Varargs dispatcher for expand()."
	^ self expand: (positional @env0:at: 1)
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
	"Initialize module-level constants."
	self ___at___: #MAGIC put: 20230612.
	self ___at___: #CODESIZE put: 4.
	self ___at___: #MAXREPEAT put: 4294967295.
	self ___at___: #MAXGROUPS put: 1073741823.
%

! ===============================================================================
! Module-level fast-path callables
! ===============================================================================

category: 'Python-Built-in Functions'
method: _sre
getcodesize
	"_sre.getcodesize() -> int"
	^ self ___class___ @env0:callGetcodesize
%

category: 'Python-Built-in Functions'
method: _sre
ascii_iscased: character
	"_sre.ascii_iscased(character) -> bool"
	^ self ___class___ @env0:callAsciiIscased: character
%

category: 'Python-Built-in Functions'
method: _sre
unicode_iscased: character
	"_sre.unicode_iscased(character) -> bool"
	^ self ___class___ @env0:callUnicodeIscased: character
%

category: 'Python-Built-in Functions'
method: _sre
ascii_tolower: character
	"_sre.ascii_tolower(character) -> int"
	^ self ___class___ @env0:callAsciiTolower: character
%

category: 'Python-Built-in Functions'
method: _sre
unicode_tolower: character
	"_sre.unicode_tolower(character) -> int"
	^ self ___class___ @env0:callUnicodeTolower: character
%

category: 'Python-Built-in Functions'
method: _sre
compile: pattern _: flags _: code _: groups _: groupindex _: indexgroup
	"_sre.compile(pattern, flags, code, groups, groupindex, indexgroup)
	-> SrePattern"

	| cPtr |
	cPtr := self ___class___ @env0:callCompile: pattern flags: flags code: code groups: groups groupindex: groupindex indexgroup: indexgroup.
	^ SrePattern @env0:newFromCPtr: cPtr
%

! ===============================================================================
! Module-level stored-attribute accessors (constants)
! ===============================================================================

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
