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
'
%

expectvalue /Class
doit
_sre category: 'Modules'
%

expectvalue /Metaclass3
doit
_sre removeAllMethods.
_sre class removeAllMethods.
%

! ===============================================================================
! env 0 class methods — bridge to CPythonShim
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

! ===============================================================================
! env 2 instance methods — Python-compatible callables
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
			withArguments: { positional ___at___: 1 }
	]
%

category: 'Python-Initialization'
method: _sre
initialize_unicode_iscased
	"unicode_iscased(character) -> bool"
	self ___at___: #unicode_iscased put: [:positional :keywords |
		self ___class___ perform: #'callUnicodeIscased:' env: 0
			withArguments: { positional ___at___: 1 }
	]
%

category: 'Python-Initialization'
method: _sre
initialize_ascii_tolower
	"ascii_tolower(character) -> int"
	self ___at___: #ascii_tolower put: [:positional :keywords |
		self ___class___ perform: #'callAsciiTolower:' env: 0
			withArguments: { positional ___at___: 1 }
	]
%

category: 'Python-Initialization'
method: _sre
initialize_unicode_tolower
	"unicode_tolower(character) -> int"
	self ___at___: #unicode_tolower put: [:positional :keywords |
		self ___class___ perform: #'callUnicodeTolower:' env: 0
			withArguments: { positional ___at___: 1 }
	]
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

set compile_env: 0
